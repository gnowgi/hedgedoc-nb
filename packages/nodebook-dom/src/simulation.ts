/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlGraphData } from '@nodebook/core'

/**
 * Token-game (Petri net) semantics for nodeBook process representation,
 * mirroring the HedgeDoc React component minus its accounting and Function
 * modes: transition-role nodes connect to places via `has prior_state`
 * (inputs) and `has post_state` (outputs) arcs, `weight` is the arc
 * multiplicity, and firing consumes/produces tokens.
 */

/** Roles treated as transitions (matches the React component). */
export function isTransitionRole(role: string): boolean {
  return role === 'Transition' || role === 'Transaction' || role === 'Function'
}

export interface ProcessArc {
  placeId: string
  weight: number
}

export interface ProcessModel {
  /** Transition node ids that carry at least one prior/post arc. */
  transitionIds: string[]
  /** All place node ids (targets of prior/post arcs). */
  placeIds: Set<string>
  priorArcs: Map<string, ProcessArc[]>
  postArcs: Map<string, ProcessArc[]>
  /** Prior places start with max incoming prior-arc weight; others with 0. */
  initialMarking: Map<string, number>
}

/**
 * Extract the process structure from a (morph-filtered) graph, or null when
 * the graph has no transition-role node with prior/post arcs.
 */
export function buildProcessModel(graph: CnlGraphData): ProcessModel | null {
  const transitionIds: string[] = []
  const placeIds = new Set<string>()
  const priorArcs = new Map<string, ProcessArc[]>()
  const postArcs = new Map<string, ProcessArc[]>()

  for (const node of graph.nodes) {
    if (!isTransitionRole(node.role)) continue
    const prior: ProcessArc[] = []
    const post: ProcessArc[] = []
    for (const edge of graph.edges) {
      if (edge.source_id !== node.id || edge.negated) continue
      if (edge.name === 'has prior_state') prior.push({ placeId: edge.target_id, weight: edge.weight })
      if (edge.name === 'has post_state') post.push({ placeId: edge.target_id, weight: edge.weight })
    }
    if (prior.length === 0 && post.length === 0) continue
    transitionIds.push(node.id)
    priorArcs.set(node.id, prior)
    postArcs.set(node.id, post)
    for (const arc of [...prior, ...post]) placeIds.add(arc.placeId)
  }

  if (transitionIds.length === 0) return null

  const initialMarking = new Map<string, number>()
  for (const placeId of placeIds) initialMarking.set(placeId, 0)
  for (const arcs of priorArcs.values()) {
    for (const arc of arcs) {
      initialMarking.set(arc.placeId, Math.max(initialMarking.get(arc.placeId) ?? 0, arc.weight))
    }
  }

  return { transitionIds, placeIds, priorArcs, postArcs, initialMarking }
}

/** A transition is enabled when every input place holds its summed required tokens. */
export function isTransitionEnabled(model: ProcessModel, marking: Map<string, number>, transitionId: string): boolean {
  const inputs = model.priorArcs.get(transitionId)
  if (!inputs || inputs.length === 0) return false
  const required = new Map<string, number>()
  for (const arc of inputs) {
    required.set(arc.placeId, (required.get(arc.placeId) ?? 0) + arc.weight)
  }
  return [...required.entries()].every(([placeId, need]) => (marking.get(placeId) ?? 0) >= need)
}

/**
 * Fire a transition: consume from prior places, produce into post places.
 * Returns the new marking, or null if the transition is not enabled.
 */
export function fireTransition(
  model: ProcessModel,
  marking: Map<string, number>,
  transitionId: string
): Map<string, number> | null {
  if (!isTransitionEnabled(model, marking, transitionId)) return null
  const next = new Map(marking)
  for (const arc of model.priorArcs.get(transitionId) ?? []) {
    next.set(arc.placeId, (next.get(arc.placeId) ?? 0) - arc.weight)
  }
  for (const arc of model.postArcs.get(transitionId) ?? []) {
    next.set(arc.placeId, (next.get(arc.placeId) ?? 0) + arc.weight)
  }
  return next
}

/** Place label with a token indicator: up to 3 dots, then the number. */
export function placeLabel(name: string, tokenCount: number): string {
  if (tokenCount <= 0) return name
  if (tokenCount <= 3) return `${name}\n${'●'.repeat(tokenCount)}`
  return `${name}\n${tokenCount}`
}

/** Circled Unicode digit ①-⑳ for arc weights, parenthesized beyond 20. */
export function circledNumber(n: number): string {
  if (Number.isInteger(n) && n >= 1 && n <= 20) return String.fromCodePoint(0x245f + n)
  return `(${n})`
}

/**
 * Layered left-to-right positions for process graphs: input places →
 * transition bars → output places, following the token-flow direction.
 * BFS layering from the pure-input places; cycles are broken by restarting
 * from an unvisited node, so reaction cycles still get sensible columns.
 * Non-process nodes go in an extra column; attribute leaves sit below their
 * owner.
 */
export function computeProcessPositions(
  model: ProcessModel,
  conceptNodeIds: string[],
  attributeOwners: Map<string, string>,
  spacing: { dx: number; dy: number } = { dx: 190, dy: 95 }
): Map<string, { x: number; y: number }> {
  const successors = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  const inProcess = new Set<string>([...model.placeIds, ...model.transitionIds])
  for (const id of inProcess) {
    successors.set(id, [])
    indegree.set(id, 0)
  }
  for (const [transitionId, arcs] of model.priorArcs) {
    for (const arc of arcs) {
      successors.get(arc.placeId)!.push(transitionId)
      indegree.set(transitionId, (indegree.get(transitionId) ?? 0) + 1)
    }
  }
  for (const [transitionId, arcs] of model.postArcs) {
    for (const arc of arcs) {
      successors.get(transitionId)!.push(arc.placeId)
      indegree.set(arc.placeId, (indegree.get(arc.placeId) ?? 0) + 1)
    }
  }

  // Layer = flow depth. Each node is finalized once (first dequeue); pending
  // nodes take the deepest proposed layer before that, so chains order
  // correctly and cycles terminate (restart seeds any stranded subgraph).
  const layerOf = new Map<string, number>()
  const pending = new Set(inProcess)
  const queue: string[] = [...inProcess].filter((id) => (indegree.get(id) ?? 0) === 0)
  for (const id of queue) layerOf.set(id, 0)
  while (pending.size > 0) {
    if (queue.length === 0) {
      const restart = [...pending][0]
      layerOf.set(restart, 0)
      queue.push(restart)
    }
    const id = queue.shift()!
    if (!pending.has(id)) continue
    pending.delete(id)
    for (const next of successors.get(id) ?? []) {
      if (!pending.has(next)) continue
      const candidate = (layerOf.get(id) ?? 0) + 1
      if (candidate > (layerOf.get(next) ?? -1)) layerOf.set(next, candidate)
      if (!queue.includes(next)) queue.push(next)
    }
  }

  const maxLayer = Math.max(0, ...layerOf.values())
  for (const id of conceptNodeIds) {
    if (!layerOf.has(id)) layerOf.set(id, maxLayer + 1)
  }

  const byLayer = new Map<number, string[]>()
  for (const id of conceptNodeIds) {
    const layer = layerOf.get(id)!
    const list = byLayer.get(layer) ?? []
    list.push(id)
    byLayer.set(layer, list)
  }

  const positions = new Map<string, { x: number; y: number }>()
  for (const [layer, ids] of byLayer) {
    ids.forEach((id, index) => {
      positions.set(id, { x: layer * spacing.dx, y: (index - (ids.length - 1) / 2) * spacing.dy })
    })
  }
  for (const [attrId, ownerId] of attributeOwners) {
    const owner = positions.get(ownerId)
    if (owner) positions.set(attrId, { x: owner.x, y: owner.y + spacing.dy * 0.65 })
  }
  return positions
}
