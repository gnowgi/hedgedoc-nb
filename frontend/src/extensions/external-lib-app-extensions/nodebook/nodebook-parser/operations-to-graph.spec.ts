/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { operationsToGraph } from './operations-to-graph'
import { getOperationsFromCnl } from './cnl-parser'
import type { CnlOperation } from './types'

/** Helper to create addNode operations. */
function addNodeOp(
  id: string,
  baseName: string,
  role = 'class',
  adjective: string | null = null,
  quantifier: string | null = null
): CnlOperation {
  return {
    type: 'addNode',
    payload: {
      base_name: baseName,
      displayName: adjective ? `${adjective} ${baseName}` : baseName,
      options: { id, role, parent_types: [], adjective, quantifier }
    },
    id
  }
}

/** Helper to create addMorph operations. */
function addMorphOp(nodeId: string, morphId: string, morphName: string): CnlOperation {
  return {
    type: 'addMorph',
    payload: {
      nodeId,
      morph: { morph_id: morphId, node_id: nodeId, name: morphName, relationNode_ids: [], attributeNode_ids: [] }
    },
    id: `${nodeId}_morph_${morphName}`
  }
}

/** Helper to create addRelation operations. */
function addRelationOp(
  id: string,
  source: string,
  target: string,
  name: string,
  weight = 1,
  morphId?: string
): CnlOperation {
  const payload: Record<string, unknown> = { source, target, name, weight }
  if (morphId) payload.morphId = morphId
  return { type: 'addRelation', payload, id }
}

/** Helper to create addAttribute operations. */
function addAttributeOp(
  id: string,
  source: string,
  name: string,
  value: string,
  extra: Record<string, unknown> = {}
): CnlOperation {
  return { type: 'addAttribute', payload: { source, name, value, ...extra }, id }
}

describe('operationsToGraph — query handling', () => {
  it('passes displayString from addQuery operations to CnlQuery output', () => {
    const ops: CnlOperation[] = [
      {
        type: 'addQuery',
        payload: {
          id: 'query_1',
          goalString: "relation('socrates', X, 'member_of')",
          displayString: '<member_of> what;'
        },
        id: 'query_1'
      }
    ]

    const graph = operationsToGraph(ops)
    expect(graph.queries).toHaveLength(1)
    expect(graph.queries[0].goalString).toBe("relation('socrates', X, 'member_of')")
    expect(graph.queries[0].displayString).toBe('<member_of> what;')
  })

  it('queries without displayString still work', () => {
    const ops: CnlOperation[] = [
      {
        type: 'addQuery',
        payload: {
          id: 'query_2',
          goalString: 'relation(socrates, X, member_of)',
          line: 5
        },
        id: 'query_2'
      }
    ]

    const graph = operationsToGraph(ops)
    expect(graph.queries).toHaveLength(1)
    expect(graph.queries[0].goalString).toBe('relation(socrates, X, member_of)')
    expect(graph.queries[0].displayString).toBeUndefined()
    expect(graph.queries[0].line).toBe(5)
  })
})

describe('operationsToGraph — Pass 1: Node creation', () => {
  it('creates a node with all fields', () => {
    const ops = [addNodeOp('alice', 'Alice', 'individual', 'tall', 'one')]
    const graph = operationsToGraph(ops)
    expect(graph.nodes).toHaveLength(1)
    const node = graph.nodes[0]
    expect(node.id).toBe('alice')
    expect(node.base_name).toBe('Alice')
    expect(node.name).toBe('tall Alice')
    expect(node.adjective).toBe('tall')
    expect(node.quantifier).toBe('one')
    expect(node.role).toBe('individual')
    expect(node.description).toBeNull()
    expect(node.parent_types).toEqual([])
  })

  it('skips duplicate node IDs (first wins)', () => {
    const ops = [addNodeOp('human', 'Human', 'class'), addNodeOp('human', 'Humans', 'individual')]
    const graph = operationsToGraph(ops)
    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0].role).toBe('class') // first addNode wins
  })

  it('auto-creates basic morph for each node', () => {
    const ops = [addNodeOp('a', 'A')]
    const graph = operationsToGraph(ops)
    expect(graph.nodes[0].morphs).toHaveLength(1)
    expect(graph.nodes[0].morphs[0].name).toBe('basic')
    expect(graph.nodes[0].nbh).toBe(graph.nodes[0].morphs[0].morph_id)
  })

  it('defaults role to individual when unset', () => {
    const op: CnlOperation = {
      type: 'addNode',
      payload: { base_name: 'X' },
      id: 'x'
    }
    const graph = operationsToGraph([op])
    expect(graph.nodes[0].role).toBe('individual')
  })

  it('prefers options.role over payload.role', () => {
    const op: CnlOperation = {
      type: 'addNode',
      payload: { base_name: 'X', role: 'class', options: { role: 'Event' } },
      id: 'x'
    }
    const graph = operationsToGraph([op])
    expect(graph.nodes[0].role).toBe('Event')
  })
})

describe('operationsToGraph — Pass 2: Morph operations', () => {
  it('appends additional morphs to existing node', () => {
    const ops = [addNodeOp('water', 'Water'), addMorphOp('water', 'water_heated', 'heated')]
    const graph = operationsToGraph(ops)
    expect(graph.nodes[0].morphs).toHaveLength(2)
    expect(graph.nodes[0].morphs[1].name).toBe('heated')
    expect(graph.nodes[0].morphs[1].morph_id).toBe('water_heated')
  })

  it('skips morph if target node does not exist', () => {
    const ops: CnlOperation[] = [addMorphOp('nonexistent', 'ne_morph', 'heated')]
    const graph = operationsToGraph(ops)
    expect(graph.nodes).toHaveLength(0)
  })

  it('morph copies relationNode_ids and attributeNode_ids', () => {
    const ops = [addNodeOp('a', 'A'), addMorphOp('a', 'a_m', 'custom')]
    const graph = operationsToGraph(ops)
    const morph = graph.nodes[0].morphs[1]
    expect(morph.relationNode_ids).toEqual([])
    expect(morph.attributeNode_ids).toEqual([])
  })
})

describe('operationsToGraph — Pass 3: Relations', () => {
  it('creates edge and links to basic morph when no morphId', () => {
    const ops = [addNodeOp('a', 'A'), addNodeOp('b', 'B'), addRelationOp('r1', 'a', 'b', 'is_a')]
    const graph = operationsToGraph(ops)
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].source_id).toBe('a')
    expect(graph.edges[0].target_id).toBe('b')
    expect(graph.edges[0].name).toBe('is_a')
    expect(graph.edges[0].weight).toBe(1)
    // linked to basic morph
    expect(graph.edges[0].morph_ids).toHaveLength(1)
    expect(graph.nodes[0].morphs[0].relationNode_ids).toContain('r1')
  })

  it('links relation to specific morph when morphId is provided', () => {
    const ops = [
      addNodeOp('a', 'A'),
      addMorphOp('a', 'a_heated', 'heated'),
      addNodeOp('b', 'B'),
      addRelationOp('r1', 'a', 'b', 'flows_to', 1, 'a_heated')
    ]
    const graph = operationsToGraph(ops)
    expect(graph.edges[0].morph_ids).toContain('a_heated')
    const heatedMorph = graph.nodes[0].morphs.find((m) => m.morph_id === 'a_heated')!
    expect(heatedMorph.relationNode_ids).toContain('r1')
  })

  it('uses default weight of 1 when not specified', () => {
    const ops = [addNodeOp('a', 'A'), addNodeOp('b', 'B')]
    const relOp: CnlOperation = { type: 'addRelation', payload: { source: 'a', target: 'b', name: 'r' }, id: 'r1' }
    const graph = operationsToGraph([...ops, relOp])
    expect(graph.edges[0].weight).toBe(1)
  })
})

describe('operationsToGraph — Pass 3: Attributes', () => {
  it('creates attribute and links to basic morph when no morphId', () => {
    const ops = [addNodeOp('a', 'A'), addAttributeOp('a1', 'a', 'mass', '70')]
    const graph = operationsToGraph(ops)
    expect(graph.attributes).toHaveLength(1)
    expect(graph.attributes[0].name).toBe('mass')
    expect(graph.attributes[0].value).toBe('70')
    expect(graph.attributes[0].morph_ids).toHaveLength(1)
    expect(graph.nodes[0].morphs[0].attributeNode_ids).toContain('a1')
  })

  it('links attribute to specific morph when morphId is provided', () => {
    const ops = [
      addNodeOp('a', 'A'),
      addMorphOp('a', 'a_hot', 'hot'),
      addAttributeOp('a1', 'a', 'temp', '100', { morphId: 'a_hot' })
    ]
    const graph = operationsToGraph(ops)
    expect(graph.attributes[0].morph_ids).toContain('a_hot')
    const hotMorph = graph.nodes[0].morphs.find((m) => m.morph_id === 'a_hot')!
    expect(hotMorph.attributeNode_ids).toContain('a1')
  })

  it('populates abbreviations map', () => {
    const ops = [addNodeOp('a', 'A'), addAttributeOp('a1', 'a', 'mass', '70', { abbreviation: 'm' })]
    const graph = operationsToGraph(ops)
    expect(graph.abbreviations).toEqual({ m: { fullName: 'mass', nodeId: 'a' } })
  })

  it('optional fields default to null', () => {
    const ops = [addNodeOp('a', 'A'), addAttributeOp('a1', 'a', 'color', 'red')]
    const graph = operationsToGraph(ops)
    const attr = graph.attributes[0]
    expect(attr.unit).toBeNull()
    expect(attr.adverb).toBeNull()
    expect(attr.modality).toBeNull()
    expect(attr.quantifier).toBeNull()
  })
})

describe('operationsToGraph — Pass 3: updateNode', () => {
  it('updates node description', () => {
    const ops: CnlOperation[] = [
      addNodeOp('a', 'A'),
      { type: 'updateNode', payload: { id: 'a', fields: { description: 'Hello world' } }, id: 'a_desc' }
    ]
    const graph = operationsToGraph(ops)
    expect(graph.nodes[0].description).toBe('Hello world')
  })

  it('ignores updateNode for non-existent node', () => {
    const ops: CnlOperation[] = [
      { type: 'updateNode', payload: { id: 'missing', fields: { description: 'x' } }, id: 'missing_desc' }
    ]
    const graph = operationsToGraph(ops)
    expect(graph.nodes).toHaveLength(0)
  })
})

describe('operationsToGraph — Pass 3: updateGraphDescription', () => {
  it('sets graph-level description', () => {
    const ops: CnlOperation[] = [{ type: 'updateGraphDescription', payload: { description: 'My graph' }, id: 'gd' }]
    const graph = operationsToGraph(ops)
    expect(graph.description).toBe('My graph')
  })
})

describe('operationsToGraph — Pass 3: setCurrency', () => {
  it('sets graph-level currency', () => {
    const ops: CnlOperation[] = [{ type: 'setCurrency', payload: { currency: 'USD' }, id: 'gc' }]
    const graph = operationsToGraph(ops)
    expect(graph.currency).toBe('USD')
  })
})

describe('operationsToGraph — Pass 3: addExpression', () => {
  it('adds expression to expressions array', () => {
    const ops: CnlOperation[] = [{ type: 'addExpression', payload: { expression: 'a + b' }, id: 'eq_1' }]
    const graph = operationsToGraph(ops)
    expect(graph.expressions).toHaveLength(1)
    expect(graph.expressions[0]).toEqual({ id: 'eq_1', expression: 'a + b' })
  })
})

describe('operationsToGraph — Full pipeline (parse → convert)', () => {
  it('end-to-end: Socrates knowledge graph', () => {
    const cnl = [
      '# Socrates [individual]',
      '<member_of> Greek;',
      '',
      '# Greek [class]',
      '<is_a> Human;',
      '',
      '# Human [class]',
      '<is_a> Mortal;',
      '',
      '# Mortal [class]'
    ].join('\n')

    const ops = getOperationsFromCnl(cnl)
    const graph = operationsToGraph(ops)

    // 4 explicit + 3 implicit target nodes — but targets already exist so deduped
    // Nodes: socrate, greek, human, mortal (explicit) + greek, human, mortal (targets, dupes skipped)
    expect(graph.nodes.length).toBeGreaterThanOrEqual(4)
    expect(graph.edges).toHaveLength(3)

    const nodeIds = graph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('socrate')
    expect(nodeIds).toContain('greek')
    expect(nodeIds).toContain('human')
    expect(nodeIds).toContain('mortal')
  })

  it('end-to-end: attributes and relations together', () => {
    const cnl = ['# Earth [Place]', 'mass: 5.97e24 *kg*;', '<instance_of> Planet;'].join('\n')

    const ops = getOperationsFromCnl(cnl)
    const graph = operationsToGraph(ops)

    expect(graph.nodes.length).toBeGreaterThanOrEqual(1)
    expect(graph.edges).toHaveLength(1)
    expect(graph.attributes).toHaveLength(1)
    expect(graph.attributes[0].unit).toBe('kg')
  })

  it('end-to-end: morphs pipeline', () => {
    const cnl = [
      '# Water [class]',
      'state: liquid;',
      '## frozen',
      'temperature: 0;',
      '## boiling',
      'temperature: 100;'
    ].join('\n')

    const ops = getOperationsFromCnl(cnl)
    const graph = operationsToGraph(ops)

    const water = graph.nodes.find((n) => n.id === 'water')!
    // basic + frozen + boiling = 3 morphs
    expect(water.morphs).toHaveLength(3)
    expect(water.morphs.map((m) => m.name)).toEqual(['basic', 'frozen', 'boiling'])

    // 3 total attributes: state (basic morph), temperature (frozen morph), temperature (boiling morph)
    expect(graph.attributes).toHaveLength(3)
  })

  it('empty operations produce empty graph', () => {
    const graph = operationsToGraph([])
    expect(graph.nodes).toHaveLength(0)
    expect(graph.edges).toHaveLength(0)
    expect(graph.attributes).toHaveLength(0)
    expect(graph.description).toBeNull()
    expect(graph.currency).toBeNull()
  })
})
