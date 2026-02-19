/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface Morph {
  morph_id: string
  node_id: string
  name: string
  relationNode_ids: string[]
  attributeNode_ids: string[]
}

export interface CnlNode {
  id: string
  base_name: string
  name: string
  adjective: string | null
  quantifier: string | null
  role: string
  description: string | null
  parent_types: string[]
  morphs: Morph[]
  nbh: string
}

export interface CnlEdge {
  id: string
  source_id: string
  target_id: string
  name: string
  weight: number
  morph_ids: string[]
}

export interface CnlAttribute {
  id: string
  source_id: string
  name: string
  value: string
  unit: string | null
  adverb: string | null
  modality: string | null
  quantifier: string | null
  morph_ids: string[]
}

export interface CnlParseError {
  message: string
  line?: number
}

export interface CnlGraphData {
  nodes: CnlNode[]
  edges: CnlEdge[]
  attributes: CnlAttribute[]
  description: string | null
  currency: string | null
  errors: CnlParseError[]
}

export interface NodeTypeSchema {
  name: string
  description: string
  parent_types: string[]
}

export interface RelationTypeSchema {
  name: string
  description: string
  domain: string[]
  range: string[]
  symmetric?: boolean
  transitive?: boolean
  inverse_name?: string
  aliases?: string[]
}

export interface AttributeTypeStructureField {
  type: string
  unit: string | null
  description: string
}

export interface AttributeTypeSchema {
  name: string
  description: string
  data_type: string
  unit: string | null
  domain: string[]
  allowed_values: string[] | null
  required?: boolean
  validation?: string
  complex_type?: string
  structure?: Record<string, AttributeTypeStructureField>
}

export interface TransitionTypeSchema {
  name: string
  description: string
  inputs: string[]
  outputs: string[]
}

export interface FunctionTypeSchema {
  name: string
  expression: string
  scope: string[]
  description?: string
  required_attributes?: string[]
}

export type OperationType =
  | 'addNode'
  | 'addMorph'
  | 'addRelation'
  | 'addAttribute'
  | 'applyFunction'
  | 'updateNode'
  | 'updateGraphDescription'
  | 'setCurrency'

export interface CnlOperation {
  type: OperationType
  payload: Record<string, unknown>
  id: string
  source?: 'mindmap' | 'cnl'
}

export interface MorphData {
  morphId: string
  nodeId: string
  morphName: string
  relationIds: string[]
  attributeIds: string[]
}
