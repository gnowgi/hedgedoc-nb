/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
// @vitest-environment jsdom
import { getOperationsFromCnl, operationsToGraph } from '@nodebook/core'
import type { CnlGraphData } from '@nodebook/core'
import { buildInspectorContent, buildToolbar } from './ui'

const MORPHIC = [
  '# Water [Substance]',
  'state: liquid;',
  '<part of> Ocean;',
  '',
  '## frozen',
  '    state: solid;'
].join('\n')

function graphFromCnl(cnl: string): CnlGraphData {
  return operationsToGraph(getOperationsFromCnl(cnl))
}

describe('buildInspectorContent', () => {
  it('shows name, role, morph switcher, attributes, and relations', () => {
    const graph = graphFromCnl(MORPHIC)
    const panel = buildInspectorContent(document, 'water', {
      graph,
      activeMorphs: {},
      onMorphSelect: () => {},
      onClose: () => {}
    })

    expect(panel.querySelector('h3')!.textContent).toBe('Water')
    expect(panel.querySelector('.nb-ui-role')!.textContent).toBe('class')

    const morphButtons = [...panel.querySelectorAll<HTMLButtonElement>('.nb-ui-morph-btn')]
    expect(morphButtons.map((b) => b.textContent)).toEqual(['basic', 'frozen'])
    expect(morphButtons[0].classList.contains('nb-ui-active')).toBe(true)

    const text = panel.textContent!
    expect(text).toContain('state: liquid')
    expect(text).toContain('part of → Ocean')
  })

  it('marks the selected morph active and reflects its attributes', () => {
    const graph = graphFromCnl(MORPHIC)
    const frozen = graph.nodes.find((n) => n.id === 'water')!.morphs.find((m) => m.name === 'frozen')!
    const panel = buildInspectorContent(document, 'water', {
      graph,
      activeMorphs: { water: frozen.morph_id },
      onMorphSelect: () => {},
      onClose: () => {}
    })

    const active = panel.querySelector('.nb-ui-morph-btn.nb-ui-active')!
    expect(active.textContent).toBe('frozen')
    expect(panel.textContent).toContain('state: solid')
    expect(panel.textContent).not.toContain('state: liquid')
  })

  it('clicking a morph button reports the node and morph id', () => {
    const graph = graphFromCnl(MORPHIC)
    const selections: Array<[string, string]> = []
    const panel = buildInspectorContent(document, 'water', {
      graph,
      activeMorphs: {},
      onMorphSelect: (nodeId, morphId) => selections.push([nodeId, morphId]),
      onClose: () => {}
    })

    const frozenBtn = [...panel.querySelectorAll<HTMLButtonElement>('.nb-ui-morph-btn')].find(
      (b) => b.textContent === 'frozen'
    )!
    frozenBtn.click()
    const frozenId = graph.nodes.find((n) => n.id === 'water')!.morphs.find((m) => m.name === 'frozen')!.morph_id
    expect(selections).toEqual([['water', frozenId]])
  })

  it('omits the morph section for single-state nodes and calls onClose', () => {
    const graph = graphFromCnl('# Sun [Star]')
    let closed = false
    const panel = buildInspectorContent(document, 'sun', {
      graph,
      activeMorphs: {},
      onMorphSelect: () => {},
      onClose: () => {
        closed = true
      }
    })
    expect(panel.querySelectorAll('.nb-ui-morph-btn')).toHaveLength(0)
    panel.querySelector<HTMLButtonElement>('.nb-ui-close')!.click()
    expect(closed).toBe(true)
  })

  it('lists incoming relations from the counterparty side', () => {
    const graph = graphFromCnl('# Ocean [Place]\n\n# Water [Substance]\n<part of> Ocean;')
    const panel = buildInspectorContent(document, 'ocean', {
      graph,
      activeMorphs: {},
      onMorphSelect: () => {},
      onClose: () => {}
    })
    expect(panel.textContent).toContain('Water → part of')
  })
})

describe('buildToolbar', () => {
  it('wires fit, layout change, and export callbacks', () => {
    const calls: string[] = []
    const bar = buildToolbar(document, {
      layouts: ['breadthfirst', 'cose'],
      currentLayout: () => 'breadthfirst',
      onFit: () => calls.push('fit'),
      onRelayout: (layout) => calls.push(`layout:${layout}`),
      onExportPng: () => calls.push('png')
    })

    const buttons = [...bar.querySelectorAll<HTMLButtonElement>('.nb-ui-btn')]
    expect(buttons.map((b) => b.textContent)).toEqual(['Fit', 'PNG'])
    buttons[0].click()
    buttons[1].click()

    const select = bar.querySelector<HTMLSelectElement>('.nb-ui-select')!
    expect(select.value).toBe('breadthfirst')
    select.value = 'cose'
    select.dispatchEvent(new Event('change'))

    expect(calls).toEqual(['fit', 'png', 'layout:cose'])
  })
})
