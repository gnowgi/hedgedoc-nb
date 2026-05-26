/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Types
export type {
  Morph,
  CnlNode,
  CnlEdge,
  CnlAttribute,
  CnlParseError,
  CnlQuery,
  CnlGraphData,
  NodeTypeSchema,
  RelationTypeSchema,
  AttributeTypeStructureField,
  AttributeTypeSchema,
  TransitionTypeSchema,
  FunctionTypeSchema,
  OperationType,
  CnlOperation,
  InferredEdge,
  InferenceResult,
  MorphData,
  QueryBindings,
  QueryResult,
  PrologInferenceResult
} from './types'

// Parser
export { getOperationsFromCnl } from './cnl-parser'

// Graph builder
export { operationsToGraph } from './operations-to-graph'

// Morph registry
export { MorphRegistry } from './morph-registry'

// Validation
export { validateOperations } from './validate-operations'

// Inference
export { TransitiveClosureEngine, PrologInferenceEngine } from './inference-engine'
export type { InferenceEngine, AsyncInferenceEngine } from './inference-engine'

// Attribute inheritance
export { getInheritedAttributes } from './inheritance'
export type { InheritedAttribute } from './inheritance'

// Schemas
export { nodeTypes, relationTypes, attributeTypes, transitionTypes, functionTypes } from './schemas'

// Schema store
export { setUserSchemas, getUserSchemas, getStoreVersion, getMergedSchemas } from './schema-store'
export type { ParsedUserSchemas, MergedSchemas } from './schema-store'

// Schema parser
export { parseSchemaBlock, mergeSchemaResults } from './schema-parser'
export type { SchemaParseError, SchemaParseResult } from './schema-parser'

// Prolog bridge
export { generatePrologProgram, executePrologQueries, queryInferredRelations } from './prolog-bridge'

// Math evaluator
export { evaluateExpression, parseExpression } from './nodebook-evaluator'

// Equation to Petri net
export { expressionToPetriNetOps } from './equation-to-pn'

// Text analyzer
export {
  AnnotationCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_GROUPS,
  MAX_ACTIVE_CATEGORIES
} from './text-analyzer/analyzer-types'
export type {
  TextSpan,
  AnalysisResult,
  AnalysisDebugInfo,
  RenderedSegment,
  NodeClassification
} from './text-analyzer/analyzer-types'
export { resolveSpans, getSpanTooltip } from './text-analyzer/span-resolver'
export { analyzeViaLlm, checkLlmStatus } from './text-analyzer/llm-client'
export { analyzeWithFallback } from './text-analyzer/fallback-pipeline'
export { analyzeWithKeywords } from './text-analyzer/category-rules'
