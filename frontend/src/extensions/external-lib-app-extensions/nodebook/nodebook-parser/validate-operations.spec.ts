/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { validateOperations } from './validate-operations'
import type { CnlOperation } from './types'
import type { MergedSchemas } from './schema-store'

function addNodeOp(id: string, role: string, displayName?: string): CnlOperation {
  return {
    type: 'addNode',
    payload: {
      base_name: displayName ?? id,
      displayName: displayName ?? id,
      options: { role }
    },
    id
  }
}

function addRelationOp(source: string, target: string, name: string): CnlOperation {
  return {
    type: 'addRelation',
    payload: { source, target, name },
    id: `rel_${source}_${name}_${target}`
  }
}

function addAttributeOp(source: string, name: string): CnlOperation {
  return {
    type: 'addAttribute',
    payload: { source, name, value: '42' },
    id: `attr_${source}_${name}`
  }
}

describe('validateOperations', () => {
  describe('node type validation', () => {
    it('accepts known node types (class, individual)', () => {
      const ops = [addNodeOp('alice', 'individual'), addNodeOp('animal', 'class')]
      const errors = validateOperations(ops)
      const nodeTypeErrors = errors.filter((e) => e.message.includes('Unknown node type'))
      expect(nodeTypeErrors).toHaveLength(0)
    })

    it('accepts default schema node types', () => {
      const ops = [addNodeOp('x', 'Resource'), addNodeOp('y', 'Event'), addNodeOp('z', 'Agent')]
      const errors = validateOperations(ops)
      const nodeTypeErrors = errors.filter((e) => e.message.includes('Unknown node type'))
      expect(nodeTypeErrors).toHaveLength(0)
    })

    it('warns about unknown node types', () => {
      const ops = [addNodeOp('pluto', 'planet')]
      const errors = validateOperations(ops)
      expect(errors.some((e) => e.message.includes('Unknown node type "planet"'))).toBe(true)
    })
  })

  describe('attribute type validation', () => {
    it('accepts known attribute types', () => {
      const ops = [addNodeOp('x', 'class'), addAttributeOp('x', 'mass')]
      const errors = validateOperations(ops)
      const attrErrors = errors.filter((e) => e.message.includes('Unknown attribute type'))
      expect(attrErrors).toHaveLength(0)
    })

    it('warns about unknown attribute types', () => {
      const ops = [addNodeOp('x', 'class'), addAttributeOp('x', 'flavor')]
      const errors = validateOperations(ops)
      expect(errors.some((e) => e.message.includes('Unknown attribute type "flavor"'))).toBe(true)
    })
  })

  describe('relation type validation', () => {
    it('accepts known relation types', () => {
      const ops = [addNodeOp('a', 'class'), addNodeOp('b', 'class'), addRelationOp('a', 'b', 'is_a')]
      const errors = validateOperations(ops)
      const relErrors = errors.filter((e) => e.message.includes('Unknown relation type'))
      expect(relErrors).toHaveLength(0)
    })

    it('warns about unknown relation types', () => {
      const ops = [addNodeOp('a', 'class'), addNodeOp('b', 'class'), addRelationOp('a', 'b', 'flies_to')]
      const errors = validateOperations(ops)
      expect(errors.some((e) => e.message.includes('Unknown relation type "flies_to"'))).toBe(true)
    })

    it('accepts aliases (e.g., "is a" is alias for "is_a")', () => {
      const ops = [addNodeOp('a', 'class'), addNodeOp('b', 'class'), addRelationOp('a', 'b', 'is a')]
      const errors = validateOperations(ops)
      const relErrors = errors.filter((e) => e.message.includes('Unknown relation type'))
      expect(relErrors).toHaveLength(0)
    })
  })

  describe('is_a from individual error', () => {
    it('warns when an individual uses <is_a>', () => {
      const ops = [
        addNodeOp('alice', 'individual'),
        addNodeOp('human', 'class'),
        addRelationOp('alice', 'human', 'is_a')
      ]
      const errors = validateOperations(ops)
      expect(
        errors.some((e) => e.message.includes('is for type-to-type subsumption') && e.message.includes('alice'))
      ).toBe(true)
    })

    it('warns with "is a" variant too', () => {
      const ops = [addNodeOp('bob', 'individual'), addNodeOp('human', 'class'), addRelationOp('bob', 'human', 'is a')]
      const errors = validateOperations(ops)
      expect(errors.some((e) => e.message.includes('is for type-to-type subsumption'))).toBe(true)
    })

    it('does not warn when classes use <is_a>', () => {
      const ops = [addNodeOp('human', 'class'), addNodeOp('mammal', 'class'), addRelationOp('human', 'mammal', 'is_a')]
      const errors = validateOperations(ops)
      expect(errors.filter((e) => e.message.includes('is for type-to-type subsumption'))).toHaveLength(0)
    })
  })

  describe('consolidated surface forms', () => {
    it('warns when the same node ID has multiple display names', () => {
      const ops: CnlOperation[] = [
        {
          type: 'addNode',
          payload: { base_name: 'Human', displayName: 'Human', options: { role: 'class' } },
          id: 'human'
        },
        {
          type: 'addNode',
          payload: { base_name: 'humans', displayName: 'humans', options: { role: 'class' } },
          id: 'human'
        }
      ]
      const errors = validateOperations(ops)
      expect(errors.some((e) => e.message.includes('consolidated into a single node'))).toBe(true)
    })

    it('no warning when all surface forms are the same', () => {
      const ops: CnlOperation[] = [
        {
          type: 'addNode',
          payload: { base_name: 'Human', displayName: 'Human', options: { role: 'class' } },
          id: 'human'
        },
        {
          type: 'addNode',
          payload: { base_name: 'Human', displayName: 'Human', options: { role: 'class' } },
          id: 'human'
        }
      ]
      const errors = validateOperations(ops)
      expect(errors.filter((e) => e.message.includes('consolidated'))).toHaveLength(0)
    })
  })

  describe('custom schemas override', () => {
    it('uses provided schemas instead of defaults', () => {
      const customSchemas: MergedSchemas = {
        nodeTypes: [{ name: 'Planet', description: '', parent_types: [] }],
        relationTypes: [{ name: 'orbits', description: '', domain: [], range: [] }],
        attributeTypes: [
          { name: 'radius', data_type: 'float', description: '', unit: null, domain: [], allowed_values: null }
        ],
        transitionTypes: [],
        functionTypes: []
      }

      const ops = [
        addNodeOp('earth', 'Planet'),
        addAttributeOp('earth', 'radius'),
        addRelationOp('earth', 'sun', 'orbits')
      ]
      const errors = validateOperations(ops, customSchemas)
      expect(errors.filter((e) => e.message.includes('Unknown'))).toHaveLength(0)
    })

    it('custom schema rejects types not in its list', () => {
      const customSchemas: MergedSchemas = {
        nodeTypes: [{ name: 'Planet', description: '', parent_types: [] }],
        relationTypes: [],
        attributeTypes: [],
        transitionTypes: [],
        functionTypes: []
      }

      const ops = [addNodeOp('x', 'Star')]
      const errors = validateOperations(ops, customSchemas)
      expect(errors.some((e) => e.message.includes('Unknown node type "Star"'))).toBe(true)
    })
  })

  describe('fallback to defaults', () => {
    it('uses default schemas when no schemas provided', () => {
      // 'mass' is a default attribute type; 'is_a' is a default relation type
      const ops = [addNodeOp('a', 'class'), addAttributeOp('a', 'mass'), addRelationOp('a', 'b', 'is_a')]
      const errors = validateOperations(ops)
      expect(errors.filter((e) => e.message.includes('Unknown'))).toHaveLength(0)
    })
  })

  describe('empty operations', () => {
    it('returns no errors for empty input', () => {
      expect(validateOperations([])).toEqual([])
    })
  })
})
