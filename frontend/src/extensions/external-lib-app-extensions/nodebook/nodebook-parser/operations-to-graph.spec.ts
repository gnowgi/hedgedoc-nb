/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { operationsToGraph } from './operations-to-graph'
import type { CnlOperation } from './types'

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
