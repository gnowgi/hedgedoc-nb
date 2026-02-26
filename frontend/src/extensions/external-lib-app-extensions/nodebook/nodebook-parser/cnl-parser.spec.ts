/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getOperationsFromCnl } from './cnl-parser'
import type { CnlOperation } from './types'

/** Extract all addQuery operations from a parse result. */
function getQueries(ops: CnlOperation[]): Array<{ goalString: string; displayString?: string }> {
  return ops
    .filter((op) => op.type === 'addQuery')
    .map((op) => {
      const payload = op.payload as { goalString: string; displayString?: string }
      return { goalString: payload.goalString, displayString: payload.displayString }
    })
}

/** Extract unique goalStrings from a parse result. */
function getGoalStrings(ops: CnlOperation[]): string[] {
  return getQueries(ops).map((q) => q.goalString)
}

describe('getOperationsFromCnl — Wh-word queries', () => {
  describe('node-scoped queries', () => {
    it('<rel> what; — object unknown', () => {
      const ops = getOperationsFromCnl('# Socrates [individual]\n<member_of> what;')
      const goals = getGoalStrings(ops)
      // cleanName singularizes: "Socrates" → "socrate"
      expect(goals).toContainEqual("relation('socrate', X, 'member_of')")
    })

    it('<how> Target; — relation unknown', () => {
      const ops = getOperationsFromCnl('# Greek [class]\n<how> Human;')
      const goals = getGoalStrings(ops)
      expect(goals).toContainEqual("relation('greek', 'human', X)")
    })

    it('attr: what; — value unknown', () => {
      const ops = getOperationsFromCnl('# Earth [planet]\nradius: what;')
      const goals = getGoalStrings(ops)
      expect(goals).toContainEqual("attribute('earth', 'radius', X)")
    })

    it('what: value; — NOT node-scoped (subject is unknown, graph-level only)', () => {
      const ops = getOperationsFromCnl('# Alice [individual]\nwhat: engineer;')
      const goals = getGoalStrings(ops)
      // what: value; asks "WHAT has this value?" — unknown subject means graph-level
      expect(goals).not.toContainEqual("attribute('alice', X, 'engineer')")
      // Should produce graph-level query instead
      expect(goals).toContainEqual("attribute(X, Y, 'engineer')")
    })
  })

  describe('graph-level queries', () => {
    it('who <rel> Target; — subject unknown', () => {
      const ops = getOperationsFromCnl('# Mortal [class]\n\nwho <is_a> Mortal;')
      const goals = getGoalStrings(ops)
      expect(goals).toContainEqual("relation(X, 'mortal', 'is_a')")
    })

    it('what: value; — graph-level attr', () => {
      const ops = getOperationsFromCnl('# Earth [planet]\nradius: 6371 *km*;\n\nwhat: 6371;')
      const goals = getGoalStrings(ops)
      expect(goals).toContainEqual("attribute(X, Y, '6371')")
    })

    it('attr: what; — graph-level value', () => {
      const ops = getOperationsFromCnl('# Earth [planet]\nradius: 6371 *km*;\n\nmass: what;')
      const goals = getGoalStrings(ops)
      expect(goals).toContainEqual("attribute(X, 'mass', Y)")
    })
  })

  describe('graph-level queries placed after last heading', () => {
    it('who <rel> Target; after last # heading works', () => {
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
        '# Mortal [class]',
        '',
        'who <is_a> Mortal;',
        'who <member_of> Human;'
      ].join('\n')

      const goals = getGoalStrings(getOperationsFromCnl(cnl))
      expect(goals).toContainEqual("relation(X, 'mortal', 'is_a')")
      expect(goals).toContainEqual("relation(X, 'human', 'member_of')")
    })

    it('what: value; after last # heading produces graph-level query', () => {
      const cnl = [
        '# Earth [planet]',
        'radius: 6371 *km*;',
        '',
        '# Sun [star]',
        '',
        'what: 6371;'
      ].join('\n')

      const goals = getGoalStrings(getOperationsFromCnl(cnl))
      expect(goals).toContainEqual("attribute(X, Y, '6371')")
    })
  })

  describe('Wh-word interchangeability', () => {
    it('all 5 words (what/who/where/when/how) work for <rel> WH;', () => {
      const whWords = ['what', 'who', 'where', 'when', 'how']
      for (const wh of whWords) {
        const ops = getOperationsFromCnl(`# Node [class]\n<rel> ${wh};`)
        const goals = getGoalStrings(ops)
        expect(goals).toContainEqual("relation('node', X, 'rel')")
      }
    })

    it('case-insensitive: What, WHO, How all match', () => {
      const variants = ['What', 'WHO', 'How']
      for (const wh of variants) {
        const ops = getOperationsFromCnl(`# Node [class]\n<rel> ${wh};`)
        const goals = getGoalStrings(ops)
        expect(goals).toContainEqual("relation('node', X, 'rel')")
      }
    })
  })

  describe('Prolog ?- queries still work', () => {
    it('?- goal. produces query with goalString', () => {
      const ops = getOperationsFromCnl('# Socrates [individual]\n\n?- relation(socrates, X, member_of).')
      const goals = getGoalStrings(ops)
      expect(goals).toContainEqual('relation(socrates, X, member_of)')
    })
  })

  describe('displayString preservation', () => {
    it('node-scoped queries preserve original line as displayString', () => {
      const ops = getOperationsFromCnl('# Earth [planet]\nradius: what;')
      const queries = getQueries(ops)
      const radiusQuery = queries.find((q) => q.goalString.includes("'radius'"))
      expect(radiusQuery).toBeDefined()
      expect(radiusQuery!.displayString).toBe('radius: what;')
    })

    it('graph-level queries preserve original line as displayString', () => {
      const ops = getOperationsFromCnl('# Mortal [class]\n\nwho <is_a> Mortal;')
      const queries = getQueries(ops)
      const whoQuery = queries.find((q) => q.goalString.includes("'is_a'"))
      expect(whoQuery).toBeDefined()
      expect(whoQuery!.displayString).toBe('who <is_a> Mortal;')
    })
  })

  describe('no interference with regular content', () => {
    it('mass: 70; is parsed as attribute, not query', () => {
      const ops = getOperationsFromCnl('# Person [individual]\nmass: 70;')
      const attrs = ops.filter((op) => op.type === 'addAttribute')
      const queries = ops.filter((op) => op.type === 'addQuery')
      expect(attrs.length).toBe(1)
      expect((attrs[0].payload as { name: string }).name).toBe('mass')
      expect(queries.length).toBe(0)
    })

    it('<is_a> Animal; is parsed as relation, not query', () => {
      const ops = getOperationsFromCnl('# Dog [class]\n<is_a> Animal;')
      const relations = ops.filter((op) => op.type === 'addRelation')
      const queries = ops.filter((op) => op.type === 'addQuery')
      expect(relations.length).toBe(1)
      expect((relations[0].payload as { name: string }).name).toBe('is_a')
      expect(queries.length).toBe(0)
    })

    it('attribute lines with Wh-like substrings are not confused', () => {
      const ops = getOperationsFromCnl('# Entity [class]\nwhatever: value;')
      const attrs = ops.filter((op) => op.type === 'addAttribute')
      expect(attrs.length).toBe(1)
      expect((attrs[0].payload as { name: string }).name).toBe('whatever')
    })
  })

  describe('full integration: Socrates knowledge graph', () => {
    it('produces correct queries for the seed content example', () => {
      const cnl = [
        '# Socrates [individual]',
        '<member_of> Greek;',
        '<member_of> what;',
        '',
        '# Greek [class]',
        '<is_a> Human;',
        '<how> Human;',
        '',
        '# Human [class]',
        '<is_a> Mortal;',
        '',
        '# Mortal [class]',
        '',
        'who <is_a> Mortal;',
        'who <member_of> Human;'
      ].join('\n')

      const ops = getOperationsFromCnl(cnl)
      const goals = getGoalStrings(ops)

      // Node-scoped queries (cleanName singularizes: "Socrates" → "socrate")
      expect(goals).toContainEqual("relation('socrate', X, 'member_of')")
      expect(goals).toContainEqual("relation('greek', 'human', X)")

      // Graph-level queries
      expect(goals).toContainEqual("relation(X, 'mortal', 'is_a')")
      expect(goals).toContainEqual("relation(X, 'human', 'member_of')")

      // Nodes should be created
      const nodeIds = ops.filter((op) => op.type === 'addNode').map((op) => op.id)
      expect(nodeIds).toContain('socrate')
      expect(nodeIds).toContain('greek')
      expect(nodeIds).toContain('human')
      expect(nodeIds).toContain('mortal')

      // Relations should be created
      const relations = ops.filter((op) => op.type === 'addRelation')
      expect(relations.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('who <rel> Target; inside node blocks', () => {
    it('generates graph-level query via processNeighborhood', () => {
      const cnl = [
        '# Sun [star]',
        '',
        'who <orbits> Sun;'
      ].join('\n')

      const goals = getGoalStrings(getOperationsFromCnl(cnl))
      expect(goals).toContainEqual("relation(X, 'sun', 'orbits')")
    })

    it('deduplicates when same query appears in both node block and graph-level', () => {
      const cnl = [
        '# Sun [star]',
        'who <orbits> Sun;'
      ].join('\n')

      const ops = getOperationsFromCnl(cnl)
      const matchingGoals = getGoalStrings(ops).filter(
        (g) => g === "relation(X, 'sun', 'orbits')"
      )
      expect(matchingGoals.length).toBe(1)
    })
  })

  describe('what: value; is graph-level only; attr: what; is node-scoped', () => {
    it('what: 6371; inside node block produces ONLY graph-level query (no node-scoped)', () => {
      const cnl = [
        '# Earth [planet]',
        'radius: 6371 *km*;',
        '',
        '# Sun [star]',
        '',
        'what: 6371;'
      ].join('\n')

      const ops = getOperationsFromCnl(cnl)
      const goals = getGoalStrings(ops)
      // Graph-level: attribute(X, Y, '6371')
      expect(goals).toContainEqual("attribute(X, Y, '6371')")
      // Should NOT produce node-scoped query for Sun
      expect(goals).not.toContainEqual("attribute('sun', X, '6371')")
    })

    it('radius: what; inside node block produces node-scoped query', () => {
      const cnl = [
        '# Earth [planet]',
        'radius: 6371 *km*;',
        'radius: what;'
      ].join('\n')

      const goals = getGoalStrings(getOperationsFromCnl(cnl))
      expect(goals).toContainEqual("attribute('earth', 'radius', X)")
    })
  })
})
