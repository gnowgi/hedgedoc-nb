/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
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

// The schema-block grammar treats any comma-separated field containing a
// colon as a key:value pair, so free-text fields must not contain colons;
// commas survive inside quotes.
function field(text: string): string {
  const sanitized = text.replace(/:/g, ' —')
  return /[,]/.test(sanitized) ? `"${sanitized.replace(/"/g, "'")}"` : sanitized
}

function nodeTypeLine(t: NodeTypeSchema): string {
  const parts = [`nodeType: ${t.name}`]
  if (t.description) parts.push(field(t.description))
  if (t.parent_types.length > 0) parts.push(`parent: ${t.parent_types.join('|')}`)
  return parts.join(', ')
}

function relationTypeLine(t: RelationTypeSchema): string {
  const parts = [`relationType: ${t.name}`]
  if (t.description) parts.push(field(t.description))
  if (t.domain.length > 0) parts.push(`domain: ${t.domain.join('|')}`)
  if (t.range.length > 0) parts.push(`range: ${t.range.join('|')}`)
  if (t.symmetric !== undefined) parts.push(`symmetric: ${t.symmetric}`)
  if (t.transitive !== undefined) parts.push(`transitive: ${t.transitive}`)
  if (t.inverse_name) parts.push(`inverse: ${t.inverse_name}`)
  return parts.join(', ')
}

function attributeTypeLine(t: AttributeTypeSchema): string {
  const parts = [`attributeType: ${t.name}`, t.data_type]
  if (t.description) parts.push(field(t.description))
  if (t.unit) parts.push(`unit: ${t.unit}`)
  if (t.domain.length > 0) parts.push(`domain: ${t.domain.join('|')}`)
  if (t.allowed_values && t.allowed_values.length > 0) parts.push(`values: ${t.allowed_values.join('|')}`)
  return parts.join(', ')
}

function transitionTypeLine(t: TransitionTypeSchema): string {
  const parts = [`transitionType: ${t.name}`]
  if (t.description) parts.push(field(t.description))
  if (t.inputs.length > 0) parts.push(`inputs: ${t.inputs.join('|')}`)
  if (t.outputs.length > 0) parts.push(`outputs: ${t.outputs.join('|')}`)
  return parts.join(', ')
}

function functionTypeLine(t: FunctionTypeSchema): string {
  // Definitions regularly contain commas and quotes; the grammar keeps
  // commas inside double quotes, and inner double quotes must flip to
  // single quotes to survive.
  const definition = `"${t.definition.replace(/"/g, "'")}"`
  const parts = [`functionType: ${t.name}`, definition]
  if (t.scope.length > 0) parts.push(`scope: ${t.scope.join('|')}`)
  return parts.join(', ')
}

/**
 * Serialize schemas into ```nodeBook-schema block text that
 * {@link parseSchemaBlock} parses back. Used to seed user-editable schema
 * pages from the factory defaults. Attribute types with complex structures
 * are skipped (the block grammar has no syntax for them).
 */
export function serializeSchemas(schemas: Partial<ParsedUserSchemas>): string {
  const lines: string[] = []
  for (const t of schemas.nodeTypes ?? []) lines.push(nodeTypeLine(t))
  for (const t of schemas.relationTypes ?? []) lines.push(relationTypeLine(t))
  for (const t of schemas.attributeTypes ?? []) {
    if (t.structure || t.complex_type) continue
    lines.push(attributeTypeLine(t))
  }
  for (const t of schemas.transitionTypes ?? []) lines.push(transitionTypeLine(t))
  for (const t of schemas.functionTypes ?? []) lines.push(functionTypeLine(t))
  return lines.join('\n')
}
