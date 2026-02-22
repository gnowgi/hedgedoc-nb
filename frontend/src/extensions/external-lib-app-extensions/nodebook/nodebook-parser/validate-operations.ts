/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { attributeTypes as defaultAttributeTypes, nodeTypes as defaultNodeTypes, relationTypes as defaultRelationTypes } from './schemas'
import type { MergedSchemas } from './schema-store'
import type { CnlOperation, CnlParseError } from './types'

/** Relation names (normalized) that represent class-to-class subsumption. */
const IS_A_NAMES = new Set(['is_a', 'is a'])

/**
 * Validate parsed operations against schemas.
 * If schemas are provided, uses those; otherwise falls back to defaults.
 * Returns advisory warnings (does not block rendering).
 */
export function validateOperations(operations: CnlOperation[], schemas?: MergedSchemas): CnlParseError[] {
  const errors: CnlParseError[] = []
  const nodeTypes = schemas?.nodeTypes ?? defaultNodeTypes
  const attributeTypes = schemas?.attributeTypes ?? defaultAttributeTypes
  const relationTypes = schemas?.relationTypes ?? defaultRelationTypes

  // Build a map of nodeId → role for domain/range checking
  const nodeRoles = new Map<string, string>()
  for (const op of operations) {
    if (op.type === 'addNode') {
      const options = op.payload.options as { role?: string } | undefined
      const role = options?.role ?? (op.payload.role as string | undefined) ?? 'individual'
      nodeRoles.set(op.id, role)
    }
  }

  // Track surface forms per normalized node ID for duplicate detection
  const surfaceForms = new Map<string, Set<string>>()
  for (const op of operations) {
    if (op.type === 'addNode') {
      const displayName = (op.payload.displayName as string) ?? (op.payload.base_name as string)
      if (displayName) {
        const existing = surfaceForms.get(op.id) ?? new Set()
        existing.add(displayName)
        surfaceForms.set(op.id, existing)
      }
    }
  }

  for (const op of operations) {
    if (op.type === 'addNode') {
      const options = op.payload.options as { role?: string } | undefined
      const role = options?.role
      if (role && role !== 'individual' && role !== 'class' && !nodeTypes.find((nt) => nt.name === role)) {
        errors.push({ message: `Unknown node type "${role}". Known types: ${nodeTypes.map((nt) => nt.name).join(', ')}` })
      }
    } else if (op.type === 'addAttribute') {
      const name = op.payload.name as string
      if (!attributeTypes.find((at) => at.name === name)) {
        errors.push({ message: `Unknown attribute type "${name}"` })
      }
    } else if (op.type === 'addRelation') {
      const name = op.payload.name as string
      if (!relationTypes.find((rt) => rt.name === name || rt.aliases?.includes(name))) {
        errors.push({ message: `Unknown relation type "${name}"` })
      }

      // Check: <is a> should only be used between classes, not from/to individuals
      if (IS_A_NAMES.has(name)) {
        const sourceId = op.payload.source as string
        const sourceRole = nodeRoles.get(sourceId)
        if (sourceRole === 'individual') {
          const targetId = op.payload.target as string
          errors.push({
            message: `"<is a>" is for type-to-type subsumption (class → class). "${sourceId}" is an individual — use "<member of>" or "<instance of>" instead to relate it to "${targetId}".`
          })
        }
      }
    }
  }

  // Warn about consolidated surface forms (plural/case variants merged into one node)
  for (const [nodeId, forms] of surfaceForms) {
    if (forms.size > 1) {
      const formList = Array.from(forms).map((f) => `"${f}"`).join(', ')
      errors.push({
        message: `Multiple forms ${formList} were consolidated into a single node "${nodeId}". Use a consistent name to avoid confusion.`
      })
    }
  }

  return errors
}
