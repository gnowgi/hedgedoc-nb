/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
// Runs in the plain node environment on purpose: the package entry point —
// including the web-component module — must be importable without a DOM,
// because headless rendering is a supported use.
import * as api from './index'

describe('package entry point without a DOM', () => {
  it('imports cleanly and exposes the public API', () => {
    expect(typeof api.renderNodeBook).toBe('function')
    expect(typeof api.hydrateNodeBookBlocks).toBe('function')
    expect(typeof api.buildCytoscapeElements).toBe('function')
    expect(typeof api.defineNodeBookElement).toBe('function')
    expect(typeof api.NodeBookGraphElement).toBe('function')
  })

  it('renders headlessly without a DOM', () => {
    const handle = api.renderNodeBook(null, '# A [B]', { headless: true })
    try {
      expect(handle.cy.nodes().length).toBe(2)
    } finally {
      handle.destroy()
    }
  })

  it('defineNodeBookElement fails with a clear error without a DOM', () => {
    expect(() => api.defineNodeBookElement()).toThrow(/DOM environment/)
  })
})
