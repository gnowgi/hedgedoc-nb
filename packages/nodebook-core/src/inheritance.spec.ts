/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getInheritedAttributes, operationsToGraph, getOperationsFromCnl } from '@nodebook/core'
import type { CnlGraphData } from '@nodebook/core'

/** Build a graph straight from CNL for end-to-end inheritance assertions. */
function graphFromCnl(cnl: string) {
  return operationsToGraph(getOperationsFromCnl(cnl))
}

/**
 * Restrict a graph to each node's active morph — the same filtering the graph
 * component applies before computing inheritance. `active` overrides the active
 * morph (by name) for the given node ids; other nodes keep their default nbh.
 */
function scopeToMorphs(graph: CnlGraphData, active: Record<string, string>): CnlGraphData {
  const edges: CnlGraphData['edges'] = []
  const attributes: CnlGraphData['attributes'] = []
  for (const node of graph.nodes) {
    const wantName = active[node.id]
    const morph = wantName ? node.morphs.find((m) => m.name === wantName) : node.morphs.find((m) => m.morph_id === node.nbh)
    if (!morph) continue
    for (const relId of morph.relationNode_ids) {
      const e = graph.edges.find((x) => x.id === relId)
      if (e) edges.push(e)
    }
    for (const attrId of morph.attributeNode_ids) {
      const a = graph.attributes.find((x) => x.id === attrId)
      if (a) attributes.push(a)
    }
  }
  return { ...graph, edges, attributes }
}

describe('getInheritedAttributes — negation', () => {
  it('inherits a positive attribute down an is_a chain', () => {
    const graph = graphFromCnl('# Dog [class]\n<is_a> Mammal;\n\n# Mammal [class]\nwarm_blooded: true;')
    const inherited = getInheritedAttributes('dog', graph)
    expect(inherited.map((a) => a.name)).toContain('warm_blooded')
  })

  it('does not inherit a parent attribute across a negated is_a edge', () => {
    const graph = graphFromCnl('# Penguin [class]\n!<is_a> Flyer;\n\n# Flyer [class]\ncan_fly: true;')
    const inherited = getInheritedAttributes('penguin', graph)
    expect(inherited.map((a) => a.name)).not.toContain('can_fly')
  })

  it('does not inherit a parent’s negated attribute as a positive value', () => {
    const graph = graphFromCnl('# Dog [class]\n<is_a> Mammal;\n\n# Mammal [class]\n!lays_eggs: true;')
    const inherited = getInheritedAttributes('dog', graph)
    expect(inherited.map((a) => a.name)).not.toContain('lays_eggs')
  })

  it('a node’s own negated attribute does not block inheriting a positive one of the same name', () => {
    // Snake says "not color green"; its parent says "color brown" — brown should still inherit.
    const graph = graphFromCnl('# Snake [class]\n!color: green;\n<is_a> Reptile;\n\n# Reptile [class]\ncolor: brown;')
    const inherited = getInheritedAttributes('snake', graph)
    const color = inherited.find((a) => a.name === 'color')
    expect(color).toBeDefined()
    expect(color!.value).toBe('brown')
  })
})

describe('getInheritedAttributes — morph scoping', () => {
  // Whale is polymorphic: "as fish" <is_a> Fish, "as mammal" <is_a> Mammal.
  // Inheritance must follow only the ACTIVE morph's is_a edge — not both at once.
  const WHALE = [
    '# Fish [Animal]',
    'breathes: water;',
    '!gives: milk;',
    '# Mammal [Animal]',
    'breathes: air;',
    'gives: milk;',
    '# Whale [Animal]',
    '## as fish',
    '    <is_a> Fish;',
    '## as mammal',
    '    <is_a> Mammal;'
  ].join('\n')

  it('inherits from Fish only when the "as fish" morph is active', () => {
    const graph = scopeToMorphs(graphFromCnl(WHALE), { whale: 'as fish' })
    const inherited = getInheritedAttributes('whale', graph)
    const breathes = inherited.find((a) => a.name === 'breathes')
    expect(breathes?.value).toBe('water')
    expect(breathes?.inheritedFrom).toBe('Fish')
    // Fish says "!gives: milk" (negated) — must not inherit it as a positive value.
    expect(inherited.map((a) => a.name)).not.toContain('gives')
  })

  it('inherits from Mammal only when the "as mammal" morph is active', () => {
    const graph = scopeToMorphs(graphFromCnl(WHALE), { whale: 'as mammal' })
    const inherited = getInheritedAttributes('whale', graph)
    const breathes = inherited.find((a) => a.name === 'breathes')
    expect(breathes?.value).toBe('air')
    expect(breathes?.inheritedFrom).toBe('Mammal')
    expect(inherited.find((a) => a.name === 'gives')?.value).toBe('milk')
  })

  it('regression: unscoped graph wrongly mixes both morphs (guards the fix)', () => {
    // Passing the FULL graph (pre-fix behaviour) inherits from Fish and Mammal at
    // once — the exact bug. This documents why the component must pass morph-scoped data.
    const inherited = getInheritedAttributes('whale', graphFromCnl(WHALE))
    const froms = new Set(inherited.map((a) => a.inheritedFrom))
    expect(froms.has('Fish')).toBe(true)
    expect(froms.has('Mammal')).toBe(true)
  })
})
