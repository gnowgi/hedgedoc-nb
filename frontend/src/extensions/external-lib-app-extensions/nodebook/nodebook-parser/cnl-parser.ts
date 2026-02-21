/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlOperation } from './types'

const HEADING_REGEX = /^\s*(#+)\s*(?:\*([^*]+)\*\s+)?(?:\*\*(.+?)\*\*\s*)?(.+?)(?:\s*\[(.+?)\])?$/
const SIMPLE_HEADING_REGEX = /^\s*(#+)\s*(.+?)$/
const RELATION_REGEX = /^\s*<(.+?)>\s*([^;\n]*?)(?:;|$)/gm
const FUNCTION_REGEX = /^\s*has\s+function\s+"([^"]+)"\s*;/gm
const DESCRIPTION_REGEX = /```description\n([\s\S]*?)\n```/
const GRAPH_DESCRIPTION_REGEX = /```graph-description\n([\s\S]*?)\n```/
const MINDMAP_HEADING_REGEX = /^\s*#\s+(.+?)\s+<([^>]+)>\s*$/
const MINDMAP_ITEM_REGEX = /^(\s*)-\s+(.+)$/
const CURRENCY_REGEX = /^\s*currency\s*:\s*([^;\n]+?)\s*;?\s*$/im

/** Maps accounting relation names to their Petri net equivalents. */
const ACCOUNTING_RELATION_MAP: Record<string, string> = {
  debit: 'has post_state',
  credit: 'has prior_state'
}

interface NodeBlock {
  heading: string
  content: string[]
  morphs: Array<{ name: string; content: string[] }>
}

/**
 * Browser-compatible FNV-1a hash (replaces Node.js crypto.createHash('sha1'))
 */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 6)
}

/**
 * Deterministic morph ID generation (replaces Date.now())
 */
let morphCounter = 0
function generateMorphId(nodeId: string, morphName: string): string {
  morphCounter++
  return `${nodeId}_morph_${morphName.toLowerCase().replace(/\s+/g, '_')}_${morphCounter}`
}

/**
 * Reset morph counter (call before each parse)
 */
function resetMorphCounter(): void {
  morphCounter = 0
}

/**
 * Generate a clean node ID from a display name.
 */
function cleanName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_')
}

interface ParsedBlock {
  type: 'mindmap' | 'cnl'
  lines: string[]
}

/**
 * Pre-scan CNL text to separate mindmap blocks from regular CNL blocks.
 * A mindmap block starts with a line matching MINDMAP_HEADING_REGEX and
 * continues while subsequent non-empty lines match MINDMAP_ITEM_REGEX.
 */
function parseAllBlocks(cnlText: string): ParsedBlock[] {
  const lines = cnlText.split('\n')
  const blocks: ParsedBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (MINDMAP_HEADING_REGEX.test(line)) {
      const mindmapLines: string[] = [line]
      i++
      while (i < lines.length) {
        const nextLine = lines[i]
        if (nextLine.trim() === '') {
          // skip blank lines within mindmap block
          i++
          continue
        }
        if (MINDMAP_ITEM_REGEX.test(nextLine)) {
          mindmapLines.push(nextLine)
          i++
        } else {
          break
        }
      }
      blocks.push({ type: 'mindmap', lines: mindmapLines })
    } else {
      // Collect regular CNL lines until we hit a mindmap heading
      const cnlLines: string[] = [line]
      i++
      while (i < lines.length && !MINDMAP_HEADING_REGEX.test(lines[i])) {
        cnlLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'cnl', lines: cnlLines })
    }
  }

  return blocks
}

/**
 * Parse a mindmap block (# Root <relation> + indented list items) into operations.
 */
function parseMindmapBlock(lines: string[]): CnlOperation[] {
  const ops: CnlOperation[] = []

  // First line is the heading: # Topic <relation>
  const headingMatch = lines[0].match(MINDMAP_HEADING_REGEX)
  if (!headingMatch) return ops

  const rootName = headingMatch[1].trim()
  const relationLabel = headingMatch[2].trim()
  const rootId = cleanName(rootName)

  ops.push({
    type: 'addNode',
    payload: {
      base_name: rootName,
      displayName: rootName,
      options: {
        id: rootId,
        role: 'individual',
        parent_types: [],
        adjective: null
      }
    },
    id: rootId,
    source: 'mindmap'
  })

  // Stack tracks parent context: [{id, indent}]
  const stack: Array<{ id: string; indent: number }> = [{ id: rootId, indent: -1 }]

  for (let i = 1; i < lines.length; i++) {
    const itemMatch = lines[i].match(MINDMAP_ITEM_REGEX)
    if (!itemMatch) continue

    const indentStr = itemMatch[1]
    const indent = indentStr.length
    const itemName = itemMatch[2].trim()
    const itemId = cleanName(itemName)

    // Pop stack until top has indent strictly less than current
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    const parentId = stack[stack.length - 1].id
    const relId = `rel_${parentId}_${cleanName(relationLabel)}_${itemId}`

    ops.push({
      type: 'addNode',
      payload: {
        base_name: itemName,
        displayName: itemName,
        role: 'class',
        options: { adjective: null }
      },
      id: itemId,
      source: 'mindmap'
    })

    ops.push({
      type: 'addRelation',
      payload: { source: parentId, target: itemId, name: relationLabel },
      id: relId,
      source: 'mindmap'
    })

    stack.push({ id: itemId, indent })
  }

  return ops
}

/**
 * Build a structural tree from CNL text.
 * Main nodes are # headings, morphs are ## headings under a node.
 */
function buildStructuralTree(cnlText: string): NodeBlock[] {
  const tree: NodeBlock[] = []
  let currentNodeBlock: NodeBlock | null = null
  const lines = cnlText.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    const morphHeadingMatch = line.match(/^\s*(##)\s+(.+)$/)
    const mainHeadingMatch = line.match(/^\s*(#)\s+(.+)$/)

    if (morphHeadingMatch && !line.match(/^\s*###/) && currentNodeBlock) {
      const morphName = morphHeadingMatch[2].trim()
      currentNodeBlock.morphs.push({ name: morphName, content: [] })
    } else if (mainHeadingMatch && !line.match(/^\s*##/)) {
      currentNodeBlock = { heading: line.trim(), content: [], morphs: [] }
      tree.push(currentNodeBlock)
    } else if (currentNodeBlock) {
      if (currentNodeBlock.morphs.length > 0) {
        currentNodeBlock.morphs[currentNodeBlock.morphs.length - 1].content.push(line)
      } else {
        currentNodeBlock.content.push(line)
      }
    }
  }
  return tree
}

/**
 * Process a node heading to extract id, type, adjective, base name.
 */
function processNodeHeading(heading: string): { id: string; type: string; payload: Record<string, unknown> } {
  let adjective: string | null = null
  let baseName: string | null = null
  let displayName: string | null = null
  let nodeType: string | null = null
  let quantifier: string | null = null

  let match = heading.match(HEADING_REGEX)
  if (match) {
    quantifier = match[2] ?? null
    adjective = match[3] ?? null
    baseName = match[4]
    nodeType = match[5] ?? null
    displayName = adjective && baseName ? `**${adjective}** ${baseName}` : baseName
  } else {
    match = heading.match(SIMPLE_HEADING_REGEX)
    if (match) {
      baseName = match[2].trim()
      displayName = baseName
      adjective = null
    }
  }

  if (!baseName) {
    baseName = heading.replace(/^#+\s*/, '').trim()
    displayName = baseName
  }

  if (nodeType) {
    nodeType = nodeType.trim()
  } else {
    const typeMatch = baseName.match(/\[(.+?)\]/)
    if (typeMatch) {
      nodeType = typeMatch[1].trim()
      baseName = baseName.replace(/\[.+?\]/, '').trim()
      displayName = displayName!.replace(/\[.+?\]/, '').trim()
    } else {
      nodeType = 'individual'
    }
  }

  const cleanBaseName = baseName.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_')
  const cleanAdjective = adjective
    ? adjective.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_')
    : null
  const id = cleanAdjective ? `${cleanAdjective}_${cleanBaseName}` : cleanBaseName

  return {
    id,
    type: nodeType,
    payload: {
      base_name: baseName.trim(),
      displayName: displayName!.trim(),
      options: {
        id,
        role: nodeType,
        parent_types: [],
        adjective: adjective ? adjective.trim() : null,
        quantifier: quantifier ? quantifier.trim() : null
      }
    }
  }
}

/**
 * Process the neighborhood (attributes, relations, functions, descriptions) of a node.
 */
function processNeighborhood(nodeId: string, lines: string[]): CnlOperation[] {
  const ops: CnlOperation[] = []
  let content = lines.join('\n')

  const descriptionMatch = content.match(DESCRIPTION_REGEX)
  if (descriptionMatch) {
    const description = descriptionMatch[1].trim()
    ops.push({
      type: 'updateNode',
      payload: { id: nodeId, fields: { description } },
      id: `${nodeId}_description`
    })
    content = content.replace(DESCRIPTION_REGEX, '').trim()
  }

  // Process attributes — any line with ":" is an attribute (has prefix is optional)
  const attributeLines = content.split('\n').filter((line) => {
    const trimmed = line.trim()
    if (!trimmed.includes(':')) return false
    if (trimmed.startsWith('<')) return false
    if (trimmed.match(/^\s*has\s+function\s+"/)) return false
    return true
  })
  for (const line of attributeLines) {
    const basicMatch = line.match(/^\s*(?:has\s+)?([^:<]+):\s*([^;]+);?/)
    if (!basicMatch) continue

    const [, name, fullValue] = basicMatch
    let value = fullValue.trim()
    let unit: string | null = null
    let adverb: string | null = null
    let modality: string | null = null
    let quantifier: string | null = null

    const unitMatch = value.match(/\*([^*]+)\*/)
    if (unitMatch) {
      unit = unitMatch[1].trim()
      value = value.replace(/\*[^*]+\*/, '').trim()
    }

    const quantifierMatch = value.match(/\*([^*]+)\*/)
    if (quantifierMatch) {
      quantifier = quantifierMatch[1].trim()
      value = value.replace(/\*[^*]+\*/, '').trim()
    }

    const adverbMatch = value.match(/\+\+([^+]+)\+\+/)
    if (adverbMatch) {
      adverb = adverbMatch[1].trim()
      value = value.replace(/\+\+[^+]+\+\+/, '').trim()
    }

    const modalityMatch = value.match(/\[([^\]]+)\]/)
    if (modalityMatch) {
      modality = modalityMatch[1].trim()
      value = value.replace(/\[[^\]]+\]/, '').trim()
    }

    value = value.trim()

    const valueHash = fnv1aHash(String(value))
    const attrId = `attr_${nodeId}_${name.trim().toLowerCase().replace(/\s+/g, '_')}_${valueHash}`

    const attributePayload: Record<string, unknown> = {
      source: nodeId,
      name: name.trim(),
      value
    }
    if (unit) attributePayload.unit = unit
    if (quantifier) attributePayload.quantifier = quantifier
    if (adverb) attributePayload.adverb = adverb
    if (modality) attributePayload.modality = modality

    ops.push({ type: 'addAttribute', payload: attributePayload, id: attrId })
  }

  // Process functions
  const functionMatches = [...content.matchAll(FUNCTION_REGEX)]
  for (const match of functionMatches) {
    const [, name] = match
    const funcId = `func_${nodeId}_${name.trim().toLowerCase().replace(/\s+/g, '_')}`
    ops.push({ type: 'applyFunction', payload: { source: nodeId, name: name.trim() }, id: funcId })
  }

  // Process relations
  const relationMatches = [...content.matchAll(RELATION_REGEX)]
  for (const match of relationMatches) {
    const [, relationName, targets] = match
    const trimmedRelName = relationName.trim()
    const isAccountingRelation = trimmedRelName in ACCOUNTING_RELATION_MAP
    const mappedRelName = ACCOUNTING_RELATION_MAP[trimmedRelName] ?? trimmedRelName
    for (const rawTarget of targets
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean)) {
      // Extract optional leading weight: "6 CO2" → weight=6, "1500.50 Cash" → weight=1500.5
      let weight = 1
      let target = rawTarget
      const weightMatch = rawTarget.match(/^(\d+(?:\.\d{1,2})?)\s+(.+)$/)
      if (weightMatch) {
        weight = parseFloat(weightMatch[1])
        target = weightMatch[2]
      }

      let targetAdjective: string | null = null
      let targetBaseName = target
      const targetDisplayName = target

      const adjectiveMatch = target.match(/\*\*?([^*]+)\*\*?\s+(.+)/)
      if (adjectiveMatch) {
        targetAdjective = adjectiveMatch[1].trim()
        targetBaseName = adjectiveMatch[2].trim()
      }

      const cleanTargetBaseName = targetBaseName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
      const cleanTargetAdjective = targetAdjective
        ? targetAdjective
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '_')
        : null
      const targetId = cleanTargetAdjective ? `${cleanTargetAdjective}_${cleanTargetBaseName}` : cleanTargetBaseName
      const relId = `rel_${nodeId}_${trimmedRelName.toLowerCase().replace(/\s+/g, '_')}_${targetId}`

      ops.push({
        type: 'addNode',
        payload: {
          base_name: targetBaseName,
          displayName: targetDisplayName,
          role: isAccountingRelation ? 'Account' : 'class',
          options: { adjective: targetAdjective }
        },
        id: targetId
      })

      ops.push({
        type: 'addRelation',
        payload: { source: nodeId, target: targetId, name: mappedRelName, weight },
        id: relId
      })
    }
  }

  return ops
}

/**
 * Process the neighborhood of a morph (same as processNeighborhood but with morphId tagging).
 */
function processMorphNeighborhood(nodeId: string, morphId: string, lines: string[]): CnlOperation[] {
  const ops: CnlOperation[] = []
  let content = lines.join('\n')

  const descriptionMatch = content.match(DESCRIPTION_REGEX)
  if (descriptionMatch) {
    const description = descriptionMatch[1].trim()
    ops.push({
      type: 'updateNode',
      payload: { id: nodeId, fields: { description } },
      id: `${nodeId}_description`
    })
    content = content.replace(DESCRIPTION_REGEX, '').trim()
  }

  // Process attributes — any line with ":" is an attribute (has prefix is optional)
  const attributeLines = content.split('\n').filter((line) => {
    const trimmed = line.trim()
    if (!trimmed.includes(':')) return false
    if (trimmed.startsWith('<')) return false
    if (trimmed.match(/^\s*has\s+function\s+"/)) return false
    return true
  })
  for (const line of attributeLines) {
    const basicMatch = line.match(/^\s*(?:has\s+)?([^:<]+):\s*([^;]+);?/)
    if (!basicMatch) continue

    const [, name, fullValue] = basicMatch
    let value = fullValue.trim()
    let unit: string | null = null
    let adverb: string | null = null
    let modality: string | null = null
    let quantifier: string | null = null

    const unitMatch = value.match(/\*([^*]+)\*/)
    if (unitMatch) {
      unit = unitMatch[1].trim()
      value = value.replace(/\*[^*]+\*/, '').trim()
    }

    const quantifierMatch = value.match(/\*([^*]+)\*/)
    if (quantifierMatch) {
      quantifier = quantifierMatch[1].trim()
      value = value.replace(/\*[^*]+\*/, '').trim()
    }

    const adverbMatch = value.match(/\+\+([^+]+)\+\+/)
    if (adverbMatch) {
      adverb = adverbMatch[1].trim()
      value = value.replace(/\+\+[^+]+\+\+/, '').trim()
    }

    const modalityMatch = value.match(/\[([^\]]+)\]/)
    if (modalityMatch) {
      modality = modalityMatch[1].trim()
      value = value.replace(/\[[^\]]+\]/, '').trim()
    }

    value = value.trim()

    const valueHash = fnv1aHash(String(value))
    const attrId = `attr_${nodeId}_${name.trim().toLowerCase().replace(/\s+/g, '_')}_${valueHash}`

    const attributePayload: Record<string, unknown> = {
      source: nodeId,
      name: name.trim(),
      value,
      morphId
    }
    if (unit) attributePayload.unit = unit
    if (quantifier) attributePayload.quantifier = quantifier
    if (adverb) attributePayload.adverb = adverb
    if (modality) attributePayload.modality = modality

    ops.push({ type: 'addAttribute', payload: attributePayload, id: attrId })
  }

  // Process functions
  const functionMatches = [...content.matchAll(FUNCTION_REGEX)]
  for (const match of functionMatches) {
    const [, name] = match
    const funcId = `func_${nodeId}_${name.trim().toLowerCase().replace(/\s+/g, '_')}`
    ops.push({ type: 'applyFunction', payload: { source: nodeId, name: name.trim() }, id: funcId })
  }

  // Process relations (with morphId tagging)
  const relationMatches = [...content.matchAll(RELATION_REGEX)]
  for (const match of relationMatches) {
    const [, relationName, targets] = match
    const trimmedRelName = relationName.trim()
    const isAccountingRelation = trimmedRelName in ACCOUNTING_RELATION_MAP
    const mappedRelName = ACCOUNTING_RELATION_MAP[trimmedRelName] ?? trimmedRelName
    for (const rawTarget of targets
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean)) {
      // Extract optional leading weight: "6 CO2" → weight=6, "1500.50 Cash" → weight=1500.5
      let weight = 1
      let target = rawTarget
      const weightMatch = rawTarget.match(/^(\d+(?:\.\d{1,2})?)\s+(.+)$/)
      if (weightMatch) {
        weight = parseFloat(weightMatch[1])
        target = weightMatch[2]
      }

      let targetAdjective: string | null = null
      let targetBaseName = target
      const targetDisplayName = target

      const adjectiveMatch = target.match(/\*\*?([^*]+)\*\*?\s+(.+)/)
      if (adjectiveMatch) {
        targetAdjective = adjectiveMatch[1].trim()
        targetBaseName = adjectiveMatch[2].trim()
      }

      const cleanTargetBaseName = targetBaseName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
      const cleanTargetAdjective = targetAdjective
        ? targetAdjective
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '_')
        : null
      const targetId = cleanTargetAdjective ? `${cleanTargetAdjective}_${cleanTargetBaseName}` : cleanTargetBaseName
      const relId = `rel_${nodeId}_${trimmedRelName.toLowerCase().replace(/\s+/g, '_')}_${targetId}`

      ops.push({
        type: 'addNode',
        payload: {
          base_name: targetBaseName,
          displayName: targetDisplayName,
          role: isAccountingRelation ? 'Account' : 'class',
          options: { adjective: targetAdjective }
        },
        id: targetId
      })

      ops.push({
        type: 'addRelation',
        payload: { source: nodeId, target: targetId, name: mappedRelName, weight, morphId },
        id: relId
      })
    }
  }

  return ops
}

/**
 * Parse CNL text into an array of operations.
 */
export function getOperationsFromCnl(cnlText: string): CnlOperation[] {
  if (!cnlText) {
    return []
  }

  resetMorphCounter()

  const operations: CnlOperation[] = []
  const blocks = parseAllBlocks(cnlText)

  for (const block of blocks) {
    if (block.type === 'mindmap') {
      operations.push(...parseMindmapBlock(block.lines))
    } else {
      const blockText = block.lines.join('\n')
      const structuralTree = buildStructuralTree(blockText)

      for (const nodeBlock of structuralTree) {
        const { id: nodeId, payload: nodePayload } = processNodeHeading(nodeBlock.heading)
        operations.push({ type: 'addNode', payload: nodePayload, id: nodeId })

        const neighborhoodOps = processNeighborhood(nodeId, nodeBlock.content)
        operations.push(...neighborhoodOps)

        for (const morph of nodeBlock.morphs || []) {
          const morphId = generateMorphId(nodeId, morph.name)

          operations.push({
            type: 'addMorph',
            payload: {
              nodeId,
              morph: {
                morph_id: morphId,
                node_id: nodeId,
                name: morph.name,
                relationNode_ids: [],
                attributeNode_ids: []
              }
            },
            id: `${nodeId}_morph_${morph.name}`
          })

          const morphOps = processMorphNeighborhood(nodeId, morphId, morph.content)
          operations.push(...morphOps)
        }
      }
    }
  }

  // graph description from full text (works across all blocks)
  const graphDescriptionMatch = cnlText.match(GRAPH_DESCRIPTION_REGEX)
  if (graphDescriptionMatch) {
    const description = graphDescriptionMatch[1].trim()
    operations.push({ type: 'updateGraphDescription', payload: { description }, id: 'graph_description' })
  }

  // currency setting (graph-level line: "currency: USD;")
  const currencyMatch = cnlText.match(CURRENCY_REGEX)
  if (currencyMatch) {
    operations.push({ type: 'setCurrency', payload: { currency: currencyMatch[1].trim() }, id: 'graph_currency' })
  }

  return operations
}
