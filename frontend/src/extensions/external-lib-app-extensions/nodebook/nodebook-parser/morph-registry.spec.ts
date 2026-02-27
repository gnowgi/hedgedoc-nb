/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { MorphRegistry } from './morph-registry'
import type { CnlAttribute, CnlEdge } from './types'

function makeEdge(id: string, sourceId = 'n1', targetId = 'n2', name = 'rel'): CnlEdge {
  return { id, source_id: sourceId, target_id: targetId, name, weight: 1, morph_ids: [] }
}

function makeAttr(id: string, sourceId = 'n1', name = 'attr', value = 'v'): CnlAttribute {
  return {
    id,
    source_id: sourceId,
    name,
    value,
    unit: null,
    adverb: null,
    modality: null,
    quantifier: null,
    morph_ids: []
  }
}

describe('MorphRegistry', () => {
  let registry: MorphRegistry

  beforeEach(() => {
    registry = new MorphRegistry()
  })

  describe('addMorph + getMorph', () => {
    it('stores and retrieves a morph by ID', () => {
      registry.addMorph('m1', 'node_a', 'basic', ['r1'], ['a1'])
      const morph = registry.getMorph('m1')
      expect(morph).not.toBeNull()
      expect(morph!.morphId).toBe('m1')
      expect(morph!.nodeId).toBe('node_a')
      expect(morph!.morphName).toBe('basic')
      expect(morph!.relationIds).toEqual(['r1'])
      expect(morph!.attributeIds).toEqual(['a1'])
    })

    it('defaults relationIds and attributeIds to empty arrays', () => {
      registry.addMorph('m1', 'node_a', 'basic')
      const morph = registry.getMorph('m1')
      expect(morph!.relationIds).toEqual([])
      expect(morph!.attributeIds).toEqual([])
    })

    it('copies arrays (mutation-safe)', () => {
      const relIds = ['r1']
      const attrIds = ['a1']
      registry.addMorph('m1', 'node_a', 'basic', relIds, attrIds)
      relIds.push('r2')
      attrIds.push('a2')
      const morph = registry.getMorph('m1')
      expect(morph!.relationIds).toEqual(['r1'])
      expect(morph!.attributeIds).toEqual(['a1'])
    })
  })

  describe('getNodeMorphs', () => {
    it('returns all morphs for a node', () => {
      registry.addMorph('m1', 'node_a', 'basic')
      registry.addMorph('m2', 'node_a', 'heated')
      registry.addMorph('m3', 'node_b', 'basic')
      const morphs = registry.getNodeMorphs('node_a')
      expect(morphs).toHaveLength(2)
      expect(morphs.map((m) => m.morphId)).toEqual(['m1', 'm2'])
    })

    it('returns empty array for unknown node', () => {
      expect(registry.getNodeMorphs('unknown')).toEqual([])
    })
  })

  describe('getMorphRelations / getMorphAttributes', () => {
    it('returns relation IDs linked to a morph', () => {
      registry.addMorph('m1', 'n1', 'basic', ['r1', 'r2'], [])
      expect(registry.getMorphRelations('m1')).toEqual(['r1', 'r2'])
    })

    it('returns attribute IDs linked to a morph', () => {
      registry.addMorph('m1', 'n1', 'basic', [], ['a1', 'a2'])
      expect(registry.getMorphAttributes('m1')).toEqual(['a1', 'a2'])
    })

    it('returns empty for non-existent morph', () => {
      expect(registry.getMorphRelations('missing')).toEqual([])
      expect(registry.getMorphAttributes('missing')).toEqual([])
    })
  })

  describe('reverse lookups: getRelationMorphs / getAttributeMorphs', () => {
    it('returns morphs containing a given relation', () => {
      registry.addMorph('m1', 'n1', 'basic', ['r1', 'r2'], [])
      registry.addMorph('m2', 'n1', 'heated', ['r2', 'r3'], [])
      expect(registry.getRelationMorphs('r2')).toEqual(['m1', 'm2'])
      expect(registry.getRelationMorphs('r1')).toEqual(['m1'])
    })

    it('returns morphs containing a given attribute', () => {
      registry.addMorph('m1', 'n1', 'basic', [], ['a1'])
      registry.addMorph('m2', 'n1', 'heated', [], ['a1', 'a2'])
      expect(registry.getAttributeMorphs('a1')).toEqual(['m1', 'm2'])
      expect(registry.getAttributeMorphs('a2')).toEqual(['m2'])
    })

    it('returns empty for unknown relation/attribute', () => {
      expect(registry.getRelationMorphs('unknown')).toEqual([])
      expect(registry.getAttributeMorphs('unknown')).toEqual([])
    })
  })

  describe('filterRelationsForMorph', () => {
    it('filters edges to only those in the active morph (single ID)', () => {
      registry.addMorph('m1', 'n1', 'basic', ['r1', 'r2'], [])
      registry.addMorph('m2', 'n1', 'heated', ['r3'], [])

      const edges = [makeEdge('r1'), makeEdge('r2'), makeEdge('r3')]
      const filtered = registry.filterRelationsForMorph(edges, 'm1')
      expect(filtered.map((e) => e.id)).toEqual(['r1', 'r2'])
    })

    it('filters edges for multiple active morphs (array)', () => {
      registry.addMorph('m1', 'n1', 'basic', ['r1'], [])
      registry.addMorph('m2', 'n1', 'heated', ['r2'], [])

      const edges = [makeEdge('r1'), makeEdge('r2'), makeEdge('r3')]
      const filtered = registry.filterRelationsForMorph(edges, ['m1', 'm2'])
      expect(filtered.map((e) => e.id)).toEqual(['r1', 'r2'])
    })

    it('deduplicates edges appearing in multiple active morphs', () => {
      registry.addMorph('m1', 'n1', 'basic', ['r1'], [])
      registry.addMorph('m2', 'n1', 'heated', ['r1'], [])

      const edges = [makeEdge('r1')]
      const filtered = registry.filterRelationsForMorph(edges, ['m1', 'm2'])
      expect(filtered).toHaveLength(1)
    })

    it('returns empty when no edges match', () => {
      registry.addMorph('m1', 'n1', 'basic', ['r1'], [])
      const edges = [makeEdge('r99')]
      expect(registry.filterRelationsForMorph(edges, 'm1')).toEqual([])
    })
  })

  describe('filterAttributesForMorph', () => {
    it('filters attributes to only those in the active morph (single ID)', () => {
      registry.addMorph('m1', 'n1', 'basic', [], ['a1', 'a2'])
      registry.addMorph('m2', 'n1', 'heated', [], ['a3'])

      const attrs = [makeAttr('a1'), makeAttr('a2'), makeAttr('a3')]
      const filtered = registry.filterAttributesForMorph(attrs, 'm1')
      expect(filtered.map((a) => a.id)).toEqual(['a1', 'a2'])
    })

    it('filters attributes for multiple active morphs (array)', () => {
      registry.addMorph('m1', 'n1', 'basic', [], ['a1'])
      registry.addMorph('m2', 'n1', 'heated', [], ['a2'])

      const attrs = [makeAttr('a1'), makeAttr('a2'), makeAttr('a3')]
      const filtered = registry.filterAttributesForMorph(attrs, ['m1', 'm2'])
      expect(filtered.map((a) => a.id)).toEqual(['a1', 'a2'])
    })

    it('deduplicates attributes appearing in multiple active morphs', () => {
      registry.addMorph('m1', 'n1', 'basic', [], ['a1'])
      registry.addMorph('m2', 'n1', 'heated', [], ['a1'])

      const attrs = [makeAttr('a1')]
      const filtered = registry.filterAttributesForMorph(attrs, ['m1', 'm2'])
      expect(filtered).toHaveLength(1)
    })
  })

  describe('clear', () => {
    it('removes all data', () => {
      registry.addMorph('m1', 'n1', 'basic', ['r1'], ['a1'])
      registry.clear()
      expect(registry.getMorph('m1')).toBeNull()
      expect(registry.getNodeMorphs('n1')).toEqual([])
      expect(registry.getStats()).toEqual({ totalMorphs: 0, totalNodes: 0, totalRelations: 0, totalAttributes: 0 })
    })
  })

  describe('getStats', () => {
    it('reports counts of morphs, nodes, relations, and attributes', () => {
      registry.addMorph('m1', 'n1', 'basic', ['r1', 'r2'], ['a1'])
      registry.addMorph('m2', 'n2', 'basic', ['r3'], ['a2', 'a3'])
      expect(registry.getStats()).toEqual({
        totalMorphs: 2,
        totalNodes: 2,
        totalRelations: 3,
        totalAttributes: 3
      })
    })

    it('returns zeroes when empty', () => {
      expect(registry.getStats()).toEqual({ totalMorphs: 0, totalNodes: 0, totalRelations: 0, totalAttributes: 0 })
    })
  })

  describe('non-existent lookups', () => {
    it('getMorph returns null for unknown ID', () => {
      expect(registry.getMorph('nonexistent')).toBeNull()
    })
  })
})
