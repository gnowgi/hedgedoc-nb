/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getOperationsFromCnl, operationsToGraph } from '@nodebook/core'
import type { CnlGraphData } from '@nodebook/core'
import { buildContainmentParentMap, buildCytoscapeElements, filterGraphForMorphs } from './elements'

function graphFromCnl(cnl: string): CnlGraphData {
  return operationsToGraph(getOperationsFromCnl(cnl))
}

const WATER = '# Water [Substance]\nboiling_point: 100 *C*;\n<part of> Ocean;'

describe('buildCytoscapeElements', () => {
  it('builds concept nodes with inline attributes under a divider (default)', () => {
    const elements = buildCytoscapeElements(graphFromCnl(WATER))
    const nodes = elements.filter((e) => e.group === 'nodes')
    const edges = elements.filter((e) => e.group === 'edges')

    const conceptIds = nodes.filter((n) => n.data.kind === 'concept').map((n) => n.data.id)
    expect(conceptIds).toEqual(expect.arrayContaining(['water', 'substance', 'ocean']))

    // attributes render inside the node box, HedgeDoc-style, not as leaves
    expect(nodes.some((n) => n.data.kind === 'attribute')).toBe(false)
    const water = nodes.find((n) => n.data.id === 'water')!
    const label = String(water.data.label)
    expect(label.startsWith('Water\n────────\n')).toBe(true)
    expect(label).toContain('boiling_point: 100')
    // unit in math-italic (C → 𝘊)
    expect(label).toContain('𝘊')

    const edgeLabels = edges.map((e) => e.data.label)
    expect(edgeLabels).toContain('is_a')
    expect(edgeLabels).toContain('part of')
  })

  it("renders attribute leaves in 'leaf' mode", () => {
    const elements = buildCytoscapeElements(graphFromCnl(WATER), { attributeDisplay: 'leaf' })
    const attributeNodes = elements.filter((e) => e.data.kind === 'attribute')
    expect(attributeNodes).toHaveLength(1)
    expect(attributeNodes[0].data.label).toBe('boiling_point: 100 C')
    expect(String(elements.find((e) => e.data.id === 'water')!.data.label)).toBe('Water')
  })

  it("omits attributes entirely in 'hidden' mode (showAttributes: false compat)", () => {
    for (const options of [{ attributeDisplay: 'hidden' as const }, { showAttributes: false }]) {
      const elements = buildCytoscapeElements(graphFromCnl(WATER), options)
      expect(elements.some((e) => e.data.kind === 'attribute')).toBe(false)
      expect(String(elements.find((e) => e.data.id === 'water')!.data.label)).toBe('Water')
    }
  })

  it('shows inherited attributes in italic with their source', () => {
    const cnl = ['# Dog [Animal]', '', '# Animal [Creature]', 'legs: 4;'].join('\n')
    const elements = buildCytoscapeElements(graphFromCnl(cnl))
    const dog = elements.find((e) => e.data.id === 'dog')!
    const label = String(dog.data.label)
    // inherited "legs: 4 (from Animal)" rendered in math-italic
    expect(label).toContain('𝘭𝘦𝘨𝘴')
    expect(label).toContain('𝘧𝘳𝘰𝘮')
  })

  it('marks negated relations and prefixes their label', () => {
    const elements = buildCytoscapeElements(graphFromCnl('# Whale [Mammal]\n!<has> Gills;'))
    const negated = elements.find((e) => e.data.kind === 'negated-relation')
    expect(negated).toBeDefined()
    expect(String(negated!.data.label)).toMatch(/^¬ /)
  })

  it('shows the relation weight when it differs from 1', () => {
    const elements = buildCytoscapeElements(graphFromCnl('# Reaction [Event]\n<inflow> 6 CO2;'))
    const weighted = elements.find((e) => typeof e.data.label === 'string' && e.data.label.includes('×6'))
    expect(weighted).toBeDefined()
  })

  it('drops edges whose endpoints are not in the graph', () => {
    const graph = graphFromCnl(WATER)
    const broken: CnlGraphData = {
      ...graph,
      edges: [...graph.edges, { id: 'ghost', source_id: 'water', target_id: 'nowhere', name: 'x', weight: 1, morph_ids: [] }]
    }
    const elements = buildCytoscapeElements(broken)
    expect(elements.some((e) => e.data.id === 'ghost')).toBe(false)
  })
})

describe('filterGraphForMorphs', () => {
  const MORPHIC = ['# Water [Substance]', 'state: liquid;', '', '## frozen', '    state: solid;', '    <part of> Glacier;'].join('\n')

  it('uses each node default neighborhood when no selection is given', () => {
    const graph = graphFromCnl(MORPHIC)
    const filtered = filterGraphForMorphs(graph)
    const values = filtered.attributes.map((a) => a.value)
    expect(values).toContain('liquid')
    expect(values).not.toContain('solid')
  })

  it('switches to the selected morph members', () => {
    const graph = graphFromCnl(MORPHIC)
    const water = graph.nodes.find((n) => n.id === 'water')!
    const frozen = water.morphs.find((m) => m.name === 'frozen')!
    const filtered = filterGraphForMorphs(graph, { water: frozen.morph_id })

    const values = filtered.attributes.map((a) => a.value)
    expect(values).toContain('solid')
    expect(values).not.toContain('liquid')
    expect(filtered.nodes.find((n) => n.id === 'water')!.nbh).toBe(frozen.morph_id)
  })
})

describe('containment view', () => {
  const CHAIN = '# Dog [Animal]\nlegs: 4;\n<likes> Bone;\n\n# Animal [Creature]'

  it('buildContainmentParentMap nests along is_a and avoids cycles', () => {
    const graph = graphFromCnl(CHAIN)
    const parents = buildContainmentParentMap(graph.edges)
    expect(parents.get('dog')).toBe('animal')
    expect(parents.get('animal')).toBe('creature')

    const cyclic = buildContainmentParentMap([
      { source_id: 'a', target_id: 'b', name: 'is_a' },
      { source_id: 'b', target_id: 'a', name: 'is_a' }
    ])
    // one direction wins, the reverse is skipped as a cycle
    expect(cyclic.size).toBe(1)
  })

  it('nests nodes, drops containment arrows, keeps other relations', () => {
    const graph = graphFromCnl(CHAIN)
    const elements = buildCytoscapeElements(graph, { containment: true })

    const dog = elements.find((e) => e.data.id === 'dog')!
    expect(dog.data.parent).toBe('animal')
    const animal = elements.find((e) => e.data.id === 'animal')!
    expect(animal.data.parent).toBe('creature')

    const edgeLabels = elements.filter((e) => e.group === 'edges').map((e) => e.data.label)
    expect(edgeLabels).not.toContain('is_a')
    expect(edgeLabels).toContain('likes')

    // inline attributes ride along inside the node label
    expect(String(dog.data.label)).toContain('legs: 4')
  })

  it('uses inferred containment edges to deepen nesting', () => {
    const graph = graphFromCnl('# Rex\n\n# Dog [Animal]')
    // no explicit parent for rex; give it an inferred member_of
    const inferred = [
      {
        id: 'inf_1', source_id: 'rex', target_id: 'dog', name: 'member_of', weight: 1, morph_ids: [],
        proofPath: [], inferenceRule: 'membership_inheritance'
      }
    ]
    const elements = buildCytoscapeElements(graph, { containment: true, inferredEdges: inferred })
    expect(elements.find((e) => e.data.id === 'rex')!.data.parent).toBe('dog')
  })
})

describe('process mode edges', () => {
  const BURN = ['# Burn [Transition]', '<has prior_state> 2 Fuel;', '<has prior_state> Oxygen;', '<has post_state> 2 Smoke;'].join('\n')

  it('reverses input arcs and uses circled weight labels only', () => {
    const elements = buildCytoscapeElements(graphFromCnl(BURN), { processMode: true })
    const edges = elements.filter((e) => e.group === 'edges')

    const fuelArc = edges.find((e) => e.data.kind === 'process-input' && e.data.source === 'fuel')!
    expect(fuelArc.data.target).toBe('burn')
    expect(fuelArc.data.label).toBe('②')

    const oxygenArc = edges.find((e) => e.data.kind === 'process-input' && e.data.source === 'oxygen')!
    expect(oxygenArc.data.label).toBe('')

    const smokeArc = edges.find((e) => e.data.kind === 'process-output')!
    expect(smokeArc.data.source).toBe('burn')
    expect(smokeArc.data.target).toBe('smoke')
    expect(smokeArc.data.label).toBe('②')

    expect(edges.some((e) => String(e.data.label).includes('prior_state'))).toBe(false)
  })

  it('keeps the verbose arrows when processMode is off', () => {
    const elements = buildCytoscapeElements(graphFromCnl(BURN), { processMode: false })
    const labels = elements.filter((e) => e.group === 'edges').map((e) => e.data.label)
    expect(labels).toContain('has prior_state ×2')
  })
})

describe('petri Inputs/Outputs grouping', () => {
  const BURN = ['# Burn [Transition]', '<has prior_state> 2 Fuel;', '<has prior_state> Oxygen;', '<has post_state> 2 Smoke;'].join('\n')

  it('groups pure-input and pure-output places into dashed boxes', () => {
    const elements = buildCytoscapeElements(graphFromCnl(BURN), { processMode: true })
    const byId = new Map(elements.map((e) => [e.data.id, e]))

    expect(byId.get('__nb_inputs__')!.data.label).toBe('Inputs')
    expect(byId.get('__nb_outputs__')!.data.label).toBe('Outputs')
    expect(byId.get('__nb_inputs__')!.data.kind).toBe('group')

    expect(byId.get('fuel')!.data.parent).toBe('__nb_inputs__')
    expect(byId.get('oxygen')!.data.parent).toBe('__nb_inputs__')
    expect(byId.get('smoke')!.data.parent).toBe('__nb_outputs__')
    expect(byId.get('burn')!.data.parent).toBeUndefined()
  })

  it('leaves intermediate places (both consumed and produced) ungrouped', () => {
    const cnl = [
      '# Step1 [Transition]', '<has prior_state> A;', '<has post_state> B;', '',
      '# Step2 [Transition]', '<has prior_state> B;', '<has post_state> C;'
    ].join('\n')
    const elements = buildCytoscapeElements(graphFromCnl(cnl), { processMode: true })
    const byId = new Map(elements.map((e) => [e.data.id, e]))
    expect(byId.get('a')!.data.parent).toBe('__nb_inputs__')
    expect(byId.get('b')!.data.parent).toBeUndefined()
    expect(byId.get('c')!.data.parent).toBe('__nb_outputs__')
  })

  it('skips grouping when containment view is active', () => {
    const elements = buildCytoscapeElements(graphFromCnl(BURN), { processMode: true, containment: true })
    expect(elements.some((e) => e.data.kind === 'group')).toBe(false)
  })

  it('adds no group boxes outside process mode', () => {
    const elements = buildCytoscapeElements(graphFromCnl(BURN), { processMode: false })
    expect(elements.some((e) => e.data.kind === 'group')).toBe(false)
  })
})
