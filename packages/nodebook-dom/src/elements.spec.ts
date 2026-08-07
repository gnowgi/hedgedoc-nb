/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getOperationsFromCnl, operationsToGraph } from '@nodebook/core'
import type { CnlGraphData } from '@nodebook/core'
import { buildCytoscapeElements, filterGraphForMorphs } from './elements'

function graphFromCnl(cnl: string): CnlGraphData {
  return operationsToGraph(getOperationsFromCnl(cnl))
}

const WATER = '# Water [Substance]\nboiling_point: 100 *C*;\n<part of> Ocean;'

describe('buildCytoscapeElements', () => {
  it('builds concept nodes, relation edges, and attribute leaves', () => {
    const elements = buildCytoscapeElements(graphFromCnl(WATER))
    const nodes = elements.filter((e) => e.group === 'nodes')
    const edges = elements.filter((e) => e.group === 'edges')

    const conceptIds = nodes.filter((n) => n.data.kind === 'concept').map((n) => n.data.id)
    expect(conceptIds).toEqual(expect.arrayContaining(['water', 'substance', 'ocean']))

    const attributeNodes = nodes.filter((n) => n.data.kind === 'attribute')
    expect(attributeNodes).toHaveLength(1)
    expect(attributeNodes[0].data.label).toBe('boiling_point: 100 C')

    const edgeLabels = edges.map((e) => e.data.label)
    expect(edgeLabels).toContain('is_a')
    expect(edgeLabels).toContain('part of')
  })

  it('omits attribute leaves when showAttributes is false', () => {
    const elements = buildCytoscapeElements(graphFromCnl(WATER), { showAttributes: false })
    expect(elements.some((e) => e.data.kind === 'attribute')).toBe(false)
    expect(elements.some((e) => e.data.kind === 'attribute-edge')).toBe(false)
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
