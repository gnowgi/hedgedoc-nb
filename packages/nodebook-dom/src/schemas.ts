/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { mergeSchemaResults, parseSchemaBlock, setUserSchemas } from '@nodebook/core'
import type { SchemaParseResult } from '@nodebook/core'
import { ensureNodeBookUiStyles } from './ui'
import type { NodeBookTheme } from './styles'

/**
 * Registry of live schema sources feeding the shared schema store. Block-based
 * hosts (Logseq, Obsidian) render fences independently, so each rendered
 * ```nodeBook-schema block — and the host's user-editable schemas page —
 * registers here; the store is rebuilt as the merge of all live sources in
 * registration order (later sources override earlier ones by name). Graph
 * handles watch the store version and refresh automatically.
 */
const sources = new Map<string, string>()

function applySources(): void {
  if (sources.size === 0) {
    setUserSchemas(null)
    return
  }
  const results = [...sources.values()].map((text) => parseSchemaBlock(text))
  setUserSchemas(mergeSchemaResults(results).schemas)
}

export function registerSchemaSource(id: string, text: string): void {
  sources.set(id, text)
  applySources()
}

export function unregisterSchemaSource(id: string): void {
  if (sources.delete(id)) {
    applySources()
  }
}

/** Parse schema-block texts into user schemas for per-block overrides. */
export function parseSchemaTexts(texts: string[]): SchemaParseResult {
  return mergeSchemaResults(texts.map((text) => parseSchemaBlock(text)))
}

export interface RenderSchemaOptions {
  theme?: NodeBookTheme
  /**
   * Contribute this block's definitions to the shared store (default true).
   * Pass false for display-only rendering.
   */
  contribute?: boolean
  /** Registry id; defaults to a generated one. */
  sourceId?: string
}

export interface NodeBookSchemaHandle {
  /** Parse result for this block. */
  result: SchemaParseResult
  destroy(): void
}

let schemaBlockCounter = 0

/**
 * Render a ```nodeBook-schema block: a summary panel of the definitions it
 * contributes (with parse errors surfaced), registered into the shared store
 * so all graphs pick the definitions up.
 */
export function renderNodeBookSchema(
  container: HTMLElement,
  code: string,
  options: RenderSchemaOptions = {}
): NodeBookSchemaHandle {
  const doc = container.ownerDocument
  ensureNodeBookUiStyles(doc)
  container.classList.add('nb-schema-panel')
  container.dataset.nbTheme = options.theme ?? 'light'

  const result = parseSchemaBlock(code)
  const sourceId = options.sourceId ?? `schema-block-${++schemaBlockCounter}`
  const contribute = options.contribute ?? true
  if (contribute) {
    registerSchemaSource(sourceId, code)
  }

  container.textContent = ''
  const title = doc.createElement('div')
  title.className = 'nb-schema-title'
  title.textContent = 'nodeBook schema'
  container.appendChild(title)

  const categories: Array<[string, Array<{ name: string }>]> = [
    ['Node types', result.schemas.nodeTypes],
    ['Relation types', result.schemas.relationTypes],
    ['Attribute types', result.schemas.attributeTypes],
    ['Transition types', result.schemas.transitionTypes],
    ['Function types', result.schemas.functionTypes]
  ]
  for (const [label, entries] of categories) {
    if (entries.length === 0) continue
    const row = doc.createElement('div')
    row.className = 'nb-schema-row'
    const heading = doc.createElement('span')
    heading.className = 'nb-schema-category'
    heading.textContent = `${label} (${entries.length})`
    row.appendChild(heading)
    for (const entry of entries) {
      const chip = doc.createElement('span')
      chip.className = 'nb-schema-chip'
      chip.textContent = entry.name
      row.appendChild(chip)
    }
    container.appendChild(row)
  }

  if (result.errors.length > 0) {
    const errors = doc.createElement('ul')
    errors.className = 'nb-schema-errors'
    for (const error of result.errors) {
      const item = doc.createElement('li')
      item.textContent = `line ${error.line}: ${error.message}`
      errors.appendChild(item)
    }
    container.appendChild(errors)
  }

  return {
    result,
    destroy(): void {
      if (contribute) {
        unregisterSchemaSource(sourceId)
      }
      container.textContent = ''
    }
  }
}
