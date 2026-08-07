/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlAttribute, CnlEdge, CnlGraphData, InferredEdge } from '@nodebook/core'
import type { ElementDefinition } from 'cytoscape'
import { circledNumber } from './simulation'

export interface BuildElementsOptions {
  /**
   * Active morph per node id. Nodes not listed use their default neighborhood
   * (`node.nbh`), mirroring the behavior of the full React graph component.
   */
  activeMorphs?: Record<string, string>
  /** Render attributes as leaf nodes attached to their owner. Default true. */
  showAttributes?: boolean
  /**
   * Containment view: nest children inside compound parents along
   * is_a / member_of / instance_of edges instead of drawing those edges.
   * Inferred containment edges passed via `inferredEdges` deepen the nesting.
   */
  containment?: boolean
  /** Inferred edges considered for containment nesting (containment mode only). */
  inferredEdges?: InferredEdge[]
  /**
   * Petri-net rendering of prior/post arcs: input arcs draw place → transition
   * (into the bar), output arcs transition → place, with the relation label
   * replaced by a circled weight (only when ≠ 1).
   */
  processMode?: boolean
}

/** Relations expressed as nesting rather than arrows in containment view. */
export const CONTAINMENT_RELATIONS = new Set(['is_a', 'member_of', 'instance_of'])

/** Synthetic compound ids for the Petri-view Inputs/Outputs grouping boxes. */
export const PROCESS_INPUT_GROUP = '__nb_inputs__'
export const PROCESS_OUTPUT_GROUP = '__nb_outputs__'

/**
 * Assign at most one compound parent per node from containment edges,
 * mirroring the React component: is_a parents take precedence over
 * member_of / instance_of, explicit edges over inferred (callers order the
 * input accordingly), and candidates creating a parent-chain cycle are
 * skipped.
 */
export function buildContainmentParentMap(
  edges: Array<{ source_id: string; target_id: string; name: string }>
): Map<string, string> {
  const isaParents = new Map<string, string[]>()
  const memberParents = new Map<string, string[]>()
  for (const edge of edges) {
    if (!CONTAINMENT_RELATIONS.has(edge.name)) continue
    const bucket = edge.name === 'is_a' ? isaParents : memberParents
    const list = bucket.get(edge.source_id) ?? []
    if (!list.includes(edge.target_id)) list.push(edge.target_id)
    bucket.set(edge.source_id, list)
  }

  const parentOf = new Map<string, string>()
  const wouldCreateCycle = (child: string, candidate: string): boolean => {
    let current: string | undefined = candidate
    while (current !== undefined) {
      if (current === child) return true
      current = parentOf.get(current)
    }
    return false
  }
  for (const bucket of [isaParents, memberParents]) {
    for (const [child, candidates] of bucket) {
      if (parentOf.has(child)) continue
      for (const candidate of candidates) {
        if (!wouldCreateCycle(child, candidate)) {
          parentOf.set(child, candidate)
          break
        }
      }
    }
  }
  return parentOf
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
  const containment = options.containment ?? false
  const filtered = options.activeMorphs ? filterGraphForMorphs(graph, options.activeMorphs) : graph

  const elements: ElementDefinition[] = []
  const nodeIds = new Set(filtered.nodes.map((n) => n.id))

  // Explicit edges first so they win over inferred ones for parent choice.
  const parentOf = containment
    ? buildContainmentParentMap([...filtered.edges, ...(options.inferredEdges ?? [])])
    : new Map<string, string>()

  // Petri view (when not nesting): group pure-input places into an "Inputs"
  // box and pure-output places into an "Outputs" box; places that are both
  // (intermediates in chains/cycles) stay free between the transitions.
  if ((options.processMode ?? false) && !containment) {
    const priorPlaces = new Set<string>()
    const postPlaces = new Set<string>()
    for (const edge of filtered.edges) {
      if (edge.negated) continue
      if (edge.name === 'has prior_state') priorPlaces.add(edge.target_id)
      if (edge.name === 'has post_state') postPlaces.add(edge.target_id)
    }
    for (const placeId of priorPlaces) {
      if (!postPlaces.has(placeId)) parentOf.set(placeId, PROCESS_INPUT_GROUP)
    }
    for (const placeId of postPlaces) {
      if (!priorPlaces.has(placeId)) parentOf.set(placeId, PROCESS_OUTPUT_GROUP)
    }
    const parents = new Set(parentOf.values())
    if (parents.has(PROCESS_INPUT_GROUP)) {
      elements.push({
        group: 'nodes',
        data: { id: PROCESS_INPUT_GROUP, label: 'Inputs', kind: 'group', groupRole: 'inputs' }
      })
    }
    if (parents.has(PROCESS_OUTPUT_GROUP)) {
      elements.push({
        group: 'nodes',
        data: { id: PROCESS_OUTPUT_GROUP, label: 'Outputs', kind: 'group', groupRole: 'outputs' }
      })
    }
  }

  for (const node of filtered.nodes) {
    const morphName =
      node.morphs.length > 1 ? (node.morphs.find((m) => m.morph_id === node.nbh)?.name ?? null) : null
    const parent = parentOf.get(node.id)
    elements.push({
      group: 'nodes',
      data: {
        id: node.id,
        label: morphName && morphName !== 'basic' ? `${node.name}\n(${morphName})` : node.name,
        role: node.role,
        kind: 'concept',
        ...(parent ? { parent } : {})
      }
    })
  }

  const processMode = options.processMode ?? false
  for (const edge of filtered.edges) {
    // Skip dangling edges defensively: morph filtering or partial CNL can
    // reference nodes that were never declared.
    if (!nodeIds.has(edge.source_id) || !nodeIds.has(edge.target_id)) continue
    // Nesting expresses containment relations; skip their arrows.
    if (containment && CONTAINMENT_RELATIONS.has(edge.name)) continue
    if (processMode && !edge.negated && (edge.name === 'has prior_state' || edge.name === 'has post_state')) {
      // Petri-net convention: arrows follow token flow, weights are circled,
      // the relation name is implied by the direction.
      const isInput = edge.name === 'has prior_state'
      elements.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: isInput ? edge.target_id : edge.source_id,
          target: isInput ? edge.source_id : edge.target_id,
          label: edge.weight !== 1 ? circledNumber(edge.weight) : '',
          kind: isInput ? 'process-input' : 'process-output'
        }
      })
      continue
    }
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
      // In containment view, attribute leaves sit inside the same compound as
      // their owner so the box visually contains the node's whole description.
      const parent = parentOf.get(attr.source_id)
      elements.push({
        group: 'nodes',
        data: {
          id: attr.id,
          label: attributeLabel(attr),
          kind: 'attribute',
          ...(parent ? { parent } : {})
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
