/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { AnnotationCategory } from './analyzer-types'
import type { TextSpan } from './analyzer-types'

/**
 * Keyword sets for Tier 2 categories (exact match, case-insensitive).
 */
export const QUANTIFIER_KEYWORDS = new Set([
  'all', 'some', 'every', 'most', 'each', 'no', 'any', 'few', 'many',
  'several', 'both', 'neither', 'either', 'none', 'numerous', 'various'
])

export const MODALITY_KEYWORDS = new Set([
  'can', 'must', 'should', 'might', 'could', 'would', 'may', 'shall',
  'ought', 'need', 'cannot', "can't", "mustn't", "shouldn't", "wouldn't",
  "couldn't", "needn't"
])

export const CONDITION_KEYWORDS = new Set([
  'before', 'after', 'when', 'if', 'then', 'until', 'unless', 'once',
  'while', 'during', 'since', 'whenever', 'whereas', 'although',
  'provided', 'assuming', 'given'
])

export const CONDITION_PHRASES = [
  'provided that', 'as soon as', 'as long as', 'in order to',
  'so that', 'such that', 'if and only if', 'on condition that',
  'prior to', 'subsequent to', 'given that'
]

export const PROCESS_VERBS = new Set([
  'transform', 'transforms', 'convert', 'converts', 'become', 'becomes',
  'change', 'changes', 'evolve', 'evolves', 'react', 'reacts',
  'produce', 'produces', 'synthesize', 'synthesizes', 'decompose', 'decomposes',
  'oxidize', 'oxidizes', 'reduce', 'reduces', 'catalyze', 'catalyzes',
  'metabolize', 'metabolizes', 'digest', 'digests', 'ferment', 'ferments',
  'combust', 'combusts', 'dissolve', 'dissolves', 'crystallize', 'crystallizes',
  'polymerize', 'polymerizes', 'hydrolyze', 'hydrolyzes',
  'translate', 'translates', 'transcribe', 'transcribes',
  'transmit', 'transmits', 'propagate', 'propagates',
  'accelerate', 'accelerates', 'decelerate', 'decelerates',
  'compress', 'compresses', 'expand', 'expands',
  'assemble', 'assembles', 'disassemble', 'disassembles',
  'generate', 'generates', 'create', 'creates', 'destroy', 'destroys',
  'emit', 'emits', 'absorb', 'absorbs'
])

export const IO_KEYWORDS = new Set([
  'input', 'inputs', 'output', 'outputs', 'receives', 'receive',
  'produces', 'produce', 'yields', 'yield', 'consumes', 'consume',
  'takes', 'take', 'returns', 'return', 'feeds', 'feed',
  'generates', 'generate', 'substrate', 'substrates',
  'product', 'products', 'reactant', 'reactants',
  'precursor', 'precursors', 'byproduct', 'byproducts',
  'ingredient', 'ingredients', 'result', 'results',
  'source', 'sink', 'supply', 'demand'
])

/** Regex for number + unit patterns (Tier 3: Attributes). */
export const ATTRIBUTE_PATTERN =
  /\b(\d+(?:\.\d+)?)\s*(kg|g|mg|μg|lb|oz|m|km|cm|mm|μm|nm|mi|ft|in|yd|s|ms|μs|ns|min|hr|day|yr|°C|°F|K|J|kJ|MJ|cal|kcal|eV|W|kW|MW|V|A|Ω|Hz|kHz|MHz|GHz|Pa|kPa|MPa|atm|bar|psi|mol|mmol|μmol|M|mM|L|mL|μL|dL|pH|ppm|ppb|%|rpm|dB|lux|cd|Bq|Gy|Sv)\b/gi

/** Regex for math operations (Tier 3: Operations). */
export const OPERATION_PATTERN =
  /\b(?:equals?|sum\s+of|product\s+of|ratio\s+of|proportional\s+to|f\s*\([^)]*\)|log\s*\(|ln\s*\(|sin\s*\(|cos\s*\(|tan\s*\(|sqrt\s*\(|∫|∑|∏|Δ|∂|∇|≈|≠|≤|≥|→)\b|\b\d+\s*[+\-×÷*/^]\s*\d+/gi

/**
 * Fallback analysis using keyword/pattern matching.
 * Used when the LLM API is unavailable.
 */
export function analyzeWithKeywords(
  text: string,
  categories: Set<AnnotationCategory>
): TextSpan[] {
  const spans: TextSpan[] = []

  if (categories.has(AnnotationCategory.Quantifiers)) {
    for (const kw of QUANTIFIER_KEYWORDS) {
      addKeywordMatches(text, kw, AnnotationCategory.Quantifiers, spans)
    }
  }

  if (categories.has(AnnotationCategory.Modalities)) {
    for (const kw of MODALITY_KEYWORDS) {
      addKeywordMatches(text, kw, AnnotationCategory.Modalities, spans)
    }
  }

  if (categories.has(AnnotationCategory.Conditions)) {
    // Multi-word phrases first
    for (const phrase of CONDITION_PHRASES) {
      addKeywordMatches(text, phrase, AnnotationCategory.Conditions, spans)
    }
    for (const kw of CONDITION_KEYWORDS) {
      addKeywordMatches(text, kw, AnnotationCategory.Conditions, spans)
    }
  }

  if (categories.has(AnnotationCategory.Process)) {
    for (const verb of PROCESS_VERBS) {
      addKeywordMatches(text, verb, AnnotationCategory.Process, spans)
    }
  }

  if (categories.has(AnnotationCategory.InputOutput)) {
    for (const kw of IO_KEYWORDS) {
      addKeywordMatches(text, kw, AnnotationCategory.InputOutput, spans)
    }
  }

  if (categories.has(AnnotationCategory.Attributes)) {
    addRegexMatches(text, ATTRIBUTE_PATTERN, AnnotationCategory.Attributes, spans)
  }

  if (categories.has(AnnotationCategory.Operations)) {
    addRegexMatches(text, OPERATION_PATTERN, AnnotationCategory.Operations, spans)
  }

  return spans
}

function addKeywordMatches(
  text: string,
  keyword: string,
  category: AnnotationCategory,
  spans: TextSpan[]
): void {
  const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi')
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      category,
      confidence: 0.7
    })
  }
}

function addRegexMatches(
  text: string,
  pattern: RegExp,
  category: AnnotationCategory,
  spans: TextSpan[]
): void {
  const regex = new RegExp(pattern.source, pattern.flags)
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      category,
      confidence: 0.6
    })
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
