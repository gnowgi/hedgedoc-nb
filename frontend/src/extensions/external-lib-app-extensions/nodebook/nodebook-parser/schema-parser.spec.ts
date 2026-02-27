/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { mergeSchemaResults, parseSchemaBlock } from './schema-parser'

describe('parseSchemaBlock', () => {
  describe('nodeType lines', () => {
    it('parses a basic nodeType with name only', () => {
      const result = parseSchemaBlock('nodeType: Planet')
      expect(result.errors).toHaveLength(0)
      expect(result.schemas.nodeTypes).toHaveLength(1)
      expect(result.schemas.nodeTypes[0].name).toBe('Planet')
      expect(result.schemas.nodeTypes[0].description).toBe('')
      expect(result.schemas.nodeTypes[0].parent_types).toEqual([])
    })

    it('parses nodeType with description and parent', () => {
      const result = parseSchemaBlock('nodeType: Star, A luminous body, parent:Celestial|Object')
      expect(result.errors).toHaveLength(0)
      const nt = result.schemas.nodeTypes[0]
      expect(nt.name).toBe('Star')
      expect(nt.description).toBe('A luminous body')
      expect(nt.parent_types).toEqual(['Celestial', 'Object'])
    })
  })

  describe('relationType lines', () => {
    it('parses a basic relationType', () => {
      const result = parseSchemaBlock('relationType: orbits, One body orbits another')
      expect(result.errors).toHaveLength(0)
      const rt = result.schemas.relationTypes[0]
      expect(rt.name).toBe('orbits')
      expect(rt.description).toBe('One body orbits another')
    })

    it('parses relationType with domain, range, symmetric, transitive, inverse', () => {
      const input =
        'relationType: orbits, domain:Planet|Moon, range:Star, symmetric:true, transitive:false, inverse:orbited_by'
      const result = parseSchemaBlock(input)
      expect(result.errors).toHaveLength(0)
      const rt = result.schemas.relationTypes[0]
      expect(rt.name).toBe('orbits')
      expect(rt.domain).toEqual(['Planet', 'Moon'])
      expect(rt.range).toEqual(['Star'])
      expect(rt.symmetric).toBe(true)
      expect(rt.transitive).toBe(false)
      expect(rt.inverse_name).toBe('orbited_by')
    })
  })

  describe('attributeType lines', () => {
    it('parses attributeType with name and data_type', () => {
      const result = parseSchemaBlock('attributeType: radius, float')
      expect(result.errors).toHaveLength(0)
      const at = result.schemas.attributeTypes[0]
      expect(at.name).toBe('radius')
      expect(at.data_type).toBe('float')
    })

    it('parses attributeType with unit, domain, values', () => {
      const input = 'attributeType: color, string, The color, unit:nm, domain:Object|Vehicle, values:red|green|blue'
      const result = parseSchemaBlock(input)
      expect(result.errors).toHaveLength(0)
      const at = result.schemas.attributeTypes[0]
      expect(at.name).toBe('color')
      expect(at.data_type).toBe('string')
      expect(at.description).toBe('The color')
      expect(at.unit).toBe('nm')
      expect(at.domain).toEqual(['Object', 'Vehicle'])
      expect(at.allowed_values).toEqual(['red', 'green', 'blue'])
    })

    it('errors when fewer than 2 fields', () => {
      const result = parseSchemaBlock('attributeType: onlyname')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('requires at least: name, data_type')
    })
  })

  describe('transitionType lines', () => {
    it('parses transitionType with inputs and outputs', () => {
      const result = parseSchemaBlock('transitionType: combustion, Burns fuel, inputs:Fuel|Oxygen, outputs:CO2|Water')
      expect(result.errors).toHaveLength(0)
      const tt = result.schemas.transitionTypes[0]
      expect(tt.name).toBe('combustion')
      expect(tt.description).toBe('Burns fuel')
      expect(tt.inputs).toEqual(['Fuel', 'Oxygen'])
      expect(tt.outputs).toEqual(['CO2', 'Water'])
    })
  })

  describe('functionType lines', () => {
    it('parses functionType with name and definition', () => {
      const result = parseSchemaBlock('functionType: area, length * width')
      expect(result.errors).toHaveLength(0)
      const ft = result.schemas.functionTypes[0]
      expect(ft.name).toBe('area')
      expect(ft.definition).toBe('length * width')
    })

    it('parses functionType with scope and description', () => {
      const result = parseSchemaBlock(
        'functionType: area, length * width, scope:Rectangle|Square, description:Computes area'
      )
      expect(result.errors).toHaveLength(0)
      const ft = result.schemas.functionTypes[0]
      expect(ft.scope).toEqual(['Rectangle', 'Square'])
      expect(ft.description).toBe('Computes area')
    })

    it('errors when fewer than 2 fields', () => {
      const result = parseSchemaBlock('functionType: onlyname')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('requires at least: name, definition')
    })
  })

  describe('unknown prefix', () => {
    it('produces an error for unknown type prefix', () => {
      const result = parseSchemaBlock('fooType: Bar, Baz')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Unknown type prefix "footype"')
    })
  })

  describe('missing fields', () => {
    it('produces error for line without colon', () => {
      const result = parseSchemaBlock('This has no prefix colon')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Missing type prefix')
    })
  })

  describe('comments and blank lines', () => {
    it('skips comment lines starting with #', () => {
      const input = ['# This is a comment', 'nodeType: Planet'].join('\n')
      const result = parseSchemaBlock(input)
      expect(result.errors).toHaveLength(0)
      expect(result.schemas.nodeTypes).toHaveLength(1)
    })

    it('skips blank lines', () => {
      const input = ['', 'nodeType: Star', '', 'nodeType: Planet', ''].join('\n')
      const result = parseSchemaBlock(input)
      expect(result.errors).toHaveLength(0)
      expect(result.schemas.nodeTypes).toHaveLength(2)
    })
  })

  describe('quoted fields', () => {
    it('handles double-quoted fields with commas inside', () => {
      const input = 'nodeType: Planet, "A round, celestial body"'
      const result = parseSchemaBlock(input)
      expect(result.errors).toHaveLength(0)
      expect(result.schemas.nodeTypes[0].description).toBe('A round, celestial body')
    })

    it('handles single-quoted fields', () => {
      const input = "nodeType: Planet, 'Has moons, sometimes'"
      const result = parseSchemaBlock(input)
      expect(result.errors).toHaveLength(0)
      expect(result.schemas.nodeTypes[0].description).toBe('Has moons, sometimes')
    })
  })

  describe('pipe-separated lists', () => {
    it('parses multiple pipe-separated parents', () => {
      const result = parseSchemaBlock('nodeType: Hybrid, parent:A|B|C')
      expect(result.errors).toHaveLength(0)
      expect(result.schemas.nodeTypes[0].parent_types).toEqual(['A', 'B', 'C'])
    })

    it('handles single value with no pipe', () => {
      const result = parseSchemaBlock('nodeType: Star, parent:Celestial')
      expect(result.errors).toHaveLength(0)
      expect(result.schemas.nodeTypes[0].parent_types).toEqual(['Celestial'])
    })
  })

  describe('multiple lines parsed together', () => {
    it('parses a mixed schema block', () => {
      const input = [
        'nodeType: Planet',
        'relationType: orbits',
        'attributeType: mass, float',
        'transitionType: collision',
        'functionType: gravity, G * m1 * m2 / r^2'
      ].join('\n')
      const result = parseSchemaBlock(input)
      expect(result.errors).toHaveLength(0)
      expect(result.schemas.nodeTypes).toHaveLength(1)
      expect(result.schemas.relationTypes).toHaveLength(1)
      expect(result.schemas.attributeTypes).toHaveLength(1)
      expect(result.schemas.transitionTypes).toHaveLength(1)
      expect(result.schemas.functionTypes).toHaveLength(1)
    })
  })
})

describe('mergeSchemaResults', () => {
  it('deduplicates by name (last wins)', () => {
    const r1 = parseSchemaBlock('nodeType: Planet, First description')
    const r2 = parseSchemaBlock('nodeType: Planet, Second description')
    const merged = mergeSchemaResults([r1, r2])
    expect(merged.schemas.nodeTypes).toHaveLength(1)
    expect(merged.schemas.nodeTypes[0].description).toBe('Second description')
  })

  it('accumulates errors from all results', () => {
    const r1 = parseSchemaBlock('badPrefix: whatever')
    const r2 = parseSchemaBlock('alsoBad: stuff')
    const merged = mergeSchemaResults([r1, r2])
    expect(merged.errors).toHaveLength(2)
  })

  it('merges different types across results', () => {
    const r1 = parseSchemaBlock('nodeType: Planet')
    const r2 = parseSchemaBlock('relationType: orbits')
    const merged = mergeSchemaResults([r1, r2])
    expect(merged.schemas.nodeTypes).toHaveLength(1)
    expect(merged.schemas.relationTypes).toHaveLength(1)
  })

  it('handles empty input array', () => {
    const merged = mergeSchemaResults([])
    expect(merged.schemas.nodeTypes).toHaveLength(0)
    expect(merged.errors).toHaveLength(0)
  })
})
