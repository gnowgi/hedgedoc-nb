/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type {
  AttributeTypeSchema,
  FunctionTypeSchema,
  NodeTypeSchema,
  RelationTypeSchema,
  TransitionTypeSchema
} from './types'
import type { ParsedUserSchemas } from './schema-store'

export interface SchemaParseError {
  message: string
  line: number
}

export interface SchemaParseResult {
  schemas: ParsedUserSchemas
  errors: SchemaParseError[]
}

type ParsedLine<T> = { value: T; error?: undefined } | { value?: undefined; error: string }

/**
 * Split a string by commas, respecting quoted strings.
 */
function splitFields(str: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''

  for (const ch of str) {
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true
      quoteChar = ch
    } else if (ch === ',') {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current.trim())
  return parts.filter((p) => p.length > 0)
}

/**
 * From an array of field strings, extract key:value pairs.
 * A field is a kv pair if it contains a colon.
 */
function parseKeyValuePairs(parts: string[]): Map<string, string> {
  const kvs = new Map<string, string>()
  for (const part of parts) {
    const colonIdx = part.indexOf(':')
    if (colonIdx > 0) {
      const key = part.substring(0, colonIdx).trim().toLowerCase()
      const value = part.substring(colonIdx + 1).trim()
      kvs.set(key, value)
    }
  }
  return kvs
}

function splitPipeList(value: string): string[] {
  return value
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function parseNodeTypeLine(fields: string[]): ParsedLine<NodeTypeSchema> {
  if (fields.length < 1) {
    return { error: 'nodeType requires at least: name' }
  }
  const name = fields[0]
  // Remaining fields: positional[1] = description, then kv pairs
  const remaining = fields.slice(1)
  const kvs = parseKeyValuePairs(remaining)

  // Description is the first non-kv field
  let description = ''
  for (const f of remaining) {
    if (!f.includes(':')) {
      description = f
      break
    }
  }

  const parentStr = kvs.get('parent') ?? ''
  const parent_types = parentStr ? splitPipeList(parentStr) : []

  return { value: { name, description, parent_types } }
}

function parseRelationTypeLine(fields: string[]): ParsedLine<RelationTypeSchema> {
  if (fields.length < 1) {
    return { error: 'relationType requires at least: name' }
  }
  const name = fields[0]
  const remaining = fields.slice(1)
  const kvs = parseKeyValuePairs(remaining)

  let description = ''
  for (const f of remaining) {
    if (!f.includes(':')) {
      description = f
      break
    }
  }

  const domainStr = kvs.get('domain') ?? ''
  const rangeStr = kvs.get('range') ?? ''
  const domain = domainStr ? splitPipeList(domainStr) : []
  const range = rangeStr ? splitPipeList(rangeStr) : []

  const result: RelationTypeSchema = { name, description, domain, range }

  const symmetricStr = kvs.get('symmetric')
  if (symmetricStr !== undefined) {
    result.symmetric = symmetricStr.toLowerCase() === 'true'
  }
  const transitiveStr = kvs.get('transitive')
  if (transitiveStr !== undefined) {
    result.transitive = transitiveStr.toLowerCase() === 'true'
  }
  const inverseStr = kvs.get('inverse')
  if (inverseStr !== undefined) {
    result.inverse_name = inverseStr
  }

  return { value: result }
}

function parseAttributeTypeLine(fields: string[]): ParsedLine<AttributeTypeSchema> {
  if (fields.length < 2) {
    return { error: 'attributeType requires at least: name, data_type' }
  }
  const name = fields[0]
  const data_type = fields[1]
  const remaining = fields.slice(2)
  const kvs = parseKeyValuePairs(remaining)

  let description = ''
  for (const f of remaining) {
    if (!f.includes(':')) {
      description = f
      break
    }
  }

  const unitStr = kvs.get('unit') ?? null
  const domainStr = kvs.get('domain') ?? ''
  const domain = domainStr ? splitPipeList(domainStr) : []
  const valuesStr = kvs.get('values') ?? null
  const allowed_values = valuesStr ? splitPipeList(valuesStr) : null

  return { value: { name, data_type, description, unit: unitStr, domain, allowed_values } }
}

function parseTransitionTypeLine(fields: string[]): ParsedLine<TransitionTypeSchema> {
  if (fields.length < 1) {
    return { error: 'transitionType requires at least: name' }
  }
  const name = fields[0]
  const remaining = fields.slice(1)
  const kvs = parseKeyValuePairs(remaining)

  let description = ''
  for (const f of remaining) {
    if (!f.includes(':')) {
      description = f
      break
    }
  }

  const inputsStr = kvs.get('inputs') ?? ''
  const outputsStr = kvs.get('outputs') ?? ''
  const inputs = inputsStr ? splitPipeList(inputsStr) : []
  const outputs = outputsStr ? splitPipeList(outputsStr) : []

  return { value: { name, description, inputs, outputs } }
}

function parseFunctionTypeLine(fields: string[]): ParsedLine<FunctionTypeSchema> {
  if (fields.length < 2) {
    return { error: 'functionType requires at least: name, expression' }
  }
  const name = fields[0]
  const expression = fields[1]
  const remaining = fields.slice(2)
  const kvs = parseKeyValuePairs(remaining)

  const scopeStr = kvs.get('scope') ?? ''
  const scope = scopeStr ? splitPipeList(scopeStr) : []
  const descStr = kvs.get('description')

  const result: FunctionTypeSchema = { name, expression, scope }
  if (descStr !== undefined) {
    result.description = descStr
  }

  return { value: result }
}

/**
 * Parse a nodeBook-schema code block into structured schema data.
 */
export function parseSchemaBlock(text: string): SchemaParseResult {
  const nodeTypes: NodeTypeSchema[] = []
  const relationTypes: RelationTypeSchema[] = []
  const attributeTypes: AttributeTypeSchema[] = []
  const transitionTypes: TransitionTypeSchema[] = []
  const functionTypes: FunctionTypeSchema[] = []
  const errors: SchemaParseError[] = []

  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (raw === '' || raw.startsWith('#')) continue

    const lineNum = i + 1

    // Find the first colon to get the prefix
    const colonIdx = raw.indexOf(':')
    if (colonIdx < 0) {
      errors.push({ message: `Line ${lineNum}: Missing type prefix (e.g., "nodeType:")`, line: lineNum })
      continue
    }

    const prefix = raw.substring(0, colonIdx).trim().toLowerCase()
    const rest = raw.substring(colonIdx + 1).trim()
    const fields = splitFields(rest)

    switch (prefix) {
      case 'nodetype': {
        const result = parseNodeTypeLine(fields)
        if (result.error) {
          errors.push({ message: `Line ${lineNum}: ${result.error}`, line: lineNum })
        } else {
          nodeTypes.push(result.value)
        }
        break
      }
      case 'relationtype': {
        const result = parseRelationTypeLine(fields)
        if (result.error) {
          errors.push({ message: `Line ${lineNum}: ${result.error}`, line: lineNum })
        } else {
          relationTypes.push(result.value)
        }
        break
      }
      case 'attributetype': {
        const result = parseAttributeTypeLine(fields)
        if (result.error) {
          errors.push({ message: `Line ${lineNum}: ${result.error}`, line: lineNum })
        } else {
          attributeTypes.push(result.value)
        }
        break
      }
      case 'transitiontype': {
        const result = parseTransitionTypeLine(fields)
        if (result.error) {
          errors.push({ message: `Line ${lineNum}: ${result.error}`, line: lineNum })
        } else {
          transitionTypes.push(result.value)
        }
        break
      }
      case 'functiontype': {
        const result = parseFunctionTypeLine(fields)
        if (result.error) {
          errors.push({ message: `Line ${lineNum}: ${result.error}`, line: lineNum })
        } else {
          functionTypes.push(result.value)
        }
        break
      }
      default:
        errors.push({ message: `Line ${lineNum}: Unknown type prefix "${prefix}"`, line: lineNum })
    }
  }

  return {
    schemas: { nodeTypes, relationTypes, attributeTypes, transitionTypes, functionTypes },
    errors
  }
}

/**
 * Merge multiple schema parse results, deduplicating by name (last wins).
 */
export function mergeSchemaResults(results: SchemaParseResult[]): SchemaParseResult {
  const allErrors: SchemaParseError[] = []
  const nodeMap = new Map<string, NodeTypeSchema>()
  const relMap = new Map<string, RelationTypeSchema>()
  const attrMap = new Map<string, AttributeTypeSchema>()
  const transMap = new Map<string, TransitionTypeSchema>()
  const funcMap = new Map<string, FunctionTypeSchema>()

  for (const result of results) {
    allErrors.push(...result.errors)
    for (const nt of result.schemas.nodeTypes) nodeMap.set(nt.name, nt)
    for (const rt of result.schemas.relationTypes) relMap.set(rt.name, rt)
    for (const at of result.schemas.attributeTypes) attrMap.set(at.name, at)
    for (const tt of result.schemas.transitionTypes) transMap.set(tt.name, tt)
    for (const ft of result.schemas.functionTypes) funcMap.set(ft.name, ft)
  }

  return {
    schemas: {
      nodeTypes: Array.from(nodeMap.values()),
      relationTypes: Array.from(relMap.values()),
      attributeTypes: Array.from(attrMap.values()),
      transitionTypes: Array.from(transMap.values()),
      functionTypes: Array.from(funcMap.values())
    },
    errors: allErrors
  }
}
