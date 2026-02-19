/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlAttribute, CnlEdge, CnlGraphData, CnlNode, CnlOperation, Morph } from './types'

/**
 * Browser-compatible FNV-1a hash
 */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 6)
}

let basicMorphCounter = 0

function createBasicMorph(nodeId: string): Morph {
  basicMorphCounter++
  return {
    morph_id: `${nodeId}_morph_basic_${basicMorphCounter}`,
    node_id: nodeId,
    name: 'basic',
    relationNode_ids: [],
    attributeNode_ids: []
  }
}

/**
 * Convert parsed CNL operations into a CnlGraphData structure.
 * Uses 3-pass processing matching nodeBook's data-store.js:
 *   Pass 1: Create explicit nodes
 *   Pass 2: Add morphs to nodes
 *   Pass 3: Link relations, attributes, functions to morphs
 */
export function operationsToGraph(operations: CnlOperation[]): CnlGraphData {
  basicMorphCounter = 0

  const nodesMap = new Map<string, CnlNode>()
  const edges: CnlEdge[] = []
  const attributes: CnlAttribute[] = []
  const errors: Array<{ message: string; line?: number }> = []
  let description: string | null = null
  let currency: string | null = null

  // PASS 1: Create explicit nodes (addNode operations)
  for (const op of operations) {
    if (op.type === 'addNode') {
      const payload = op.payload as {
        base_name: string
        displayName?: string
        role?: string
        options?: {
          id?: string
          role?: string
          parent_types?: string[]
          adjective?: string | null
        }
      }
      const nodeId = op.id

      if (nodesMap.has(nodeId)) continue

      const options = payload.options ?? {}
      const role = options.role ?? payload.role ?? 'individual'
      const adjective = options.adjective ?? null
      const baseName = payload.base_name
      const name = adjective ? `${adjective} ${baseName}` : baseName

      const basicMorph = createBasicMorph(nodeId)

      const node: CnlNode = {
        id: nodeId,
        base_name: baseName,
        name,
        adjective,
        quantifier: null,
        role,
        description: null,
        parent_types: options.parent_types ?? [],
        morphs: [basicMorph],
        nbh: basicMorph.morph_id
      }

      nodesMap.set(nodeId, node)
    }
  }

  // PASS 2: Process morph operations
  for (const op of operations) {
    if (op.type === 'addMorph') {
      const payload = op.payload as {
        nodeId: string
        morph: {
          morph_id: string
          node_id: string
          name: string
          relationNode_ids: string[]
          attributeNode_ids: string[]
        }
      }
      const node = nodesMap.get(payload.nodeId)
      if (node) {
        node.morphs.push({
          morph_id: payload.morph.morph_id,
          node_id: payload.morph.node_id,
          name: payload.morph.name,
          relationNode_ids: [...payload.morph.relationNode_ids],
          attributeNode_ids: [...payload.morph.attributeNode_ids]
        })
      }
    }
  }

  // PASS 3: Process relations, attributes, functions, updates
  for (const op of operations) {
    if (op.type === 'addRelation') {
      const payload = op.payload as {
        source: string
        target: string
        name: string
        weight?: number
        morphId?: string
      }

      const edge: CnlEdge = {
        id: op.id,
        source_id: payload.source,
        target_id: payload.target,
        name: payload.name,
        weight: payload.weight ?? 1,
        morph_ids: []
      }

      // Link to morph
      const sourceNode = nodesMap.get(payload.source)
      if (sourceNode) {
        if (payload.morphId) {
          const targetMorph = sourceNode.morphs.find((m) => m.morph_id === payload.morphId)
          if (targetMorph) {
            targetMorph.relationNode_ids.push(edge.id)
            edge.morph_ids.push(payload.morphId)
          }
        } else {
          // Link to first (basic) morph
          sourceNode.morphs[0].relationNode_ids.push(edge.id)
          edge.morph_ids.push(sourceNode.morphs[0].morph_id)
        }
      }

      edges.push(edge)
    } else if (op.type === 'addAttribute') {
      const payload = op.payload as {
        source: string
        name: string
        value: string
        morphId?: string
        unit?: string
        adverb?: string
        modality?: string
        quantifier?: string
      }

      const attr: CnlAttribute = {
        id: op.id,
        source_id: payload.source,
        name: payload.name,
        value: payload.value,
        unit: payload.unit ?? null,
        adverb: payload.adverb ?? null,
        modality: payload.modality ?? null,
        quantifier: payload.quantifier ?? null,
        morph_ids: []
      }

      // Link to morph
      const sourceNode = nodesMap.get(payload.source)
      if (sourceNode) {
        if (payload.morphId) {
          const targetMorph = sourceNode.morphs.find((m) => m.morph_id === payload.morphId)
          if (targetMorph) {
            targetMorph.attributeNode_ids.push(attr.id)
            attr.morph_ids.push(payload.morphId)
          }
        } else {
          sourceNode.morphs[0].attributeNode_ids.push(attr.id)
          attr.morph_ids.push(sourceNode.morphs[0].morph_id)
        }
      }

      attributes.push(attr)
    } else if (op.type === 'applyFunction') {
      const payload = op.payload as { source: string; name: string }
      const valueHash = fnv1aHash(`function:${payload.name}`)
      const attr: CnlAttribute = {
        id: op.id,
        source_id: payload.source,
        name: payload.name,
        value: `function:${payload.name}`,
        unit: null,
        adverb: null,
        modality: null,
        quantifier: null,
        morph_ids: []
      }

      const sourceNode = nodesMap.get(payload.source)
      if (sourceNode) {
        sourceNode.morphs[0].attributeNode_ids.push(attr.id)
        attr.morph_ids.push(sourceNode.morphs[0].morph_id)
      }

      attributes.push(attr)
    } else if (op.type === 'updateNode') {
      const payload = op.payload as { id: string; fields: Record<string, unknown> }
      const node = nodesMap.get(payload.id)
      if (node && payload.fields) {
        if (typeof payload.fields.description === 'string') {
          node.description = payload.fields.description
        }
      }
    } else if (op.type === 'updateGraphDescription') {
      const payload = op.payload as { description: string }
      description = payload.description
    } else if (op.type === 'setCurrency') {
      const payload = op.payload as { currency: string }
      currency = payload.currency
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
    attributes,
    description,
    currency,
    errors
  }
}
