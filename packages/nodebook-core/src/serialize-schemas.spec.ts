/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  attributeTypes,
  functionTypes,
  nodeTypes,
  parseSchemaBlock,
  relationTypes,
  serializeSchemas,
  transitionTypes
} from '@nodebook/core'

describe('serializeSchemas', () => {
  it('round-trips the factory defaults through parseSchemaBlock', () => {
    const text = serializeSchemas({
      nodeTypes,
      relationTypes,
      attributeTypes,
      transitionTypes,
      functionTypes
    })
    const parsed = parseSchemaBlock(text)
    expect(parsed.errors).toEqual([])

    expect(parsed.schemas.nodeTypes.map((t) => t.name).sort()).toEqual(nodeTypes.map((t) => t.name).sort())
    expect(parsed.schemas.relationTypes.map((t) => t.name).sort()).toEqual(
      relationTypes.map((t) => t.name).sort()
    )
    const simpleAttrs = attributeTypes.filter((t) => !t.structure && !t.complex_type)
    expect(parsed.schemas.attributeTypes.map((t) => t.name).sort()).toEqual(simpleAttrs.map((t) => t.name).sort())
    expect(parsed.schemas.transitionTypes.map((t) => t.name).sort()).toEqual(
      transitionTypes.map((t) => t.name).sort()
    )
    expect(parsed.schemas.functionTypes.map((t) => t.name).sort()).toEqual(functionTypes.map((t) => t.name).sort())

    // structural fidelity for the relation extras that inference depends on
    for (const original of relationTypes) {
      const roundTripped = parsed.schemas.relationTypes.find((t) => t.name === original.name)!
      expect(roundTripped.domain).toEqual(original.domain)
      expect(roundTripped.range).toEqual(original.range)
      expect(roundTripped.symmetric ?? undefined).toBe(original.symmetric ?? undefined)
      expect(roundTripped.transitive ?? undefined).toBe(original.transitive ?? undefined)
      expect(roundTripped.inverse_name ?? undefined).toBe(original.inverse_name ?? undefined)
    }
  })

  it('quotes commas and strips colons from free text', () => {
    const text = serializeSchemas({
      nodeTypes: [{ name: 'X', description: 'One, two: three', parent_types: [] }],
      relationTypes: [],
      attributeTypes: [],
      transitionTypes: [],
      functionTypes: []
    })
    const parsed = parseSchemaBlock(text)
    expect(parsed.errors).toEqual([])
    expect(parsed.schemas.nodeTypes[0].description).toBe('One, two — three')
  })
})
