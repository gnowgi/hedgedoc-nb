/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { computeNodeBookScore } from './compute-nodebook-score'
import type { NodeBookStats } from './compute-nodebook-score'

function makeStats(overrides: Partial<NodeBookStats> = {}): NodeBookStats {
  return {
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
    blockCount: 0,
    ...overrides
  }
}

function getCategory(score: ReturnType<typeof computeNodeBookScore>, name: string) {
  return score.categories.find((c) => c.name === name)
}

describe('computeNodeBookScore', () => {
  describe('structure', () => {
    it('returns exactly 9 categories', () => {
      const score = computeNodeBookScore(makeStats())
      expect(score.categories).toHaveLength(9)
    })

    it('total equals sum of all earned values', () => {
      const score = computeNodeBookScore(
        makeStats({
          nodeCount: 35,
          edgeCount: 80,
          typedNodeCount: 35,
          maxInferenceChain: 5,
          schemaValidates: true,
          transitionBalanced: true,
          computationChained: true,
          queryCount: 3,
          morphCount: 2
        })
      )
      const sum = score.categories.reduce((s, c) => s + c.earned, 0)
      expect(score.total).toBe(sum)
    })

    it('max possible score is 100', () => {
      const score = computeNodeBookScore(
        makeStats({
          nodeCount: 35,
          edgeCount: 80,
          typedNodeCount: 35,
          maxInferenceChain: 5,
          schemaValidates: true,
          hasSchema: true,
          transitionBalanced: true,
          hasTransition: true,
          computationChained: true,
          hasComputation: true,
          queryCount: 3,
          morphCount: 2
        })
      )
      const maxSum = score.categories.reduce((s, c) => s + c.max, 0)
      expect(maxSum).toBe(100)
      expect(score.total).toBe(100)
    })

    it('all categories have correct names', () => {
      const score = computeNodeBookScore(makeStats())
      const names = score.categories.map((c) => c.name)
      expect(names).toEqual([
        'coverage',
        'connectivity',
        'typing',
        'inference',
        'schema',
        'processes',
        'computation',
        'queries',
        'morphs'
      ])
    })
  })

  describe('coverage thresholds', () => {
    it.each([
      [0, 0],
      [4, 0],
      [5, 5],
      [9, 5],
      [10, 10],
      [19, 10],
      [20, 15],
      [29, 15],
      [30, 20],
      [100, 20]
    ])('%i nodes → %i points', (nodeCount, expected) => {
      const score = computeNodeBookScore(makeStats({ nodeCount }))
      expect(getCategory(score, 'coverage')!.earned).toBe(expected)
    })
  })

  describe('connectivity thresholds', () => {
    // avgDegree = 2 * edgeCount / nodeCount
    it.each([
      [10, 0, 0], // avg=0
      [10, 9, 0], // avg=1.8
      [10, 10, 5], // avg=2.0
      [10, 14, 5], // avg=2.8
      [10, 15, 10], // avg=3.0
      [10, 19, 10], // avg=3.8
      [10, 20, 15], // avg=4.0
      [10, 50, 15] // avg=10.0
    ])('%i nodes, %i edges → %i points', (nodeCount, edgeCount, expected) => {
      const score = computeNodeBookScore(makeStats({ nodeCount, edgeCount }))
      expect(getCategory(score, 'connectivity')!.earned).toBe(expected)
    })
  })

  describe('typing thresholds', () => {
    it.each([
      [10, 0, 0], // 0%
      [10, 4, 0], // 40%
      [10, 5, 5], // 50%
      [10, 7, 5], // 70%
      [20, 15, 10], // 75%
      [10, 9, 10], // 90%
      [10, 10, 15] // 100%
    ])('%i nodes, %i typed → %i points', (nodeCount, typedNodeCount, expected) => {
      const score = computeNodeBookScore(makeStats({ nodeCount, typedNodeCount }))
      expect(getCategory(score, 'typing')!.earned).toBe(expected)
    })
  })

  describe('inference thresholds', () => {
    it.each([
      [0, 0],
      [1, 0],
      [2, 3],
      [3, 6],
      [4, 10],
      [10, 10]
    ])('chain length %i → %i points', (maxInferenceChain, expected) => {
      const score = computeNodeBookScore(makeStats({ maxInferenceChain }))
      expect(getCategory(score, 'inference')!.earned).toBe(expected)
    })
  })

  describe('schema', () => {
    it('no schema → 0', () => {
      const score = computeNodeBookScore(makeStats())
      expect(getCategory(score, 'schema')!.earned).toBe(0)
    })

    it('has schema but does not validate → 5', () => {
      const score = computeNodeBookScore(makeStats({ hasSchema: true }))
      expect(getCategory(score, 'schema')!.earned).toBe(5)
    })

    it('schema validates → 10', () => {
      const score = computeNodeBookScore(makeStats({ schemaValidates: true }))
      expect(getCategory(score, 'schema')!.earned).toBe(10)
    })
  })

  describe('processes', () => {
    it('no transition → 0', () => {
      const score = computeNodeBookScore(makeStats())
      expect(getCategory(score, 'processes')!.earned).toBe(0)
    })

    it('has transition but not balanced → 5', () => {
      const score = computeNodeBookScore(makeStats({ hasTransition: true }))
      expect(getCategory(score, 'processes')!.earned).toBe(5)
    })

    it('balanced transition → 10', () => {
      const score = computeNodeBookScore(makeStats({ transitionBalanced: true }))
      expect(getCategory(score, 'processes')!.earned).toBe(10)
    })
  })

  describe('computation', () => {
    it('no computation → 0', () => {
      const score = computeNodeBookScore(makeStats())
      expect(getCategory(score, 'computation')!.earned).toBe(0)
    })

    it('has computation but not chained → 5', () => {
      const score = computeNodeBookScore(makeStats({ hasComputation: true }))
      expect(getCategory(score, 'computation')!.earned).toBe(5)
    })

    it('chained computation → 10', () => {
      const score = computeNodeBookScore(makeStats({ computationChained: true }))
      expect(getCategory(score, 'computation')!.earned).toBe(10)
    })
  })

  describe('queries', () => {
    it('no queries → 0', () => {
      const score = computeNodeBookScore(makeStats())
      expect(getCategory(score, 'queries')!.earned).toBe(0)
    })

    it('any queries → 5', () => {
      const score = computeNodeBookScore(makeStats({ queryCount: 1 }))
      expect(getCategory(score, 'queries')!.earned).toBe(5)
    })
  })

  describe('morphs', () => {
    it('no morphs → 0', () => {
      const score = computeNodeBookScore(makeStats())
      expect(getCategory(score, 'morphs')!.earned).toBe(0)
    })

    it('any morphs → 5', () => {
      const score = computeNodeBookScore(makeStats({ morphCount: 1 }))
      expect(getCategory(score, 'morphs')!.earned).toBe(5)
    })
  })

  describe('zero-node division safety', () => {
    it('handles 0 nodes without NaN in connectivity', () => {
      const score = computeNodeBookScore(makeStats({ nodeCount: 0, edgeCount: 5 }))
      expect(getCategory(score, 'connectivity')!.earned).not.toBeNaN()
    })

    it('handles 0 nodes without NaN in typing', () => {
      const score = computeNodeBookScore(makeStats({ nodeCount: 0, typedNodeCount: 0 }))
      expect(getCategory(score, 'typing')!.earned).not.toBeNaN()
    })
  })
})
