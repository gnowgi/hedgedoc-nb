/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface NodeBookStats {
  nodeCount: number
  edgeCount: number
  attributeCount: number
  typedNodeCount: number
  morphCount: number
  queryCount: number
  inferredEdgeCount: number
  maxInferenceChain: number
  hasSchema: boolean
  schemaValidates: boolean
  hasTransition: boolean
  transitionBalanced: boolean
  hasComputation: boolean
  computationChained: boolean
  blockCount: number
}

export interface ScoreCategory {
  name: string
  earned: number
  max: number
}

export interface NodeBookScore {
  total: number
  categories: ScoreCategory[]
}

export function computeNodeBookScore(stats: NodeBookStats): NodeBookScore {
  const categories: ScoreCategory[] = []

  // Coverage (max 20): based on node count
  let coverage = 0
  if (stats.nodeCount >= 30) coverage = 20
  else if (stats.nodeCount >= 20) coverage = 15
  else if (stats.nodeCount >= 10) coverage = 10
  else if (stats.nodeCount >= 5) coverage = 5
  categories.push({ name: 'coverage', earned: coverage, max: 20 })

  // Connectivity (max 15): based on average degree
  const avgDegree = (2 * stats.edgeCount) / Math.max(stats.nodeCount, 1)
  let connectivity = 0
  if (avgDegree >= 4) connectivity = 15
  else if (avgDegree >= 3) connectivity = 10
  else if (avgDegree >= 2) connectivity = 5
  categories.push({ name: 'connectivity', earned: connectivity, max: 15 })

  // Typing (max 15): percentage of typed nodes
  const typedPercent = stats.nodeCount > 0 ? (stats.typedNodeCount / stats.nodeCount) * 100 : 0
  let typing = 0
  if (typedPercent >= 100) typing = 15
  else if (typedPercent >= 75) typing = 10
  else if (typedPercent >= 50) typing = 5
  categories.push({ name: 'typing', earned: typing, max: 15 })

  // Inference (max 10): based on max inference chain length
  let inference = 0
  if (stats.maxInferenceChain >= 4) inference = 10
  else if (stats.maxInferenceChain >= 3) inference = 6
  else if (stats.maxInferenceChain >= 2) inference = 3
  categories.push({ name: 'inference', earned: inference, max: 10 })

  // Schema (max 10): whether schema exists and validates
  let schema = 0
  if (stats.schemaValidates) schema = 10
  else if (stats.hasSchema) schema = 5
  categories.push({ name: 'schema', earned: schema, max: 10 })

  // Processes (max 10): transitions with balance
  let processes = 0
  if (stats.transitionBalanced) processes = 10
  else if (stats.hasTransition) processes = 5
  categories.push({ name: 'processes', earned: processes, max: 10 })

  // Computation (max 10): expressions chained
  let computation = 0
  if (stats.computationChained) computation = 10
  else if (stats.hasComputation) computation = 5
  categories.push({ name: 'computation', earned: computation, max: 10 })

  // Queries (max 5): any queries present
  let queries = 0
  if (stats.queryCount > 0) queries = 5
  categories.push({ name: 'queries', earned: queries, max: 5 })

  // Morphs (max 5): any morphs present
  let morphs = 0
  if (stats.morphCount > 0) morphs = 5
  categories.push({ name: 'morphs', earned: morphs, max: 5 })

  const total = categories.reduce((sum, cat) => sum + cat.earned, 0)

  return { total, categories }
}
