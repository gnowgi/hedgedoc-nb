/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { getOperationsFromCnl, operationsToGraph } from '@nodebook/core'
import type { CnlGraphData } from '@nodebook/core'
import { buildProcessModel, circledNumber, computeProcessPositions, fireTransition, isTransitionEnabled, placeLabel } from './simulation'

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

describe('computeProcessPositions', () => {
  it('layers inputs, transitions, and outputs left to right', () => {
    const model = buildProcessModel(graphFromCnl(BURN))!
    const positions = computeProcessPositions(model, ['burn', 'fuel', 'oxygen', 'smoke'], new Map())
    expect(positions.get('fuel')!.x).toBe(0)
    expect(positions.get('oxygen')!.x).toBe(0)
    expect(positions.get('burn')!.x).toBeGreaterThan(positions.get('fuel')!.x)
    expect(positions.get('smoke')!.x).toBeGreaterThan(positions.get('burn')!.x)
  })

  it('terminates and assigns layers on cyclic processes', () => {
    const cnl = [
      '# Step1 [Transition]',
      '<has prior_state> A;',
      '<has post_state> B;',
      '',
      '# Step2 [Transition]',
      '<has prior_state> B;',
      '<has post_state> A;'
    ].join('\n')
    const model = buildProcessModel(graphFromCnl(cnl))!
    const positions = computeProcessPositions(model, ['step1', 'step2', 'a', 'b'], new Map())
    expect(positions.size).toBe(4)
  })

  it('places attribute leaves below their owner', () => {
    const model = buildProcessModel(graphFromCnl(BURN))!
    const positions = computeProcessPositions(model, ['burn', 'fuel', 'oxygen', 'smoke'], new Map([['attr1', 'fuel']]))
    expect(positions.get('attr1')!.x).toBe(positions.get('fuel')!.x)
    expect(positions.get('attr1')!.y).toBeGreaterThan(positions.get('fuel')!.y)
  })
})

describe('circledNumber', () => {
  it('renders circled digits and falls back beyond 20', () => {
    expect(circledNumber(2)).toBe('②')
    expect(circledNumber(20)).toBe('⑳')
    expect(circledNumber(21)).toBe('(21)')
    expect(circledNumber(1.5)).toBe('(1.5)')
  })
})
