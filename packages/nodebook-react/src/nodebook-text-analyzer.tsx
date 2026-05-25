/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  AnnotationCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  analyzeViaLlm,
  analyzeWithFallback,
  checkLlmStatus,
  resolveSpans
} from '@nodebook/core'
import type { AnalysisResult, TextSpan, NodeClassification } from '@nodebook/core'
import type { CodeProps } from './compat/types'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAsync } from 'react-use'

import styles from './nodebook-text-analyzer.module.scss'
import { HighlightedTextDisplay } from './text-analyzer-highlighted-text'
import { TextAnalyzerToolbar } from './text-analyzer-toolbar'

/**
 * NodeBookTextAnalyzer renders a textbook passage with interactive
 * annotation highlighting for graph-theoretic decomposition.
 *
 * Usage: ```nodeBook-analyze
 * Your text paragraph here.
 * ```
 */
export const NodeBookTextAnalyzer: React.FC<CodeProps> = ({ code }) => {
  const text = code.trim()
  const [activeCategories, setActiveCategories] = useState<Set<AnnotationCategory>>(new Set())
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Check if LLM backend is available
  const llmStatus = useAsync(checkLlmStatus, [])
  const llmAvailable = llmStatus.value === true

  // Re-analyze when categories change
  useEffect(() => {
    if (activeCategories.size === 0) {
      setAnalysisResult(null)
      return
    }

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const abort = new AbortController()
    abortRef.current = abort

    const categoriesArray = Array.from(activeCategories)
    setAnalyzing(true)

    const doAnalysis = async () => {
      try {
        let result: AnalysisResult
        if (llmAvailable) {
          try {
            result = await analyzeViaLlm(text, categoriesArray)
          } catch {
            result = await analyzeWithFallback(text, activeCategories)
          }
        } else {
          result = await analyzeWithFallback(text, activeCategories)
        }
        if (!abort.signal.aborted) {
          setAnalysisResult(result)
        }
      } catch (err) {
        console.error('Text analysis failed:', err)
      } finally {
        if (!abort.signal.aborted) {
          setAnalyzing(false)
        }
      }
    }

    void doAnalysis()

    return () => {
      abort.abort()
    }
  }, [activeCategories, text, llmAvailable])

  const handleToggle = useCallback((category: AnnotationCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else if (next.size < 3) {
        next.add(category)
      }
      return next
    })
  }, [])

  const spans: TextSpan[] = analysisResult?.spans ?? []
  const segments = useMemo(
    () => resolveSpans(text, spans, activeCategories),
    [text, spans, activeCategories]
  )
  const [addedTerms, setAddedTerms] = useState<Set<string>>(new Set())

  // Group spans by category for the report
  const spansByCategory = new Map<AnnotationCategory, TextSpan[]>()
  for (const span of spans) {
    const cat = span.category as AnnotationCategory
    if (!spansByCategory.has(cat)) {
      spansByCategory.set(cat, [])
    }
    spansByCategory.get(cat)!.push(span)
  }

  const handleAddCnl = useCallback((span: TextSpan) => {
    const lines = span.cnlLines ?? (span.cnlHint ? [span.cnlHint] : [])
    if (lines.length === 0) return

    // Send to parent editor via postMessage
    window.parent.postMessage(
      {
        type: 'nodebook-insert-cnl',
        cnlLines: lines
      },
      '*'
    )
    setAddedTerms((prev) => new Set(prev).add(span.text.toLowerCase()))
  }, [])

  // Classification badge colors
  const classificationColors: Record<string, { bg: string; text: string; label: string }> = {
    class: { bg: '#dbeafe', text: '#1e40af', label: 'class' },
    individual: { bg: '#fce7f3', text: '#9d174d', label: 'individual' },
    transition: { bg: '#dcfce7', text: '#166534', label: 'transition' },
    'attribute-candidate': { bg: '#f0fdfa', text: '#115e59', label: 'attribute' }
  }

  // Build a readable service status label
  const serviceLabel = analysisResult
    ? analysisResult.source === 'nlp-service'
      ? 'spaCy (fast)'
      : analysisResult.source === 'nlp-service-full'
        ? 'spaCy + Qwen2.5'
        : analysisResult.source === 'llm'
          ? 'LLM API'
          : 'Client fallback'
    : null

  return (
    <div className={styles['analyzer-container']}>
      <TextAnalyzerToolbar
        activeCategories={activeCategories}
        onToggle={handleToggle}
        analyzing={analyzing}
        source={analysisResult?.source}
      />

      {/* Passage with inline category highlights (hover a span for its CNL hint) */}
      <HighlightedTextDisplay segments={segments} spans={spans} />

      {/* Service status bar */}
      {analysisResult && (
        <div className={styles['service-status']}>
          <span className={styles['status-dot']} />
          <span>
            Service: <strong>{serviceLabel}</strong>
          </span>
          {analysisResult.debug?.endpoint && (
            <span className={styles['status-endpoint']}>{analysisResult.debug.endpoint}</span>
          )}
          {analysisResult.debug?.elapsedSeconds != null && (
            <span className={styles['status-time']}>
              {analysisResult.debug.elapsedSeconds.toFixed(3)}s
            </span>
          )}
          {analysisResult.debug?.model && (
            <span className={styles['status-model']}>{analysisResult.debug.model}</span>
          )}
        </div>
      )}

      {/* Report panel: matched terms grouped by category with CNL suggestions */}
      {spans.length > 0 && (
        <div className={styles['report-panel']}>
          <div className={styles['report-header']}>
            <span className={styles['report-title']}>
              {spans.length} match{spans.length !== 1 ? 'es' : ''} found
            </span>
            <button
              className={styles['debug-toggle']}
              onClick={() => setShowDebug((v) => !v)}
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>

          {Array.from(spansByCategory.entries()).map(([category, catSpans]) => {
            // Deduplicate by text (same word may appear multiple times)
            const uniqueTerms = new Map<string, TextSpan>()
            for (const span of catSpans) {
              const key = span.text.toLowerCase()
              if (!uniqueTerms.has(key) || (span.cnlHint && !uniqueTerms.get(key)!.cnlHint)) {
                uniqueTerms.set(key, span)
              }
            }

            return (
              <div key={category} className={styles['report-category']}>
                <div
                  className={styles['report-category-header']}
                  style={{ borderLeftColor: CATEGORY_COLORS[category] }}
                >
                  <span
                    className={styles['color-dot']}
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  <strong>{CATEGORY_LABELS[category]}</strong>
                  <span className={styles['report-count']}>({uniqueTerms.size})</span>
                </div>
                <div className={styles['report-terms']}>
                  {Array.from(uniqueTerms.values()).map((span, i) => {
                    const classification = span.nodeClassification as NodeClassification | undefined
                    const badge = classification ? classificationColors[classification] : null
                    const isAdded = addedTerms.has(span.text.toLowerCase())
                    const hasCnl = (span.cnlLines && span.cnlLines.length > 0) || span.cnlHint

                    return (
                      <div key={i} className={styles['report-term-row']}>
                        <span
                          className={styles['report-text-chip']}
                          style={{
                            backgroundColor: CATEGORY_COLORS[category] + '25',
                            borderColor: CATEGORY_COLORS[category]
                          }}
                        >
                          {span.text}
                        </span>
                        {badge && (
                          <span
                            className={styles['classification-badge']}
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {badge.label}
                          </span>
                        )}
                        {span.relationKind && (
                          <span
                            className={styles['classification-badge']}
                            style={
                              span.relationKind === 'preposition'
                                ? { backgroundColor: '#fef3c7', color: '#92400e' }
                                : { backgroundColor: '#fee2e2', color: '#991b1b' }
                            }
                          >
                            {span.relationKind === 'preposition' ? 'preposition' : 'verb'}
                          </span>
                        )}
                        <span className={styles['report-cnl-block']}>
                          {span.cnlLines
                            ? span.cnlLines.map((line, j) => (
                                <span key={j} className={styles['report-hint']}>
                                  {line}
                                </span>
                              ))
                            : span.cnlHint && (
                                <span className={styles['report-hint']}>{span.cnlHint}</span>
                              )}
                        </span>
                        {hasCnl && (
                          <button
                            className={`${styles['add-btn']} ${isAdded ? styles['add-btn-done'] : ''}`}
                            onClick={() => handleAddCnl(span)}
                            disabled={isAdded}
                            title={isAdded ? 'Already added' : 'Insert into CNL block'}
                          >
                            {isAdded ? 'Added' : '+Add'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Debug panel: raw service response */}
      {showDebug && analysisResult?.debug && (
        <div className={styles['debug-panel']}>
          {analysisResult.debug.systemPrompt && (
            <div className={styles['debug-section']}>
              <div className={styles['debug-label']}>System Prompt</div>
              <pre className={styles['debug-pre']}>{analysisResult.debug.systemPrompt}</pre>
            </div>
          )}
          {analysisResult.debug.userMessage && (
            <div className={styles['debug-section']}>
              <div className={styles['debug-label']}>User Message</div>
              <pre className={styles['debug-pre']}>{analysisResult.debug.userMessage}</pre>
            </div>
          )}
          <div className={styles['debug-section']}>
            <div className={styles['debug-label']}>Raw Response</div>
            <pre className={styles['debug-pre']}>{analysisResult.debug.rawResponse}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export type { CodeProps as NodeBookTextAnalyzerProps } from './compat/types'
