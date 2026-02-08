/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { attributeTypes, nodeTypes, relationTypes } from './schemas'
import type { CnlOperation, CnlParseError } from './types'

/**
 * Validate parsed operations against the embedded schemas.
 * Returns advisory warnings (does not block rendering).
 */
export function validateOperations(operations: CnlOperation[]): CnlParseError[] {
  const errors: CnlParseError[] = []

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
      if (!relationTypes.find((rt) => rt.name === name)) {
        errors.push({ message: `Unknown relation type "${name}"` })
      }
    }
  }

  return errors
}
