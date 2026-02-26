/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useMemo } from 'react'
import { useNoteMarkdownContent } from '../../../../hooks/common/use-note-markdown-content'
import { getOperationsFromCnl } from '../nodebook-parser/cnl-parser'
import { operationsToGraph } from '../nodebook-parser/operations-to-graph'
import { validateOperations } from '../nodebook-parser/validate-operations'
import { getMergedSchemas } from '../nodebook-parser/schema-store'
import { TransitiveClosureEngine } from '../nodebook-parser/inference-engine'
import type { CnlGraphData } from '../nodebook-parser/types'
import { computeNodeBookScore, type NodeBookScore, type NodeBookStats } from './compute-nodebook-score'

/** Regex to extract ```nodeBook blocks (but not ```nodeBook-schema). */
const NODEBOOK_BLOCK_REGEX = /```nodeBook(?!-schema)\b[^\n]*\n([\s\S]*?)```/g

/** Regex to detect ```nodeBook-schema blocks. */
const SCHEMA_BLOCK_REGEX = /```nodeBook-schema\b/g

/** Check if a node role is a transition-like role. */
function isTransitionRole(role: string): boolean {
  return role === 'Transition' || role === 'Transaction' || role === 'Function'
}

export interface NodeBookStatsResult {
  hasNodeBookBlocks: boolean
  stats: NodeBookStats
  score: NodeBookScore
}

const EMPTY_STATS: NodeBookStats = {
  nodeCount: 0,
  edgeCount: 0,
  attributeCount: 0,
  typedNodeCount: 0,
  morphCount: 0,
  queryCount: 0,
  inferredEdgeCount: 0,
  maxInferenceChain: 0,
  hasSchema: false,
  schemaValidates: false,
  hasTransition: false,
  transitionBalanced: false,
  hasComputation: false,
  computationChained: false,
  blockCount: 0
}

const EMPTY_RESULT: NodeBookStatsResult = {
  hasNodeBookBlocks: false,
  stats: EMPTY_STATS,
  score: computeNodeBookScore(EMPTY_STATS)
}

export function useNodeBookStats(): NodeBookStatsResult {
  const markdownContent = useNoteMarkdownContent()

  return useMemo(() => {
    // Extract nodeBook code blocks
    const blocks: string[] = []
    let match: RegExpExecArray | null
    const blockRegex = new RegExp(NODEBOOK_BLOCK_REGEX.source, NODEBOOK_BLOCK_REGEX.flags)
    while ((match = blockRegex.exec(markdownContent)) !== null) {
      blocks.push(match[1])
    }

    if (blocks.length === 0) {
      return EMPTY_RESULT
    }

    // Count schema blocks
    const schemaRegex = new RegExp(SCHEMA_BLOCK_REGEX.source, SCHEMA_BLOCK_REGEX.flags)
    let schemaBlockCount = 0
    while (schemaRegex.exec(markdownContent) !== null) {
      schemaBlockCount++
    }

    // Aggregate stats across all blocks
    let totalNodes = 0
    let totalEdges = 0
    let totalAttributes = 0
    let totalTypedNodes = 0
    let totalMorphs = 0
    let totalQueries = 0
    let totalInferredEdges = 0
    let maxChain = 0
    let hasTransition = false
    let transitionBalanced = false
    let hasComputation = false
    let computationChained = false

    const schemas = getMergedSchemas()
    const inferenceEngine = new TransitiveClosureEngine()
    let allValidationErrors = 0

    for (const block of blocks) {
      try {
        const operations = getOperationsFromCnl(block)
        const graphData: CnlGraphData = operationsToGraph(operations)

        totalNodes += graphData.nodes.length
        totalEdges += graphData.edges.length
        totalAttributes += graphData.attributes.length
        totalQueries += graphData.queries.length

        // Count typed nodes (role !== 'individual')
        for (const node of graphData.nodes) {
          if (node.role !== 'individual') {
            totalTypedNodes++
          }
        }

        // Count non-basic morphs
        for (const node of graphData.nodes) {
          for (const morph of node.morphs) {
            if (morph.name !== 'basic') {
              totalMorphs++
            }
          }
        }

        // Check transitions
        const transitions = graphData.nodes.filter((n) => isTransitionRole(n.role))
        if (transitions.length > 0) {
          hasTransition = true
          // Check balance: each transition has both prior_state and post_state edges
          const balanced = transitions.every((t) => {
            const hasInput = graphData.edges.some((e) => e.source_id === t.id && e.name === 'has prior_state')
            const hasOutput = graphData.edges.some((e) => e.source_id === t.id && e.name === 'has post_state')
            return hasInput && hasOutput
          })
          if (balanced) transitionBalanced = true
        }

        // Check computation (expressions)
        if (graphData.expressions.length > 0) {
          hasComputation = true
          // Chained: more than one expression or expression references another node
          if (graphData.expressions.length > 1) {
            computationChained = true
          }
        }

        // Run inference to count inferred edges and max chain length
        const inferenceResult = inferenceEngine.infer(graphData, schemas)
        totalInferredEdges += inferenceResult.inferredEdges.length
        for (const edge of inferenceResult.inferredEdges) {
          if (edge.proofPath.length > maxChain) {
            maxChain = edge.proofPath.length
          }
        }

        // Validate
        const errors = validateOperations(operations, schemas)
        allValidationErrors += errors.length
      } catch {
        // Skip blocks that fail to parse
      }
    }

    const stats: NodeBookStats = {
      nodeCount: totalNodes,
      edgeCount: totalEdges,
      attributeCount: totalAttributes,
      typedNodeCount: totalTypedNodes,
      morphCount: totalMorphs,
      queryCount: totalQueries,
      inferredEdgeCount: totalInferredEdges,
      maxInferenceChain: maxChain,
      hasSchema: schemaBlockCount > 0,
      schemaValidates: schemaBlockCount > 0 && allValidationErrors === 0,
      hasTransition,
      transitionBalanced,
      hasComputation,
      computationChained,
      blockCount: blocks.length
    }

    return {
      hasNodeBookBlocks: true,
      stats,
      score: computeNodeBookScore(stats)
    }
  }, [markdownContent])
}
