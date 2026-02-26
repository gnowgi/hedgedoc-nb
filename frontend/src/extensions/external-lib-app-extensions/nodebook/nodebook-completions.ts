/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getMergedSchemas } from './nodebook-parser/schema-store'
import type { CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete'

/**
 * Checks whether the given position in the document is inside a nodeBook code fence.
 * Scans for ``` nodeBook fence boundaries (but not nodeBook-schema fences).
 */
function isInsideNodeBookFence(docText: string, pos: number): boolean {
  const textBefore = docText.slice(0, pos)
  const fencePattern = /^[ \t]*```(\w*)/gm
  let insideNodeBook = false
  let match: RegExpExecArray | null

  while ((match = fencePattern.exec(textBefore)) !== null) {
    const lang = match[1]
    if (!insideNodeBook && lang === 'nodeBook') {
      insideNodeBook = true
    } else if (insideNodeBook && lang === '') {
      // Closing fence (bare ```)
      insideNodeBook = false
    } else if (insideNodeBook) {
      // Opening fence for a different language — previous nodeBook was closed implicitly
      insideNodeBook = false
    }
  }

  return insideNodeBook
}

/**
 * Returns the text of the current line up to the cursor position.
 */
function getLineTextBefore(context: CompletionContext): string {
  const line = context.state.doc.lineAt(context.pos)
  return line.text.slice(0, context.pos - line.from)
}

/**
 * Builds 3 CompletionSource functions for in-block nodeBook autocompletion:
 * 1. Node type completion (triggered by `[` on heading lines)
 * 2. Relation completion (triggered by `<` at line start)
 * 3. Attribute key completion (triggered at line start before `:`)
 */
export function buildNodeBookInBlockCompletions(): CompletionSource[] {
  const nodeTypeCompletion = (context: CompletionContext): CompletionResult | null => {
    const docText = context.state.doc.toString()
    if (!isInsideNodeBookFence(docText, context.pos)) return null

    const lineBefore = getLineTextBefore(context)

    // Must be a heading line with an open bracket
    if (!/^\s*#/.test(lineBefore)) return null
    const bracketMatch = lineBefore.match(/\[([^\]]*)$/)
    if (!bracketMatch) return null

    const typed = bracketMatch[1]
    const from = context.pos - typed.length

    const schemas = getMergedSchemas()
    const options = schemas.nodeTypes.map((nt) => ({
      label: nt.name,
      detail: nt.description,
      apply: nt.name + ']'
    }))

    return { from, options, filter: true }
  }

  const relationCompletion = (context: CompletionContext): CompletionResult | null => {
    const docText = context.state.doc.toString()
    if (!isInsideNodeBookFence(docText, context.pos)) return null

    const lineBefore = getLineTextBefore(context)

    // Must start with < and no closing >
    const angleMatch = lineBefore.match(/^\s*<([^>]*)$/)
    if (!angleMatch) return null

    const typed = angleMatch[1]
    const from = context.pos - typed.length

    const schemas = getMergedSchemas()
    const seen = new Set<string>()
    const options: { label: string; detail: string; apply: string }[] = []

    for (const rt of schemas.relationTypes) {
      if (!seen.has(rt.name)) {
        seen.add(rt.name)
        options.push({
          label: rt.name,
          detail: rt.description,
          apply: rt.name + '> '
        })
      }
      if (rt.inverse_name && !seen.has(rt.inverse_name)) {
        seen.add(rt.inverse_name)
        options.push({
          label: rt.inverse_name,
          detail: `Inverse of "${rt.name}"`,
          apply: rt.inverse_name + '> '
        })
      }
      if (rt.aliases) {
        for (const alias of rt.aliases) {
          if (!seen.has(alias)) {
            seen.add(alias)
            options.push({
              label: alias,
              detail: `Alias for "${rt.name}"`,
              apply: alias + '> '
            })
          }
        }
      }
    }

    // Add parser-level relation aliases
    if (!seen.has('input')) {
      seen.add('input')
      options.push({ label: 'input', detail: 'Alias for "has prior_state" (Function/Transition input)', apply: 'input> ' })
    }
    if (!seen.has('output')) {
      seen.add('output')
      options.push({ label: 'output', detail: 'Alias for "has post_state" (Function/Transition output)', apply: 'output> ' })
    }

    return { from, options, filter: true }
  }

  const attributeKeyCompletion = (context: CompletionContext): CompletionResult | null => {
    const docText = context.state.doc.toString()
    if (!isInsideNodeBookFence(docText, context.pos)) return null

    const lineBefore = getLineTextBefore(context)

    // Skip heading lines, relation lines, fence lines, function lines
    if (/^\s*#/.test(lineBefore)) return null
    if (/^\s*</.test(lineBefore)) return null
    if (/^\s*```/.test(lineBefore)) return null
    if (/^\s*@/.test(lineBefore)) return null

    // Line must not already have a colon (already typing a value)
    if (lineBefore.includes(':')) return null

    // Match text being typed (with optional "has " prefix)
    const attrMatch = lineBefore.match(/^\s*(?:has\s+)?([\w\s]*)$/)
    if (!attrMatch) return null

    const typed = attrMatch[1]
    if (!typed && !context.explicit) return null

    const from = context.pos - typed.length

    const schemas = getMergedSchemas()
    const options = schemas.attributeTypes.map((at) => ({
      label: at.name,
      detail: `${at.data_type}${at.unit ? ' (' + at.unit + ')' : ''}`,
      apply: at.name + ': '
    }))

    // Add definition: and expression: as special completions
    options.push(
      { label: 'definition', detail: 'Math definition for a [Function] transition', apply: 'definition: ' },
      { label: 'expression', detail: 'Auto-generate Petri net from a math expression', apply: 'expression: ' },
      { label: 'value', detail: 'Numeric value for a place node', apply: 'value: ' }
    )

    return { from, options, filter: true }
  }

  const queryPredicateCompletion = (context: CompletionContext): CompletionResult | null => {
    const docText = context.state.doc.toString()
    if (!isInsideNodeBookFence(docText, context.pos)) return null

    const lineBefore = getLineTextBefore(context)

    // Must start with ?- and be typing a predicate
    const queryMatch = lineBefore.match(/^\s*\?-\s*(\w*)$/)
    if (!queryMatch) return null

    const typed = queryMatch[1]
    const from = context.pos - typed.length

    const options = [
      { label: 'node(', detail: 'node(Id, Name, Role)', apply: 'node(' },
      { label: 'relation(', detail: 'relation(Source, Target, RelName)', apply: 'relation(' },
      { label: 'explicit_relation(', detail: 'explicit_relation(Source, Target, RelName)', apply: 'explicit_relation(' },
      { label: 'attribute(', detail: 'attribute(NodeId, AttrName, Value)', apply: 'attribute(' },
      { label: 'attribute_unit(', detail: 'attribute_unit(NodeId, AttrName, Unit)', apply: 'attribute_unit(' },
      { label: 'has_type(', detail: 'has_type(NodeId, TypeName)', apply: 'has_type(' },
      { label: 'transitive(', detail: 'transitive(RelName)', apply: 'transitive(' },
      { label: 'symmetric(', detail: 'symmetric(RelName)', apply: 'symmetric(' },
      { label: 'inverse(', detail: 'inverse(RelName, InvName)', apply: 'inverse(' }
    ]

    return { from, options, filter: true }
  }

  const cnlQueryCompletion = (context: CompletionContext): CompletionResult | null => {
    const docText = context.state.doc.toString()
    if (!isInsideNodeBookFence(docText, context.pos)) return null

    const lineBefore = getLineTextBefore(context)

    // Trigger on Wh-words at line start (or after <)
    const whMatch = lineBefore.match(/^\s*(wh|whe|wha|what|who|wher|where|when|how)$/i)
    if (!whMatch && !context.explicit) return null

    // Don't trigger on heading lines or lines with colons already
    if (/^\s*#/.test(lineBefore)) return null
    if (/^\s*```/.test(lineBefore)) return null

    const typed = whMatch ? whMatch[1] : ''
    const from = context.pos - typed.length

    const options = [
      { label: '<rel> what;', detail: 'Object unknown — what is this node <rel> to?', apply: '<rel> what;' },
      { label: '<how> Target;', detail: 'Relation unknown — how does this node relate to Target?', apply: '<how> Target;' },
      { label: 'what: value;', detail: 'Attribute name unknown — what attribute has this value?', apply: 'what: value;' },
      { label: 'attr: what;', detail: 'Value unknown — what is the value of this attribute?', apply: 'attr: what;' },
      { label: 'who <rel> Target;', detail: 'Subject unknown (graph-level) — who <rel> Target?', apply: 'who <rel> Target;' }
    ]

    return { from, options, filter: true }
  }

  return [nodeTypeCompletion, relationCompletion, attributeKeyCompletion, queryPredicateCompletion, cnlQueryCompletion]
}
