/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
// @vitest-environment jsdom
import { getMergedSchemas, getUserSchemas, setUserSchemas } from '@nodebook/core'
import { registerSchemaSource, renderNodeBookSchema, unregisterSchemaSource } from './schemas'

afterEach(() => setUserSchemas(null))

describe('schema source registry', () => {
  it('merges live sources into the store; later sources win by name', () => {
    registerSchemaSource('a', 'nodeType: Rocket, A vehicle')
    registerSchemaSource('b', 'nodeType: Rocket, Overridden\nnodeType: Fuel, Propellant')
    const user = getUserSchemas()!
    expect(user.nodeTypes.find((t) => t.name === 'Rocket')!.description).toBe('Overridden')
    expect(user.nodeTypes.map((t) => t.name).sort()).toEqual(['Fuel', 'Rocket'])

    unregisterSchemaSource('b')
    expect(getUserSchemas()!.nodeTypes.find((t) => t.name === 'Rocket')!.description).toBe('A vehicle')

    unregisterSchemaSource('a')
    expect(getUserSchemas()).toBeNull()
  })

  it('merged view keeps factory defaults underneath', () => {
    registerSchemaSource('x', 'nodeType: Rocket, A vehicle')
    const merged = getMergedSchemas()
    expect(merged.nodeTypes.some((t) => t.name === 'Rocket')).toBe(true)
    expect(merged.relationTypes.some((t) => t.name === 'is_a')).toBe(true)
    unregisterSchemaSource('x')
  })
})

describe('renderNodeBookSchema', () => {
  it('renders a summary panel, contributes to the store, and cleans up', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = renderNodeBookSchema(el, 'nodeType: Rocket, A vehicle\nrelationType: launches, Sends up, domain: Rocket', {
      sourceId: 'panel-test'
    })
    expect(el.textContent).toContain('Node types (1)')
    expect(el.textContent).toContain('Rocket')
    expect(el.textContent).toContain('Relation types (1)')
    expect(getUserSchemas()!.nodeTypes.some((t) => t.name === 'Rocket')).toBe(true)

    handle.destroy()
    expect(getUserSchemas()).toBeNull()
    expect(el.textContent).toBe('')
  })

  it('surfaces parse errors', () => {
    const el = document.createElement('div')
    const handle = renderNodeBookSchema(el, 'attributeType: broken', { contribute: false })
    expect(handle.result.errors.length).toBeGreaterThan(0)
    expect(el.textContent).toContain('line 1')
    handle.destroy()
  })
})
