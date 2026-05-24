/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { AnnotationCategory, TextSpan, RenderedSegment } from './analyzer-types'

/**
 * Resolves overlapping TextSpans into non-overlapping RenderedSegments.
 * Each segment carries all categories that overlap at that position.
 *
 * Algorithm:
 * 1. Collect all boundary points (start/end of every span)
 * 2. Sort boundaries
 * 3. For each interval between consecutive boundaries, determine which spans cover it
 * 4. Build RenderedSegments with merged category lists
 */
export function resolveSpans(
  text: string,
  spans: TextSpan[],
  activeCategories: Set<AnnotationCategory>
): RenderedSegment[] {
  // Filter to only active categories
  const filtered = spans.filter((s) => activeCategories.has(s.category))

  if (filtered.length === 0) {
    return [{ start: 0, end: text.length, text, categories: [] }]
  }

  // Collect all unique boundary points
  const boundaries = new Set<number>()
  boundaries.add(0)
  boundaries.add(text.length)
  for (const span of filtered) {
    boundaries.add(span.start)
    boundaries.add(span.end)
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b)
  const segments: RenderedSegment[] = []

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const segStart = sortedBoundaries[i]
    const segEnd = sortedBoundaries[i + 1]

    if (segStart >= segEnd) continue

    // Find all categories covering this interval
    const categories: AnnotationCategory[] = []
    const seen = new Set<AnnotationCategory>()
    for (const span of filtered) {
      if (span.start <= segStart && span.end >= segEnd && !seen.has(span.category)) {
        seen.add(span.category)
        categories.push(span.category)
      }
    }

    segments.push({
      start: segStart,
      end: segEnd,
      text: text.slice(segStart, segEnd),
      categories
    })
  }

  return segments
}

/**
 * Get the tooltip text for a span showing all matching categories and CNL hints.
 */
export function getSpanTooltip(
  spans: TextSpan[],
  position: number
): { category: string; cnlHint?: string }[] {
  return spans
    .filter((s) => s.start <= position && s.end > position)
    .map((s) => ({
      category: s.category,
      cnlHint: s.cnlHint
    }))
}
