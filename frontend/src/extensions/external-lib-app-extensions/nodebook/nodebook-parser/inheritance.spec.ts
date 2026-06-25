/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getInheritedAttributes, operationsToGraph, getOperationsFromCnl } from '@nodebook/core'

/** Build a graph straight from CNL for end-to-end inheritance assertions. */
function graphFromCnl(cnl: string) {
  return operationsToGraph(getOperationsFromCnl(cnl))
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
