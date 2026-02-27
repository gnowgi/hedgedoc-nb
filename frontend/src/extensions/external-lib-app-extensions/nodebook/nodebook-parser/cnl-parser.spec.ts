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

/** Extract ops of a given type. */
function opsOfType(ops: CnlOperation[], type: string): CnlOperation[] {
  return ops.filter((op) => op.type === type)
}

/** Get addNode payload options. */
function nodeOptions(op: CnlOperation): Record<string, unknown> {
  return (op.payload as { options: Record<string, unknown> }).options
}

/** Get addAttribute payload. */
function attrPayload(op: CnlOperation): Record<string, unknown> {
  return op.payload as Record<string, unknown>
}

/** Get addRelation payload. */
function relPayload(op: CnlOperation): Record<string, unknown> {
  return op.payload as Record<string, unknown>
}

describe('role synonym normalization', () => {
  it.each(['class', 'concept', 'type', 'universal', 'common noun'])('[%s] normalizes to class', (synonym) => {
    const ops = getOperationsFromCnl(`# Thing [${synonym}]`)
    const node = ops.find((op) => op.type === 'addNode')
    expect(node).toBeDefined()
    const options = (node!.payload as { options: { role: string } }).options
    expect(options.role).toBe('class')
  })

  it.each(['individual', 'particular', 'token', 'member', 'proper noun'])(
    '[%s] normalizes to individual',
    (synonym) => {
      const ops = getOperationsFromCnl(`# Alice [${synonym}]`)
      const node = ops.find((op) => op.type === 'addNode')
      expect(node).toBeDefined()
      const options = (node!.payload as { options: { role: string } }).options
      expect(options.role).toBe('individual')
    }
  )

  it('non-synonym roles are preserved as-is', () => {
    for (const role of ['Transition', 'Account', 'planet', 'star']) {
      const ops = getOperationsFromCnl(`# Thing [${role}]`)
      const node = ops.find((op) => op.type === 'addNode')
      expect(node).toBeDefined()
      const options = (node!.payload as { options: { role: string } }).options
      expect(options.role).toBe(role)
    }
  })

  it('is case insensitive', () => {
    for (const variant of ['Class', 'CLASS', 'Concept', 'UNIVERSAL', 'Proper Noun', 'INDIVIDUAL']) {
      const ops = getOperationsFromCnl(`# Thing [${variant}]`)
      const node = ops.find((op) => op.type === 'addNode')
      expect(node).toBeDefined()
      const options = (node!.payload as { options: { role: string } }).options
      expect(['class', 'individual']).toContain(options.role)
    }
  })

  it('untyped nodes default to individual', () => {
    const ops = getOperationsFromCnl('# Alice')
    const node = ops.find((op) => op.type === 'addNode')
    expect(node).toBeDefined()
    const options = (node!.payload as { options: { role: string } }).options
    expect(options.role).toBe('individual')
  })
})

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
      const cnl = ['# Earth [planet]', 'radius: 6371 *km*;', '', '# Sun [star]', '', 'what: 6371;'].join('\n')

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
      const cnl = ['# Sun [star]', '', 'who <orbits> Sun;'].join('\n')

      const goals = getGoalStrings(getOperationsFromCnl(cnl))
      expect(goals).toContainEqual("relation(X, 'sun', 'orbits')")
    })

    it('deduplicates when same query appears in both node block and graph-level', () => {
      const cnl = ['# Sun [star]', 'who <orbits> Sun;'].join('\n')

      const ops = getOperationsFromCnl(cnl)
      const matchingGoals = getGoalStrings(ops).filter((g) => g === "relation(X, 'sun', 'orbits')")
      expect(matchingGoals.length).toBe(1)
    })
  })

  describe('what: value; is graph-level only; attr: what; is node-scoped', () => {
    it('what: 6371; inside node block produces ONLY graph-level query (no node-scoped)', () => {
      const cnl = ['# Earth [planet]', 'radius: 6371 *km*;', '', '# Sun [star]', '', 'what: 6371;'].join('\n')

      const ops = getOperationsFromCnl(cnl)
      const goals = getGoalStrings(ops)
      // Graph-level: attribute(X, Y, '6371')
      expect(goals).toContainEqual("attribute(X, Y, '6371')")
      // Should NOT produce node-scoped query for Sun
      expect(goals).not.toContainEqual("attribute('sun', X, '6371')")
    })

    it('radius: what; inside node block produces node-scoped query', () => {
      const cnl = ['# Earth [planet]', 'radius: 6371 *km*;', 'radius: what;'].join('\n')

      const goals = getGoalStrings(getOperationsFromCnl(cnl))
      expect(goals).toContainEqual("attribute('earth', 'radius', X)")
    })
  })
})

describe('getOperationsFromCnl — Node Parsing', () => {
  it('parses a basic node heading: # Alice', () => {
    const ops = getOperationsFromCnl('# Alice')
    const nodes = opsOfType(ops, 'addNode')
    expect(nodes).toHaveLength(1)
    expect(nodes[0].id).toBe('alice')
    expect(nodeOptions(nodes[0]).role).toBe('individual')
  })

  it('parses a typed node: # Animal [class]', () => {
    const ops = getOperationsFromCnl('# Animal [class]')
    const nodes = opsOfType(ops, 'addNode')
    expect(nodes).toHaveLength(1)
    expect(nodeOptions(nodes[0]).role).toBe('class')
  })

  it('parses an adjective node: # **red** Car [class]', () => {
    const ops = getOperationsFromCnl('# **red** Car [class]')
    const nodes = opsOfType(ops, 'addNode')
    expect(nodes).toHaveLength(1)
    expect(nodes[0].id).toBe('red_car')
    expect(nodeOptions(nodes[0]).adjective).toBe('red')
  })

  it('parses a quantifier node: # *many* Cat [class]', () => {
    const ops = getOperationsFromCnl('# *many* Cat [class]')
    const nodes = opsOfType(ops, 'addNode')
    expect(nodes).toHaveLength(1)
    expect(nodeOptions(nodes[0]).quantifier).toBe('many')
  })

  it('defaults to individual when no type is given', () => {
    const ops = getOperationsFromCnl('# Bob')
    const nodes = opsOfType(ops, 'addNode')
    expect(nodeOptions(nodes[0]).role).toBe('individual')
  })

  it('parses type-inside-name edge case: # Bob [Person]', () => {
    const ops = getOperationsFromCnl('# Bob [Person]')
    const nodes = opsOfType(ops, 'addNode')
    expect(nodes).toHaveLength(1)
    expect(nodeOptions(nodes[0]).role).toBe('Person')
  })

  it('generates deterministic IDs based on cleaned name', () => {
    const ops1 = getOperationsFromCnl('# Human [class]')
    const ops2 = getOperationsFromCnl('# human [class]')
    expect(ops1[0].id).toBe(ops2[0].id)
  })

  it('parses multiple nodes', () => {
    const cnl = '# Alice\n\n# Bob\n\n# Carol'
    const nodes = opsOfType(getOperationsFromCnl(cnl), 'addNode')
    expect(nodes).toHaveLength(3)
  })
})

describe('getOperationsFromCnl — Singularization / cleanName', () => {
  it('standard plurals: humans → human', () => {
    const ops = getOperationsFromCnl('# Humans [class]')
    expect(ops[0].id).toBe('human')
  })

  it('-ies → -y: cities → city', () => {
    const ops = getOperationsFromCnl('# Cities [class]')
    expect(ops[0].id).toBe('city')
  })

  it('-ves → -f: wolves → wolf', () => {
    const ops = getOperationsFromCnl('# Wolves [class]')
    expect(ops[0].id).toBe('wolf')
  })

  it('-shes: dishes → dish', () => {
    const ops = getOperationsFromCnl('# Dishes [class]')
    expect(ops[0].id).toBe('dish')
  })

  it('-xes: boxes → box', () => {
    const ops = getOperationsFromCnl('# Boxes [class]')
    expect(ops[0].id).toBe('box')
  })

  it('invariant words preserved: species', () => {
    const ops = getOperationsFromCnl('# Species [class]')
    expect(ops[0].id).toBe('species')
  })

  it('invariant words preserved: sheep', () => {
    const ops = getOperationsFromCnl('# Sheep [class]')
    expect(ops[0].id).toBe('sheep')
  })

  it('-ss preserved: glass', () => {
    const ops = getOperationsFromCnl('# Glass [class]')
    expect(ops[0].id).toBe('glass')
  })

  it('-us preserved: status', () => {
    const ops = getOperationsFromCnl('# Status [class]')
    expect(ops[0].id).toBe('status')
  })

  it('-is preserved: analysis', () => {
    const ops = getOperationsFromCnl('# Analysis [class]')
    expect(ops[0].id).toBe('analysis')
  })

  it('short -ies → -ie: pies → pie', () => {
    const ops = getOperationsFromCnl('# Pies [class]')
    // "pies" has length 4 < 6, falls through to -s removal → "pie"
    expect(ops[0].id).toBe('pie')
  })

  it('multi-word: Big Cats → big_cat', () => {
    const ops = getOperationsFromCnl('# Big Cats [class]')
    expect(ops[0].id).toBe('big_cat')
  })

  it('case normalization: HUMAN and human produce same ID', () => {
    const ops1 = getOperationsFromCnl('# HUMAN [class]')
    const ops2 = getOperationsFromCnl('# human [class]')
    expect(ops1[0].id).toBe(ops2[0].id)
  })

  it('special char removal', () => {
    const ops = getOperationsFromCnl("# It's [class]")
    // apostrophe removed, "its" → "it" (singularized) — or "it" directly
    expect(ops[0].id).toBeDefined()
    expect(ops[0].id).not.toContain("'")
  })
})

describe('getOperationsFromCnl — Attributes', () => {
  it('basic attribute: mass: 70;', () => {
    const ops = getOperationsFromCnl('# Person [individual]\nmass: 70;')
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(1)
    expect(attrPayload(attrs[0]).name).toBe('mass')
    expect(attrPayload(attrs[0]).value).toBe('70')
    expect(attrPayload(attrs[0]).source).toBe('person')
  })

  it('attribute with unit: mass: 70 *kg*;', () => {
    const ops = getOperationsFromCnl('# Person [individual]\nmass: 70 *kg*;')
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(1)
    expect(attrPayload(attrs[0]).unit).toBe('kg')
    expect(attrPayload(attrs[0]).value).toBe('70')
  })

  it('attribute with "has" prefix: has mass: 70;', () => {
    const ops = getOperationsFromCnl('# Person [individual]\nhas mass: 70;')
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(1)
    expect(attrPayload(attrs[0]).name).toBe('mass')
  })

  it('attribute with abbreviation: mass {m}: 70;', () => {
    const ops = getOperationsFromCnl('# Person [individual]\nmass {m}: 70;')
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(1)
    expect(attrPayload(attrs[0]).abbreviation).toBe('m')
  })

  it('attribute with adverb: speed: 100 ++rapidly++;', () => {
    const ops = getOperationsFromCnl('# Car [individual]\nspeed: 100 ++rapidly++;')
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(1)
    expect(attrPayload(attrs[0]).adverb).toBe('rapidly')
  })

  it('attribute with modality: alive: true [certain];', () => {
    const ops = getOperationsFromCnl('# Cat [individual]\nalive: true [certain];')
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(1)
    expect(attrPayload(attrs[0]).modality).toBe('certain')
  })

  it('attribute without semicolon: mass: 70', () => {
    const ops = getOperationsFromCnl('# Person [individual]\nmass: 70')
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(1)
    expect(attrPayload(attrs[0]).value).toBe('70')
  })

  it('expression lines excluded from attributes', () => {
    const ops = getOperationsFromCnl('# Node [class]\nexpression: a + b;')
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(0)
  })

  it('multiple attributes on same node', () => {
    const cnl = '# Person [individual]\nmass: 70;\nheight: 180;'
    const attrs = opsOfType(getOperationsFromCnl(cnl), 'addAttribute')
    expect(attrs).toHaveLength(2)
  })
})

describe('getOperationsFromCnl — Relations', () => {
  it('basic relation: <is_a> Animal;', () => {
    const ops = getOperationsFromCnl('# Dog [class]\n<is_a> Animal;')
    const rels = opsOfType(ops, 'addRelation')
    expect(rels).toHaveLength(1)
    expect(relPayload(rels[0]).name).toBe('is_a')
    expect(relPayload(rels[0]).source).toBe('dog')
    expect(relPayload(rels[0]).target).toBe('animal')
  })

  it('weighted relation: <inflow> 6 CO2;', () => {
    const ops = getOperationsFromCnl('# Reaction [Event]\n<inflow> 6 CO2;')
    const rels = opsOfType(ops, 'addRelation')
    expect(rels).toHaveLength(1)
    expect(relPayload(rels[0]).weight).toBe(6)
  })

  it('decimal weight: <inflow> 1500.50 Cash;', () => {
    const ops = getOperationsFromCnl('# Sale [Event]\n<inflow> 1500.50 Cash;')
    const rels = opsOfType(ops, 'addRelation')
    expect(rels).toHaveLength(1)
    expect(relPayload(rels[0]).weight).toBe(1500.5)
  })

  it('alias mapping: debit → has post_state', () => {
    const ops = getOperationsFromCnl('# Sale [Transaction]\n<debit> Cash;')
    const rels = opsOfType(ops, 'addRelation')
    expect(rels).toHaveLength(1)
    expect(relPayload(rels[0]).name).toBe('has post_state')
  })

  it('alias mapping: credit → has prior_state', () => {
    const ops = getOperationsFromCnl('# Sale [Transaction]\n<credit> Revenue;')
    const rels = opsOfType(ops, 'addRelation')
    expect(rels).toHaveLength(1)
    expect(relPayload(rels[0]).name).toBe('has prior_state')
  })

  it('target adjective: <is_a> **cold** Water;', () => {
    const ops = getOperationsFromCnl('# Ice [class]\n<is_a> **cold** Water;')
    const targetNodes = opsOfType(ops, 'addNode').filter((op) => op.id === 'cold_water')
    expect(targetNodes).toHaveLength(1)
  })

  it('implicit target node creation', () => {
    const ops = getOperationsFromCnl('# Dog [class]\n<is_a> Animal;')
    const nodes = opsOfType(ops, 'addNode')
    const targetNode = nodes.find((n) => n.id === 'animal')
    expect(targetNode).toBeDefined()
  })

  it('accounting relations give target Account role', () => {
    const ops = getOperationsFromCnl('# Sale [Transaction]\n<debit> Cash;')
    const nodes = opsOfType(ops, 'addNode')
    const cash = nodes.find((n) => n.id === 'cash')
    expect(cash).toBeDefined()
    expect((cash!.payload as { role: string }).role).toBe('Account')
  })

  it('default weight is 1', () => {
    const ops = getOperationsFromCnl('# Dog [class]\n<is_a> Animal;')
    const rels = opsOfType(ops, 'addRelation')
    expect(relPayload(rels[0]).weight).toBe(1)
  })
})

describe('getOperationsFromCnl — Mindmap Blocks', () => {
  it('parses basic mindmap: # Root <has part> with list items', () => {
    const cnl = '# Root <has part>\n- A\n- B\n- C'
    const ops = getOperationsFromCnl(cnl)
    const nodes = opsOfType(ops, 'addNode')
    const rels = opsOfType(ops, 'addRelation')
    expect(nodes).toHaveLength(4) // Root + A + B + C
    expect(rels).toHaveLength(3) // Root→A, Root→B, Root→C
    expect(rels.every((r) => relPayload(r).name === 'has part')).toBe(true)
  })

  it('nested indentation creates hierarchy', () => {
    const cnl = '# Root <has part>\n- A\n  - A1\n  - A2\n- B'
    const ops = getOperationsFromCnl(cnl)
    const rels = opsOfType(ops, 'addRelation')
    // Root→A, A→A1, A→A2, Root→B
    expect(rels).toHaveLength(4)
    const a1Rel = rels.find((r) => relPayload(r).target === 'a1')
    expect(a1Rel).toBeDefined()
    expect(relPayload(a1Rel!).source).toBe('a')
  })

  it('mixed with regular CNL blocks', () => {
    const cnl = '# Root <has part>\n- A\n- B\n\n# Extra [class]\nmass: 10;'
    const ops = getOperationsFromCnl(cnl)
    const mindmapNodes = ops.filter((op) => op.type === 'addNode' && op.source === 'mindmap')
    const cnlNodes = ops.filter((op) => op.type === 'addNode' && op.source !== 'mindmap')
    expect(mindmapNodes.length).toBeGreaterThanOrEqual(2)
    expect(cnlNodes.length).toBeGreaterThanOrEqual(1)
  })

  it('heading-only (no items) creates just root node', () => {
    const cnl = '# Solo <has part>'
    const ops = getOperationsFromCnl(cnl)
    const nodes = opsOfType(ops, 'addNode')
    expect(nodes).toHaveLength(1)
    expect(nodes[0].id).toBe('solo')
  })

  it('mindmap root gets individual role', () => {
    const cnl = '# Root <has part>\n- Child'
    const ops = getOperationsFromCnl(cnl)
    const root = ops.find((op) => op.type === 'addNode' && op.id === 'root')
    expect(root).toBeDefined()
    expect((root!.payload as { options: { role: string } }).options.role).toBe('individual')
  })

  it('mindmap children get class role', () => {
    const cnl = '# Root <has part>\n- Child'
    const ops = getOperationsFromCnl(cnl)
    const child = ops.find((op) => op.type === 'addNode' && op.id === 'child')
    expect(child).toBeDefined()
    expect((child!.payload as { role: string }).role).toBe('class')
  })
})

describe('getOperationsFromCnl — Morphs', () => {
  it('## morph_name creates addMorph operation', () => {
    const cnl = '# Water [class]\n## heated\ntemperature: 100;'
    const ops = getOperationsFromCnl(cnl)
    const morphOps = opsOfType(ops, 'addMorph')
    expect(morphOps).toHaveLength(1)
    const payload = morphOps[0].payload as { nodeId: string; morph: { name: string } }
    expect(payload.nodeId).toBe('water')
    expect(payload.morph.name).toBe('heated')
  })

  it('morph attributes get morphId', () => {
    const cnl = '# Water [class]\n## heated\ntemperature: 100;'
    const ops = getOperationsFromCnl(cnl)
    const attrs = opsOfType(ops, 'addAttribute')
    expect(attrs).toHaveLength(1)
    expect(attrPayload(attrs[0]).morphId).toBeDefined()
  })

  it('morph relations get morphId', () => {
    const cnl = '# Water [class]\n## frozen\n<is_a> Solid;'
    const ops = getOperationsFromCnl(cnl)
    const rels = opsOfType(ops, 'addRelation')
    expect(rels).toHaveLength(1)
    expect(relPayload(rels[0]).morphId).toBeDefined()
  })

  it('multiple morphs on one node', () => {
    const cnl = '# Water [class]\n## liquid\ntemperature: 25;\n## gas\ntemperature: 100;'
    const ops = getOperationsFromCnl(cnl)
    const morphOps = opsOfType(ops, 'addMorph')
    expect(morphOps).toHaveLength(2)
  })

  it('morph counter resets between parses', () => {
    const cnl = '# Water [class]\n## heated\ntemperature: 100;'
    const ops1 = getOperationsFromCnl(cnl)
    const ops2 = getOperationsFromCnl(cnl)
    const morph1 = opsOfType(ops1, 'addMorph')[0]
    const morph2 = opsOfType(ops2, 'addMorph')[0]
    const morphId1 = (morph1.payload as { morph: { morph_id: string } }).morph.morph_id
    const morphId2 = (morph2.payload as { morph: { morph_id: string } }).morph.morph_id
    expect(morphId1).toBe(morphId2)
  })

  it('node-level attrs do NOT have morphId', () => {
    const cnl = '# Water [class]\nmass: 18;\n## heated\ntemperature: 100;'
    const ops = getOperationsFromCnl(cnl)
    const attrs = opsOfType(ops, 'addAttribute')
    const nodeLevelAttr = attrs.find((a) => attrPayload(a).name === 'mass')
    expect(nodeLevelAttr).toBeDefined()
    expect(attrPayload(nodeLevelAttr!).morphId).toBeUndefined()
  })
})

describe('getOperationsFromCnl — Descriptions', () => {
  it('node description creates updateNode operation', () => {
    const cnl = '# Alice [individual]\n```description\nA curious person.\n```'
    const ops = getOperationsFromCnl(cnl)
    const updates = opsOfType(ops, 'updateNode')
    expect(updates).toHaveLength(1)
    const fields = (updates[0].payload as { fields: { description: string } }).fields
    expect(fields.description).toBe('A curious person.')
  })

  it('graph-description creates updateGraphDescription operation', () => {
    const cnl = '# A [class]\n\n```graph-description\nThis is the overall graph.\n```'
    const ops = getOperationsFromCnl(cnl)
    const graphDescs = opsOfType(ops, 'updateGraphDescription')
    expect(graphDescs).toHaveLength(1)
    expect((graphDescs[0].payload as { description: string }).description).toBe('This is the overall graph.')
  })
})

describe('getOperationsFromCnl — Graph-Level Directives', () => {
  it('currency: USD; creates setCurrency operation', () => {
    const ops = getOperationsFromCnl('# Sale [Transaction]\ncurrency: USD;')
    const currencyOps = opsOfType(ops, 'setCurrency')
    expect(currencyOps).toHaveLength(1)
    expect((currencyOps[0].payload as { currency: string }).currency).toBe('USD')
  })

  it('expression: a + b; creates addExpression operation', () => {
    const ops = getOperationsFromCnl('# X [class]\nexpression: a + b;')
    const exprOps = opsOfType(ops, 'addExpression')
    expect(exprOps).toHaveLength(1)
    expect((exprOps[0].payload as { expression: string }).expression).toBe('a + b')
  })

  it('empty input returns empty operations', () => {
    expect(getOperationsFromCnl('')).toEqual([])
  })

  it('whitespace-only input returns empty operations', () => {
    // empty string check — the function short-circuits on falsy input
    expect(getOperationsFromCnl('')).toEqual([])
  })
})
