/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlAttribute, CnlEdge, CnlGraphData, InferredEdge } from '@nodebook/core'
import type { ElementDefinition } from 'cytoscape'

export interface BuildElementsOptions {
  /**
   * Active morph per node id. Nodes not listed use their default neighborhood
   * (`node.nbh`), mirroring the behavior of the full React graph component.
   */
  activeMorphs?: Record<string, string>
  /** Render attributes as leaf nodes attached to their owner. Default true. */
  showAttributes?: boolean
}

/**
 * Restrict a graph to each node's active morph, exactly like the React
 * component: the visible edges/attributes are the union of the members of
 * every node's active morph.
 */
export function filterGraphForMorphs(graph: CnlGraphData, activeMorphs: Record<string, string> = {}): CnlGraphData {
  const edges: CnlEdge[] = []
  const attributes: CnlAttribute[] = []
  const nodes = graph.nodes.map((node) => {
    const nbh = activeMorphs[node.id] ?? node.nbh
    const activeMorph = node.morphs.find((m) => m.morph_id === nbh)
    if (activeMorph) {
      for (const relId of activeMorph.relationNode_ids) {
        const edge = graph.edges.find((e) => e.id === relId)
        if (edge) edges.push(edge)
      }
      for (const attrId of activeMorph.attributeNode_ids) {
        const attr = graph.attributes.find((a) => a.id === attrId)
        if (attr) attributes.push(attr)
      }
    }
    return { ...node, nbh }
  })
  return { ...graph, nodes, edges, attributes }
}

function attributeLabel(attr: CnlAttribute): string {
  const unit = attr.unit ? ` ${attr.unit}` : ''
  const negation = attr.negated ? '¬ ' : ''
  return `${negation}${attr.name}: ${attr.value}${unit}`
}

function edgeLabel(edge: CnlEdge): string {
  const negation = edge.negated ? '¬ ' : ''
  const weight = edge.weight !== 1 ? ` ×${edge.weight}` : ''
  return `${negation}${edge.name}${weight}`
}

/**
 * Convert a (possibly morph-filtered) nodeBook graph into Cytoscape element
 * definitions. Pure function — no DOM required.
 */
export function buildCytoscapeElements(graph: CnlGraphData, options: BuildElementsOptions = {}): ElementDefinition[] {
  const showAttributes = options.showAttributes ?? true
  const filtered = options.activeMorphs ? filterGraphForMorphs(graph, options.activeMorphs) : graph

  const elements: ElementDefinition[] = []
  const nodeIds = new Set(filtered.nodes.map((n) => n.id))

  for (const node of filtered.nodes) {
    const morphName =
      node.morphs.length > 1 ? (node.morphs.find((m) => m.morph_id === node.nbh)?.name ?? null) : null
    elements.push({
      group: 'nodes',
      data: {
        id: node.id,
        label: morphName && morphName !== 'basic' ? `${node.name}\n(${morphName})` : node.name,
        role: node.role,
        kind: 'concept'
      }
    })
  }

  for (const edge of filtered.edges) {
    // Skip dangling edges defensively: morph filtering or partial CNL can
    // reference nodes that were never declared.
    if (!nodeIds.has(edge.source_id) || !nodeIds.has(edge.target_id)) continue
    elements.push({
      group: 'edges',
      data: {
        id: edge.id,
        source: edge.source_id,
        target: edge.target_id,
        label: edgeLabel(edge),
        kind: edge.negated ? 'negated-relation' : 'relation'
      }
    })
  }

  if (showAttributes) {
    for (const attr of filtered.attributes) {
      if (!nodeIds.has(attr.source_id)) continue
      elements.push({
        group: 'nodes',
        data: {
          id: attr.id,
          label: attributeLabel(attr),
          kind: 'attribute'
        }
      })
      elements.push({
        group: 'edges',
        data: {
          id: `${attr.id}__edge`,
          source: attr.source_id,
          target: attr.id,
          label: '',
          kind: 'attribute-edge'
        }
      })
    }
  }

  return elements
}

/**
 * Convert inferred edges into Cytoscape element definitions. Kept separate
 * from {@link buildCytoscapeElements} so callers can add them AFTER layout —
 * the layout should position nodes based on explicit edges only.
 */
export function buildInferredEdgeElements(inferredEdges: InferredEdge[], graph: CnlGraphData): ElementDefinition[] {
  const nodeIds = new Set(graph.nodes.map((n) => n.id))
  const elements: ElementDefinition[] = []
  for (const edge of inferredEdges) {
    if (!nodeIds.has(edge.source_id) || !nodeIds.has(edge.target_id)) continue
    elements.push({
      group: 'edges',
      data: {
        id: edge.id,
        source: edge.source_id,
        target: edge.target_id,
        label: edge.name,
        kind: 'inferred-relation',
        inferenceRule: edge.inferenceRule,
        proofPath: edge.proofPath.join(' → ')
      }
    })
  }
  return elements
}
