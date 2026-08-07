/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
// @vitest-environment jsdom
import { hydrateNodeBookBlocks } from './render'

describe('hydrateNodeBookBlocks', () => {
  it('hydrates every placeholder exactly once', () => {
    document.body.innerHTML = [
      '<div class="nodebook-block" data-nodebook="# Water [Substance]"></div>',
      '<div class="nodebook-block" data-nodebook="# Fire [Element]"></div>',
      '<div>untouched</div>'
    ].join('')

    const first = hydrateNodeBookBlocks(document.body, { headless: true })
    expect(first).toHaveLength(2)
    expect(first[0].graph.nodes.map((n) => n.id)).toContain('water')

    const second = hydrateNodeBookBlocks(document.body, { headless: true })
    expect(second).toHaveLength(0)

    for (const handle of first) handle.destroy()
  })

  it('honours a custom data attribute', () => {
    document.body.innerHTML = '<div data-cnl="# A [B]"></div>'
    const handles = hydrateNodeBookBlocks(document.body, { headless: true, dataAttribute: 'data-cnl' })
    expect(handles).toHaveLength(1)
    expect(handles[0].graph.nodes.map((n) => n.id)).toContain('a')
    for (const handle of handles) handle.destroy()
  })
})
