/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS
} from '@nodebook/core'
import type { AnnotationCategory, RenderedSegment, TextSpan } from '@nodebook/core'
import React, { useMemo, useState } from 'react'

import styles from './nodebook-text-analyzer.module.scss'

interface HighlightedTextDisplayProps {
  segments: RenderedSegment[]
  spans: TextSpan[]
}

export const HighlightedTextDisplay: React.FC<HighlightedTextDisplayProps> = ({
  segments,
  spans
}) => {
  const [hoveredOffset, setHoveredOffset] = useState<number | null>(null)

  const tooltipInfo = useMemo(() => {
    if (hoveredOffset === null) return null
    const matching = spans.filter((s) => s.start <= hoveredOffset && s.end > hoveredOffset)
    if (matching.length === 0) return null
    return matching.map((s) => ({
      category: s.category,
      label: CATEGORY_LABELS[s.category],
      color: CATEGORY_COLORS[s.category],
      cnlHint: s.cnlHint
    }))
  }, [hoveredOffset, spans])

  return (
    <div className={styles['text-display']}>
      {segments.map((seg, i) => {
        if (seg.categories.length === 0) {
          return <span key={i}>{seg.text}</span>
        }

        const count = seg.categories.length
        const highlightClass =
          count === 1
            ? styles['highlight-1']
            : count === 2
              ? styles['highlight-2']
              : styles['highlight-3']

        const cssVars: Record<string, string> = {}
        seg.categories.forEach((cat: AnnotationCategory, idx: number) => {
          cssVars[`--cat-color-${idx + 1}`] = CATEGORY_COLORS[cat] + '55'
        })

        const isHovered = hoveredOffset !== null && seg.start <= hoveredOffset && seg.end > hoveredOffset

        return (
          <span
            key={i}
            className={`${styles['highlight']} ${highlightClass}`}
            style={{
              ...cssVars,
              borderBottom: `2px solid ${CATEGORY_COLORS[seg.categories[0]]}`,
              color: 'inherit'
            } as React.CSSProperties}
            onMouseEnter={() => setHoveredOffset(seg.start)}
            onMouseLeave={() => setHoveredOffset(null)}
          >
            {seg.text}
            {isHovered && tooltipInfo && (
              <span className={styles['tooltip-content']}>
                {tooltipInfo.map((info, j) => (
                  <div key={j}>
                    <span className={styles['tooltip-category']} style={{ color: info.color }}>
                      {info.label}
                    </span>
                    {info.cnlHint && (
                      <div className={styles['tooltip-hint']}>{info.cnlHint}</div>
                    )}
                  </div>
                ))}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
