/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getOperationsFromCnl, operationsToGraph } from '@nodebook/core'
import type { CnlGraphData } from '@nodebook/core'
import { buildProcessModel, fireTransition, isTransitionEnabled, placeLabel } from './simulation'

const BURN = [
  '# Burn [Transition]',
  '<has prior_state> 2 Fuel;',
  '<has prior_state> Oxygen;',
  '<has post_state> 2 Smoke;'
].join('\n')

function graphFromCnl(cnl: string): CnlGraphData {
  return operationsToGraph(getOperationsFromCnl(cnl))
}

describe('buildProcessModel', () => {
  it('extracts transitions, arcs with weights, and the initial marking', () => {
    const model = buildProcessModel(graphFromCnl(BURN))!
    expect(model).not.toBeNull()
    expect(model.transitionIds).toEqual(['burn'])
    expect([...model.placeIds].sort()).toEqual(['fuel', 'oxygen', 'smoke'])
    expect(model.priorArcs.get('burn')).toEqual([
      { placeId: 'fuel', weight: 2 },
      { placeId: 'oxygen', weight: 1 }
    ])
    expect(model.postArcs.get('burn')).toEqual([{ placeId: 'smoke', weight: 2 }])
    expect(model.initialMarking.get('fuel')).toBe(2)
    expect(model.initialMarking.get('oxygen')).toBe(1)
    expect(model.initialMarking.get('smoke')).toBe(0)
  })

  it('returns null for graphs without transition arcs', () => {
    expect(buildProcessModel(graphFromCnl('# Water [Substance]\n<part of> Ocean;'))).toBeNull()
  })
})

describe('token game', () => {
  it('fires an enabled transition, consuming and producing by weight', () => {
    const model = buildProcessModel(graphFromCnl(BURN))!
    const m0 = new Map(model.initialMarking)
    expect(isTransitionEnabled(model, m0, 'burn')).toBe(true)

    const m1 = fireTransition(model, m0, 'burn')!
    expect(m1.get('fuel')).toBe(0)
    expect(m1.get('oxygen')).toBe(0)
    expect(m1.get('smoke')).toBe(2)

    // fuel exhausted → disabled, firing returns null
    expect(isTransitionEnabled(model, m1, 'burn')).toBe(false)
    expect(fireTransition(model, m1, 'burn')).toBeNull()
  })

  it('requires the summed weight when multiple arcs hit the same place', () => {
    const cnl = ['# Split [Transition]', '<has prior_state> 2 Pool;', '<has prior_state> Pool;', '<has post_state> Out;'].join('\n')
    const model = buildProcessModel(graphFromCnl(cnl))!
    // initial marking is max arc weight (2), but the summed requirement is 3
    expect(model.initialMarking.get('pool')).toBe(2)
    expect(isTransitionEnabled(model, new Map(model.initialMarking), 'split')).toBe(false)
    expect(isTransitionEnabled(model, new Map([['pool', 3]]), 'split')).toBe(true)
  })
})

describe('placeLabel', () => {
  it('renders dots up to three tokens, then the number', () => {
    expect(placeLabel('Fuel', 0)).toBe('Fuel')
    expect(placeLabel('Fuel', 2)).toBe('Fuel\n●●')
    expect(placeLabel('Fuel', 7)).toBe('Fuel\n7')
  })
})
