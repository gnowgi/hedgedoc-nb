/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  attributeTypes as defaultAttributeTypes,
  functionTypes as defaultFunctionTypes,
  nodeTypes as defaultNodeTypes,
  relationTypes as defaultRelationTypes,
  transitionTypes as defaultTransitionTypes
} from './schemas'
import type {
  AttributeTypeSchema,
  FunctionTypeSchema,
  NodeTypeSchema,
  RelationTypeSchema,
  TransitionTypeSchema
} from './types'

export interface ParsedUserSchemas {
  nodeTypes: NodeTypeSchema[]
  relationTypes: RelationTypeSchema[]
  attributeTypes: AttributeTypeSchema[]
  transitionTypes: TransitionTypeSchema[]
  functionTypes: FunctionTypeSchema[]
}

export interface MergedSchemas {
  nodeTypes: NodeTypeSchema[]
  relationTypes: RelationTypeSchema[]
  attributeTypes: AttributeTypeSchema[]
  transitionTypes: TransitionTypeSchema[]
  functionTypes: FunctionTypeSchema[]
}

let currentUserSchemas: ParsedUserSchemas | null = null
let storeVersion = 0

export function setUserSchemas(schemas: ParsedUserSchemas | null): void {
  currentUserSchemas = schemas
  storeVersion++
}

export function getUserSchemas(): ParsedUserSchemas | null {
  return currentUserSchemas
}

export function getStoreVersion(): number {
  return storeVersion
}

function mergeByName<T extends { name: string }>(defaults: T[], user: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of defaults) {
    map.set(item.name, item)
  }
  for (const item of user) {
    map.set(item.name, item)
  }
  return Array.from(map.values())
}

export function getMergedSchemas(): MergedSchemas {
  if (!currentUserSchemas) {
    return {
      nodeTypes: defaultNodeTypes,
      relationTypes: defaultRelationTypes,
      attributeTypes: defaultAttributeTypes,
      transitionTypes: defaultTransitionTypes,
      functionTypes: defaultFunctionTypes
    }
  }
  return {
    nodeTypes: mergeByName(defaultNodeTypes, currentUserSchemas.nodeTypes),
    relationTypes: mergeByName(defaultRelationTypes, currentUserSchemas.relationTypes),
    attributeTypes: mergeByName(defaultAttributeTypes, currentUserSchemas.attributeTypes),
    transitionTypes: mergeByName(defaultTransitionTypes, currentUserSchemas.transitionTypes),
    functionTypes: mergeByName(defaultFunctionTypes, currentUserSchemas.functionTypes)
  }
}
