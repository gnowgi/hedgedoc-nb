/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export enum AnnotationCategory {
  Nodes = 'nodes',
  Relations = 'relations',
  Adjectives = 'adjectives',
  Adverbs = 'adverbs',
  Attributes = 'attributes',
  Quantifiers = 'quantifiers',
  Modalities = 'modalities',
  Process = 'process',
  Conditions = 'conditions',
  Operations = 'operations',
  InputOutput = 'inputOutput'
}

export type NodeClassification = 'class' | 'individual' | 'transition' | 'attribute-candidate'

export interface TextSpan {
  start: number
  end: number
  text: string
  category: AnnotationCategory
  confidence: number
  cnlHint?: string
  /** Semantic classification for nodes */
  nodeClassification?: NodeClassification
  /** Suggested CNL node type, e.g. 'Transition', 'Person', 'class' */
  suggestedNodeType?: string
  /** Suggested CNL relation, e.g. '<is_a> Organism;' */
  suggestedRelation?: string
  /** For transitions: prior/post state participant names */
  processParticipants?: string[]
  /** Full CNL lines to insert (heading + relations) */
  cnlLines?: string[]
  /** For relations: whether the span is a predicate verb or a relational preposition */
  relationKind?: 'verb' | 'preposition'
}

export interface AnalysisDebugInfo {
  endpoint?: string
  rawResponse: string
  model?: string
  systemPrompt?: string
  userMessage?: string
  elapsedSeconds?: number
}

export interface AnalysisResult {
  spans: TextSpan[]
  sentenceBoundaries: number[]
  source: 'nlp-service' | 'nlp-service-full' | 'llm' | 'fallback'
  debug?: AnalysisDebugInfo
}

export interface RenderedSegment {
  start: number
  end: number
  text: string
  categories: AnnotationCategory[]
}

export const CATEGORY_COLORS: Record<AnnotationCategory, string> = {
  [AnnotationCategory.Nodes]: '#3b82f6',
  [AnnotationCategory.Relations]: '#ef4444',
  [AnnotationCategory.Adjectives]: '#a855f7',
  [AnnotationCategory.Adverbs]: '#f97316',
  [AnnotationCategory.Attributes]: '#14b8a6',
  [AnnotationCategory.Quantifiers]: '#eab308',
  [AnnotationCategory.Modalities]: '#ec4899',
  [AnnotationCategory.Process]: '#22c55e',
  [AnnotationCategory.Conditions]: '#6366f1',
  [AnnotationCategory.Operations]: '#78716c',
  [AnnotationCategory.InputOutput]: '#06b6d4'
}

export const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  [AnnotationCategory.Nodes]: 'Nodes',
  [AnnotationCategory.Relations]: 'Relations',
  [AnnotationCategory.Adjectives]: 'Adjectives',
  [AnnotationCategory.Adverbs]: 'Adverbs',
  [AnnotationCategory.Attributes]: 'Attributes',
  [AnnotationCategory.Quantifiers]: 'Quantifiers',
  [AnnotationCategory.Modalities]: 'Modalities',
  [AnnotationCategory.Process]: 'Process',
  [AnnotationCategory.Conditions]: 'Conditions',
  [AnnotationCategory.Operations]: 'Operations',
  [AnnotationCategory.InputOutput]: 'Input/Output'
}

export const CATEGORY_GROUPS = {
  structural: [
    AnnotationCategory.Nodes,
    AnnotationCategory.Relations,
    AnnotationCategory.Adjectives,
    AnnotationCategory.Adverbs,
    AnnotationCategory.Attributes
  ],
  semantic: [
    AnnotationCategory.Quantifiers,
    AnnotationCategory.Modalities,
    AnnotationCategory.Process,
    AnnotationCategory.Conditions,
    AnnotationCategory.Operations,
    AnnotationCategory.InputOutput
  ]
} as const

export const MAX_ACTIVE_CATEGORIES = 3
