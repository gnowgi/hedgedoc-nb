/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { renderNodeBook } from './render'

const WATER = '# Water [Substance]\nboiling_point: 100 *C*;\n<part of> Ocean;'

describe('renderNodeBook (headless)', () => {
  it('renders a parsed graph into a cytoscape instance', () => {
    const handle = renderNodeBook(null, WATER, { headless: true })
    try {
      expect(handle.errors).toHaveLength(0)
      // Schema warnings (unknown attribute/relation types) are advisory only.
      expect(handle.warnings.map((w) => w.message)).toEqual([
        'Unknown attribute type "boiling_point"',
        'Unknown relation type "part of"'
      ])
      expect(handle.graph.nodes.map((n) => n.id)).toEqual(expect.arrayContaining(['water', 'substance', 'ocean']))
      // 3 concepts + 1 attribute leaf
      expect(handle.cy.nodes().length).toBe(4)
      // is_a + part-of + attribute edge
      expect(handle.cy.edges().length).toBe(3)
    } finally {
      handle.destroy()
    }
  })

  it('requires a container unless headless', () => {
    expect(() => renderNodeBook(null, WATER)).toThrow(/container/)
  })

  it('reports parse problems while still rendering what it can', () => {
    const handle = renderNodeBook(null, '# Water [Substance]\n<unclosed relation\n', { headless: true })
    try {
      expect(handle.cy.nodes().length).toBeGreaterThan(0)
    } finally {
      handle.destroy()
    }
  })

  it('setMorph swaps the visible members of a node', () => {
    const cnl = ['# Water [Substance]', 'state: liquid;', '', '## frozen', '    state: solid;'].join('\n')
    const handle = renderNodeBook(null, cnl, { headless: true })
    try {
      const labelsBefore = handle.cy.nodes().map((n) => String(n.data('label')))
      expect(labelsBefore.join(' ')).toContain('liquid')

      handle.setMorph('water', 'frozen')
      const labelsAfter = handle.cy.nodes().map((n) => String(n.data('label')))
      expect(labelsAfter.join(' ')).toContain('solid')
      expect(labelsAfter.join(' ')).not.toContain('liquid')
    } finally {
      handle.destroy()
    }
  })

  it('rejects unknown nodes and morphs with helpful errors', () => {
    const handle = renderNodeBook(null, WATER, { headless: true })
    try {
      expect(() => handle.setMorph('nope', 'x')).toThrow(/unknown node/)
      expect(() => handle.setMorph('water', 'gaseous')).toThrow(/no morph/)
    } finally {
      handle.destroy()
    }
  })
})
