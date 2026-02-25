/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { MergedSchemas } from './schema-store'
import type { CnlGraphData, InferredEdge, InferenceResult } from './types'

/**
 * Interface for inference engines that derive implicit edges from explicit graph data.
 * Designed as a seam for swapping implementations (e.g., Tau Prolog in issue #10).
 */
export interface InferenceEngine {
  infer(graphData: CnlGraphData, schemas: MergedSchemas): InferenceResult
}

/** FNV-1a hash for deterministic ID generation. */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 6)
}

/**
 * JS-based transitive closure engine.
 * Computes inferred edges via BFS for transitive relations and membership inheritance.
 */
export class TransitiveClosureEngine implements InferenceEngine {
  infer(graphData: CnlGraphData, schemas: MergedSchemas): InferenceResult {
    const inferredEdges: InferredEdge[] = []
    const existingEdgeKeys = new Set<string>()

    // Index explicit edges by key "source|target|relation"
    for (const edge of graphData.edges) {
      existingEdgeKeys.add(`${edge.source_id}|${edge.target_id}|${edge.name}`)
    }

    // Resolve transitive relation names (including aliases)
    const transitiveRelations = new Set<string>()
    const aliasToCanonical = new Map<string, string>()
    for (const rel of schemas.relationTypes) {
      if (rel.transitive) {
        transitiveRelations.add(rel.name)
        if (rel.aliases) {
          for (const alias of rel.aliases) {
            aliasToCanonical.set(alias, rel.name)
            transitiveRelations.add(alias)
          }
        }
      }
    }

    // Build adjacency index per canonical relation name: relation → source → [{target, edgeId}]
    const adjByRelation = new Map<string, Map<string, Array<{ target: string; edgeId: string }>>>()
    for (const edge of graphData.edges) {
      const canonical = aliasToCanonical.get(edge.name) ?? edge.name
      if (!transitiveRelations.has(canonical)) continue

      let adj = adjByRelation.get(canonical)
      if (!adj) {
        adj = new Map()
        adjByRelation.set(canonical, adj)
      }
      let neighbors = adj.get(edge.source_id)
      if (!neighbors) {
        neighbors = []
        adj.set(edge.source_id, neighbors)
      }
      neighbors.push({ target: edge.target_id, edgeId: edge.id })
    }

    // Also index edges by alias → canonical (merge into canonical adjacency)
    for (const edge of graphData.edges) {
      const canonical = aliasToCanonical.get(edge.name)
      if (!canonical) continue
      // Already handled above since we check canonical
    }

    // 1. Transitive closure: BFS per relation, per source node
    const inferredKeys = new Set<string>()

    for (const [relation, adj] of adjByRelation) {
      for (const [startNode] of adj) {
        // BFS from startNode
        const visited = new Set<string>()
        visited.add(startNode)

        // Queue entries: { nodeId, proofPath (edge IDs), depth }
        const queue: Array<{ nodeId: string; proofPath: string[] }> = []

        // Seed with direct neighbors
        const directNeighbors = adj.get(startNode)
        if (!directNeighbors) continue
        for (const { target, edgeId } of directNeighbors) {
          if (target === startNode) continue // skip self-loops
          visited.add(target)
          queue.push({ nodeId: target, proofPath: [edgeId] })
        }

        while (queue.length > 0) {
          const current = queue.shift()!
          const nextNeighbors = adj.get(current.nodeId)
          if (!nextNeighbors) continue

          for (const { target, edgeId } of nextNeighbors) {
            if (visited.has(target)) continue
            if (target === startNode) continue // prevent cycles back to start
            visited.add(target)

            const proofPath = [...current.proofPath, edgeId]
            queue.push({ nodeId: target, proofPath })

            // Only emit inferred edge if distance >= 2 (not a direct edge)
            // and it doesn't duplicate an explicit edge
            const edgeKey = `${startNode}|${target}|${relation}`
            if (!existingEdgeKeys.has(edgeKey) && !inferredKeys.has(edgeKey)) {
              inferredKeys.add(edgeKey)
              const id = `inferred_${fnv1aHash(edgeKey)}`
              inferredEdges.push({
                id,
                source_id: startNode,
                target_id: target,
                name: relation,
                weight: 1,
                morph_ids: [],
                proofPath,
                inferenceRule: 'transitive_closure'
              })
            }
          }
        }
      }
    }

    // 2. Membership inheritance: member_of(X,A) + is_a(A,B) → member_of(X,B)
    //    Also: instance_of(X,A) + is_a(A,B) → instance_of(X,B)
    const isAAdj = adjByRelation.get('is_a')
    if (isAAdj) {
      for (const memberRel of ['member_of', 'instance_of']) {
        const memberEdges = graphData.edges.filter(
          (e) => e.name === memberRel || aliasToCanonical.get(e.name) === memberRel
        )

        for (const memberEdge of memberEdges) {
          // BFS up the is_a chain from memberEdge.target_id
          const visited = new Set<string>()
          visited.add(memberEdge.target_id)

          const queue: Array<{ nodeId: string; proofPath: string[] }> = []

          const directIsA = isAAdj.get(memberEdge.target_id)
          if (!directIsA) continue

          for (const { target, edgeId } of directIsA) {
            if (visited.has(target)) continue
            visited.add(target)
            queue.push({ nodeId: target, proofPath: [memberEdge.id, edgeId] })
          }

          while (queue.length > 0) {
            const current = queue.shift()!

            // Emit inferred membership edge
            const edgeKey = `${memberEdge.source_id}|${current.nodeId}|${memberRel}`
            if (!existingEdgeKeys.has(edgeKey) && !inferredKeys.has(edgeKey)) {
              inferredKeys.add(edgeKey)
              const id = `inferred_${fnv1aHash(edgeKey)}`
              inferredEdges.push({
                id,
                source_id: memberEdge.source_id,
                target_id: current.nodeId,
                name: memberRel,
                weight: 1,
                morph_ids: [],
                proofPath: current.proofPath,
                inferenceRule: 'membership_inheritance'
              })
            }

            // Continue BFS up is_a chain
            const nextIsA = isAAdj.get(current.nodeId)
            if (!nextIsA) continue
            for (const { target, edgeId } of nextIsA) {
              if (visited.has(target)) continue
              visited.add(target)
              queue.push({ nodeId: target, proofPath: [...current.proofPath, edgeId] })
            }
          }
        }
      }
    }

    return { inferredEdges, errors: [] }
  }
}
