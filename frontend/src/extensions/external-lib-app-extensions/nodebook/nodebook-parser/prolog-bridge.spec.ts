/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { queryInferredRelations } from '@nodebook/core'
import type { CnlEdge, CnlGraphData, CnlNode, MergedSchemas } from '@nodebook/core'

function makeNode(id: string, role = 'individual'): CnlNode {
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

function makeEdge(id: string, source: string, target: string, name: string): CnlEdge {
  return { id, source_id: source, target_id: target, name, weight: 1, morph_ids: [] }
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

function schemasWith(relationTypes: MergedSchemas['relationTypes']): MergedSchemas {
  return { nodeTypes: [], attributeTypes: [], transitionTypes: [], functionTypes: [], relationTypes }
}

/** Dedup inferred relations into a set of "source->target" keys. */
function edgeKeys(inferred: Array<{ source: string; target: string; relation: string }>): Set<string> {
  return new Set(inferred.map((r) => `${r.source}->${r.target}`))
}

describe('queryInferredRelations (Prolog engine)', () => {
  it('terminates on a CYCLIC transitive relation and derives the closure (regression: dice hang)', async () => {
    // A>B>C>A under a transitive relation used to make tau-prolog recurse forever
    // (A>B>C>A>B>...) and exhaust memory, hanging the browser tab.
    const graph = makeGraph(
      [makeNode('a'), makeNode('b'), makeNode('c')],
      [
        makeEdge('e1', 'a', 'b', 'usually beats'),
        makeEdge('e2', 'b', 'c', 'usually beats'),
        makeEdge('e3', 'c', 'a', 'usually beats')
      ]
    )
    const schemas = schemasWith([
      { name: 'usually beats', description: '', domain: [], range: [], transitive: true }
    ])

    const inferred = await queryInferredRelations(graph, schemas)
    const keys = edgeKeys(inferred)

    // Closure of the cycle adds exactly the three "reverse" edges (each pair now
    // connected both ways) — the contradiction that proves the relation isn't transitive.
    expect(keys).toEqual(new Set(['a->c', 'b->a', 'c->b']))
    // and it must NOT re-report the explicit edges
    expect(keys.has('a->b')).toBe(false)
  }, 15000)

  it('derives the symmetric+transitive closure for the zeroth-law shape', async () => {
    // A and B both in equilibrium with the Thermometer => A and B in equilibrium.
    const graph = makeGraph(
      [makeNode('a'), makeNode('b'), makeNode('t')],
      [makeEdge('e1', 'a', 't', 'in thermal equilibrium with'), makeEdge('e2', 'b', 't', 'in thermal equilibrium with')]
    )
    const schemas = schemasWith([
      { name: 'in thermal equilibrium with', description: '', domain: [], range: [], transitive: true, symmetric: true }
    ])

    const keys = edgeKeys(await queryInferredRelations(graph, schemas))
    // the key derived fact: A and B are related, though only ever compared to T
    expect(keys.has('a->b')).toBe(true)
    expect(keys.has('b->a')).toBe(true)
  }, 15000)

  it('derives the transitive conclusion for an acyclic chain (syllogism)', async () => {
    const graph = makeGraph(
      [makeNode('socrates'), makeNode('human'), makeNode('mortal')],
      [makeEdge('e1', 'socrates', 'human', 'is_a'), makeEdge('e2', 'human', 'mortal', 'is_a')]
    )
    const schemas = schemasWith([{ name: 'is_a', description: '', domain: [], range: [], transitive: true }])

    const keys = edgeKeys(await queryInferredRelations(graph, schemas))
    expect(keys.has('socrates->mortal')).toBe(true)
  }, 15000)

  it('does not raise on a transitive-only graph (no symmetric/inverse facts defined)', async () => {
    // Guards against existence_error when symmetric/1 and inverse/2 are never asserted.
    const graph = makeGraph(
      [makeNode('a'), makeNode('b'), makeNode('c')],
      [makeEdge('e1', 'a', 'b', 'is_a'), makeEdge('e2', 'b', 'c', 'is_a')]
    )
    const schemas = schemasWith([{ name: 'is_a', description: '', domain: [], range: [], transitive: true }])

    await expect(queryInferredRelations(graph, schemas)).resolves.toBeDefined()
  }, 15000)
})
