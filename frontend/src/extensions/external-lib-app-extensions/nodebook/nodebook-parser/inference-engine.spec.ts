/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { TransitiveClosureEngine } from './inference-engine'
import type { CnlGraphData, CnlEdge, CnlNode } from './types'
import type { MergedSchemas } from './schema-store'

function makeNode(id: string, role = 'class'): CnlNode {
  return {
    id,
    base_name: id,
    name: id,
    adjective: null,
    quantifier: null,
    role,
    description: null,
    parent_types: [],
    morphs: [{ morph_id: `${id}_basic`, node_id: id, name: 'basic', relationNode_ids: [], attributeNode_ids: [] }],
    nbh: `${id}_basic`
  }
}

function makeEdge(id: string, source: string, target: string, name: string, weight = 1): CnlEdge {
  return { id, source_id: source, target_id: target, name, weight, morph_ids: [] }
}

function makeGraph(nodes: CnlNode[], edges: CnlEdge[]): CnlGraphData {
  return {
    nodes,
    edges,
    attributes: [],
    abbreviations: {},
    expressions: [],
    queries: [],
    description: null,
    currency: null,
    errors: []
  }
}

/** Minimal schemas with is_a as transitive. */
function makeSchemas(extra: { relationTypes?: MergedSchemas['relationTypes'] } = {}): MergedSchemas {
  return {
    nodeTypes: [],
    attributeTypes: [],
    transitionTypes: [],
    functionTypes: [],
    relationTypes: extra.relationTypes ?? [
      { name: 'is_a', description: '', domain: [], range: [], transitive: true, aliases: ['is a'] },
      { name: 'member_of', description: '', domain: [], range: [], transitive: false },
      { name: 'instance_of', description: '', domain: [], range: [], transitive: false },
      { name: 'part_of', description: '', domain: [], range: [], transitive: true }
    ]
  }
}

describe('TransitiveClosureEngine', () => {
  let engine: TransitiveClosureEngine

  beforeEach(() => {
    engine = new TransitiveClosureEngine()
  })

  describe('no transitive relations', () => {
    it('returns no inferred edges when no relations are transitive', () => {
      const schemas = makeSchemas({ relationTypes: [{ name: 'likes', description: '', domain: [], range: [] }] })
      const graph = makeGraph(
        [makeNode('a'), makeNode('b'), makeNode('c')],
        [makeEdge('e1', 'a', 'b', 'likes'), makeEdge('e2', 'b', 'c', 'likes')]
      )
      const result = engine.infer(graph, schemas)
      expect(result.inferredEdges).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('simple transitive chain', () => {
    it('infers A→C from A→B and B→C via is_a', () => {
      const graph = makeGraph(
        [makeNode('a'), makeNode('b'), makeNode('c')],
        [makeEdge('e1', 'a', 'b', 'is_a'), makeEdge('e2', 'b', 'c', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      expect(result.inferredEdges).toHaveLength(1)
      expect(result.inferredEdges[0].source_id).toBe('a')
      expect(result.inferredEdges[0].target_id).toBe('c')
      expect(result.inferredEdges[0].name).toBe('is_a')
      expect(result.inferredEdges[0].inferenceRule).toBe('transitive_closure')
    })
  })

  describe('longer chain', () => {
    it('infers all transitive edges for A→B→C→D', () => {
      const graph = makeGraph(
        [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')],
        [makeEdge('e1', 'a', 'b', 'is_a'), makeEdge('e2', 'b', 'c', 'is_a'), makeEdge('e3', 'c', 'd', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      // Expected: a→c, a→d, b→d
      expect(result.inferredEdges).toHaveLength(3)
      const keys = result.inferredEdges.map((e) => `${e.source_id}→${e.target_id}`)
      expect(keys).toContain('a→c')
      expect(keys).toContain('a→d')
      expect(keys).toContain('b→d')
    })
  })

  describe('cycle prevention', () => {
    it('does not infinitely loop on A→B→C→A', () => {
      const graph = makeGraph(
        [makeNode('a'), makeNode('b'), makeNode('c')],
        [makeEdge('e1', 'a', 'b', 'is_a'), makeEdge('e2', 'b', 'c', 'is_a'), makeEdge('e3', 'c', 'a', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      // Should complete without hanging; inferred edges should exist but be finite
      expect(result.inferredEdges.length).toBeGreaterThanOrEqual(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('self-loop skip', () => {
    it('does not infer from self-loops', () => {
      const graph = makeGraph(
        [makeNode('a'), makeNode('b')],
        [makeEdge('e1', 'a', 'a', 'is_a'), makeEdge('e2', 'a', 'b', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      // Self-loop a→a should be skipped, only inferred from a→b
      const selfLoops = result.inferredEdges.filter((e) => e.source_id === e.target_id)
      expect(selfLoops).toHaveLength(0)
    })
  })

  describe('explicit edge not duplicated', () => {
    it('does not create inferred edge that already exists explicitly', () => {
      const graph = makeGraph(
        [makeNode('a'), makeNode('b'), makeNode('c')],
        [
          makeEdge('e1', 'a', 'b', 'is_a'),
          makeEdge('e2', 'b', 'c', 'is_a'),
          makeEdge('e3', 'a', 'c', 'is_a') // explicit shortcut
        ]
      )
      const result = engine.infer(graph, makeSchemas())
      // a→c already exists explicitly, so should not be inferred
      const acEdges = result.inferredEdges.filter((e) => e.source_id === 'a' && e.target_id === 'c')
      expect(acEdges).toHaveLength(0)
    })
  })

  describe('member_of inheritance', () => {
    it('infers member_of(X,B) from member_of(X,A) + is_a(A,B)', () => {
      const graph = makeGraph(
        [makeNode('socrates', 'individual'), makeNode('greek'), makeNode('human')],
        [makeEdge('e1', 'socrates', 'greek', 'member_of'), makeEdge('e2', 'greek', 'human', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      const memberEdges = result.inferredEdges.filter((e) => e.name === 'member_of')
      expect(memberEdges).toHaveLength(1)
      expect(memberEdges[0].source_id).toBe('socrates')
      expect(memberEdges[0].target_id).toBe('human')
      expect(memberEdges[0].inferenceRule).toBe('membership_inheritance')
    })

    it('follows multi-step is_a chain for member_of', () => {
      const graph = makeGraph(
        [makeNode('socrates', 'individual'), makeNode('greek'), makeNode('human'), makeNode('mortal')],
        [
          makeEdge('e1', 'socrates', 'greek', 'member_of'),
          makeEdge('e2', 'greek', 'human', 'is_a'),
          makeEdge('e3', 'human', 'mortal', 'is_a')
        ]
      )
      const result = engine.infer(graph, makeSchemas())
      const memberEdges = result.inferredEdges.filter((e) => e.name === 'member_of')
      // socrates→human, socrates→mortal
      expect(memberEdges).toHaveLength(2)
      const targets = memberEdges.map((e) => e.target_id).sort()
      expect(targets).toEqual(['human', 'mortal'])
    })
  })

  describe('instance_of inheritance', () => {
    it('infers instance_of(X,B) from instance_of(X,A) + is_a(A,B)', () => {
      const graph = makeGraph(
        [makeNode('earth', 'individual'), makeNode('planet'), makeNode('celestial_body')],
        [makeEdge('e1', 'earth', 'planet', 'instance_of'), makeEdge('e2', 'planet', 'celestial_body', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      const instanceEdges = result.inferredEdges.filter((e) => e.name === 'instance_of')
      expect(instanceEdges).toHaveLength(1)
      expect(instanceEdges[0].source_id).toBe('earth')
      expect(instanceEdges[0].target_id).toBe('celestial_body')
      expect(instanceEdges[0].inferenceRule).toBe('membership_inheritance')
    })
  })

  describe('proof paths', () => {
    it('includes proof path with edge IDs for transitive closure', () => {
      const graph = makeGraph(
        [makeNode('a'), makeNode('b'), makeNode('c')],
        [makeEdge('e1', 'a', 'b', 'is_a'), makeEdge('e2', 'b', 'c', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      expect(result.inferredEdges[0].proofPath).toEqual(['e1', 'e2'])
    })

    it('includes proof path for membership inheritance', () => {
      const graph = makeGraph(
        [makeNode('x', 'individual'), makeNode('a'), makeNode('b')],
        [makeEdge('e1', 'x', 'a', 'member_of'), makeEdge('e2', 'a', 'b', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      const memberEdge = result.inferredEdges.find((e) => e.name === 'member_of')
      expect(memberEdge).toBeDefined()
      expect(memberEdge!.proofPath).toEqual(['e1', 'e2'])
    })
  })

  describe('alias resolution', () => {
    it('treats "is a" (alias) same as "is_a" for transitive closure', () => {
      const graph = makeGraph(
        [makeNode('a'), makeNode('b'), makeNode('c')],
        [makeEdge('e1', 'a', 'b', 'is a'), makeEdge('e2', 'b', 'c', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      // Both should be treated as is_a; a→c should be inferred
      expect(result.inferredEdges.length).toBeGreaterThanOrEqual(1)
      const acEdge = result.inferredEdges.find((e) => e.source_id === 'a' && e.target_id === 'c')
      expect(acEdge).toBeDefined()
    })
  })

  describe('multiple transitive relations', () => {
    it('handles part_of transitivity independently from is_a', () => {
      const graph = makeGraph(
        [makeNode('wheel'), makeNode('car'), makeNode('fleet')],
        [makeEdge('e1', 'wheel', 'car', 'part_of'), makeEdge('e2', 'car', 'fleet', 'part_of')]
      )
      const result = engine.infer(graph, makeSchemas())
      const partOfEdges = result.inferredEdges.filter((e) => e.name === 'part_of')
      expect(partOfEdges).toHaveLength(1)
      expect(partOfEdges[0].source_id).toBe('wheel')
      expect(partOfEdges[0].target_id).toBe('fleet')
    })
  })

  describe('empty graph', () => {
    it('returns no inferred edges for empty graph', () => {
      const graph = makeGraph([], [])
      const result = engine.infer(graph, makeSchemas())
      expect(result.inferredEdges).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('deterministic IDs', () => {
    it('inferred edges have IDs prefixed with "inferred_"', () => {
      const graph = makeGraph(
        [makeNode('a'), makeNode('b'), makeNode('c')],
        [makeEdge('e1', 'a', 'b', 'is_a'), makeEdge('e2', 'b', 'c', 'is_a')]
      )
      const result = engine.infer(graph, makeSchemas())
      for (const edge of result.inferredEdges) {
        expect(edge.id).toMatch(/^inferred_/)
      }
    })
  })
})
