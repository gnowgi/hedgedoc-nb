/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { AnnotationCategory } from './analyzer-types'
import type { AnalysisResult, TextSpan } from './analyzer-types'
import { analyzeWithKeywords } from './category-rules'

interface CompromiseDoc {
  nouns: () => CompromiseView
  verbs: () => CompromiseView
  adjectives: () => CompromiseView
  adverbs: () => CompromiseView
}

interface CompromiseView {
  json: () => Array<{ offset: { start: number; length: number }; text: string }>
}

type CompromiseModule = (text: string) => CompromiseDoc

let compromiseModule: CompromiseModule | null = null

async function loadCompromise(): Promise<CompromiseModule> {
  if (compromiseModule) return compromiseModule
  const mod = await import('compromise')
  compromiseModule = (mod.default ?? mod) as CompromiseModule
  return compromiseModule
}

/**
 * Fallback NLP pipeline using compromise.js for POS-based categories
 * and keyword matching for semantic categories.
 */
export async function analyzeWithFallback(
  text: string,
  activeCategories: Set<AnnotationCategory>
): Promise<AnalysisResult> {
  const spans: TextSpan[] = []

  // POS-based categories (Tier 1) via compromise.js
  const posCategories = new Set([
    AnnotationCategory.Nodes,
    AnnotationCategory.Relations,
    AnnotationCategory.Adjectives,
    AnnotationCategory.Adverbs
  ])
  const needCompromise = [...activeCategories].some((c) => posCategories.has(c))

  if (needCompromise) {
    try {
      const nlp = await loadCompromise()
      const doc = nlp(text)

      if (activeCategories.has(AnnotationCategory.Nodes)) {
        const nouns = doc.nouns().json()
        for (const item of nouns) {
          if (item.offset) {
            spans.push({
              start: item.offset.start,
              end: item.offset.start + item.offset.length,
              text: item.text,
              category: AnnotationCategory.Nodes,
              confidence: 0.6
            })
          }
        }
      }

      if (activeCategories.has(AnnotationCategory.Relations)) {
        const verbs = doc.verbs().json()
        for (const item of verbs) {
          if (item.offset) {
            spans.push({
              start: item.offset.start,
              end: item.offset.start + item.offset.length,
              text: item.text,
              category: AnnotationCategory.Relations,
              confidence: 0.5
            })
          }
        }
      }

      if (activeCategories.has(AnnotationCategory.Adjectives)) {
        const adjs = doc.adjectives().json()
        for (const item of adjs) {
          if (item.offset) {
            spans.push({
              start: item.offset.start,
              end: item.offset.start + item.offset.length,
              text: item.text,
              category: AnnotationCategory.Adjectives,
              confidence: 0.6
            })
          }
        }
      }

      if (activeCategories.has(AnnotationCategory.Adverbs)) {
        const advs = doc.adverbs().json()
        for (const item of advs) {
          if (item.offset) {
            spans.push({
              start: item.offset.start,
              end: item.offset.start + item.offset.length,
              text: item.text,
              category: AnnotationCategory.Adverbs,
              confidence: 0.6
            })
          }
        }
      }
    } catch (err) {
      console.warn('compromise.js failed, falling back to keyword-only:', err)
    }
  }

  // Keyword/pattern-based categories (Tier 2 & 3)
  const keywordSpans = analyzeWithKeywords(text, activeCategories)
  spans.push(...keywordSpans)

  // Simple sentence boundary detection
  const sentenceBoundaries: number[] = [0]
  const sentenceRegex = /[.!?]\s+/g
  let match: RegExpExecArray | null
  while ((match = sentenceRegex.exec(text)) !== null) {
    sentenceBoundaries.push(match.index + match[0].length)
  }

  return { spans, sentenceBoundaries, source: 'fallback' }
}
