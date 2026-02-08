/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlOperation } from './types'

const HEADING_REGEX = /^\s*(#+)\s*(?:\*\*(.+?)\*\*\s*)?(.+?)(?:\s*\[(.+?)\])?$/
const SIMPLE_HEADING_REGEX = /^\s*(#+)\s*(.+?)$/
const RELATION_REGEX = /^\s*<(.+?)>\s*([^;\n]*?)(?:;|$)/gm
const FUNCTION_REGEX = /^\s*has\s+function\s+"([^"]+)"\s*;/gm
const DESCRIPTION_REGEX = /```description\n([\s\S]*?)\n```/
const GRAPH_DESCRIPTION_REGEX = /```graph-description\n([\s\S]*?)\n```/

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

  let match = heading.match(HEADING_REGEX)
  if (match) {
    adjective = match[2] ?? null
    baseName = match[3]
    nodeType = match[4] ?? null
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
        adjective: adjective ? adjective.trim() : null
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

  // Process attributes
  const attributeLines = content.split('\n').filter((line) => line.trim().startsWith('has '))
  for (const line of attributeLines) {
    // Skip function declarations
    if (line.match(/^\s*has\s+function\s+"/)) continue

    const basicMatch = line.match(/^\s*has\s+([^:]+):\s*([^;]+);?/)
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
    for (const target of targets
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean)) {
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
      const relId = `rel_${nodeId}_${relationName.trim().toLowerCase().replace(/\s+/g, '_')}_${targetId}`

      ops.push({
        type: 'addNode',
        payload: {
          base_name: targetBaseName,
          displayName: targetDisplayName,
          role: 'class',
          options: { adjective: targetAdjective }
        },
        id: targetId
      })

      ops.push({
        type: 'addRelation',
        payload: { source: nodeId, target: targetId, name: relationName.trim() },
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

  // Process attributes
  const attributeLines = content.split('\n').filter((line) => line.trim().startsWith('has '))
  for (const line of attributeLines) {
    if (line.match(/^\s*has\s+function\s+"/)) continue

    const basicMatch = line.match(/^\s*has\s+([^:]+):\s*([^;]+);?/)
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
    for (const target of targets
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean)) {
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
      const relId = `rel_${nodeId}_${relationName.trim().toLowerCase().replace(/\s+/g, '_')}_${targetId}`

      ops.push({
        type: 'addNode',
        payload: {
          base_name: targetBaseName,
          displayName: targetDisplayName,
          role: 'class',
          options: { adjective: targetAdjective }
        },
        id: targetId
      })

      ops.push({
        type: 'addRelation',
        payload: { source: nodeId, target: targetId, name: relationName.trim(), morphId },
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
  const structuralTree = buildStructuralTree(cnlText)

  const graphDescriptionMatch = cnlText.match(GRAPH_DESCRIPTION_REGEX)
  if (graphDescriptionMatch) {
    const description = graphDescriptionMatch[1].trim()
    operations.push({ type: 'updateGraphDescription', payload: { description }, id: 'graph_description' })
  }

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

  return operations
}
