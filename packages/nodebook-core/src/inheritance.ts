/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlGraphData } from './types'

export interface InheritedAttribute {
  name: string
  value: string
  unit: string | null
  /** Display name of the ancestor the attribute was inherited from. */
  inheritedFrom: string
}

/** Relations along which a node inherits its ancestors' attributes. */
const INHERITANCE_RELATIONS = new Set(['is_a', 'instance_of', 'member_of'])

/**
 * Computes the attributes a node inherits from its `is_a` / `instance_of` /
 * `member_of` ancestors. The chain is walked breadth-first (nearest ancestor
 * first); a node's own attributes — and any nearer ancestor's — override an
 * inherited attribute of the same name.
 */
export function getInheritedAttributes(nodeId: string, graphData: CnlGraphData): InheritedAttribute[] {
  const nodeName = new Map(graphData.nodes.map((n) => [n.id, n.name]))

  // Names already resolved (case-insensitive). Seed with the node's own attributes
  // so own values win over anything inherited.
  const resolved = new Set<string>()
  for (const a of graphData.attributes) {
    if (a.source_id === nodeId) resolved.add(a.name.toLowerCase())
  }

  const inherited: InheritedAttribute[] = []
  const visited = new Set<string>([nodeId])
  let frontier: string[] = [nodeId]

  while (frontier.length > 0) {
    const next: string[] = []
    for (const current of frontier) {
      for (const edge of graphData.edges) {
        if (edge.source_id !== current || !INHERITANCE_RELATIONS.has(edge.name)) continue
        const parent = edge.target_id
        if (visited.has(parent)) continue
        visited.add(parent)
        next.push(parent)
        for (const attr of graphData.attributes) {
          if (attr.source_id !== parent) continue
          const key = attr.name.toLowerCase()
          if (resolved.has(key)) continue
          resolved.add(key)
          inherited.push({
            name: attr.name,
            value: attr.value,
            unit: attr.unit,
            inheritedFrom: nodeName.get(parent) ?? parent
          })
        }
      }
    }
    frontier = next
  }

  return inherited
}
