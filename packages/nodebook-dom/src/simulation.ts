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
