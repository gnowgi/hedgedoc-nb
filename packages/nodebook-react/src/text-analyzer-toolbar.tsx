/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  AnnotationCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_GROUPS,
  MAX_ACTIVE_CATEGORIES
} from '@nodebook/core'
import React, { useCallback } from 'react'

import styles from './nodebook-text-analyzer.module.scss'

interface TextAnalyzerToolbarProps {
  activeCategories: Set<AnnotationCategory>
  onToggle: (category: AnnotationCategory) => void
  analyzing: boolean
  source?: string
}

export const TextAnalyzerToolbar: React.FC<TextAnalyzerToolbarProps> = ({
  activeCategories,
  onToggle,
  analyzing,
  source
}) => {
  const renderButton = useCallback(
    (category: AnnotationCategory) => {
      const isActive = activeCategories.has(category)
      const isDisabled = !isActive && activeCategories.size >= MAX_ACTIVE_CATEGORIES
      const color = CATEGORY_COLORS[category]
      const label = CATEGORY_LABELS[category]

      return (
        <button
          key={category}
          className={`${styles['category-btn']} ${isActive ? styles['category-btn-active'] : ''}`}
          style={
            isActive
              ? { backgroundColor: color, borderColor: color }
              : { borderColor: color + '40' }
          }
          disabled={isDisabled}
          onClick={() => onToggle(category)}
          title={isDisabled ? `Maximum ${MAX_ACTIVE_CATEGORIES} categories at a time` : label}
          aria-pressed={isActive}
        >
          <span className={styles['color-dot']} style={{ backgroundColor: color }} />
          {label}
        </button>
      )
    },
    [activeCategories, onToggle]
  )

  return (
    <div className={styles['toolbar']}>
      <div className={styles['toolbar-group']}>
        <span className={styles['toolbar-group-label']}>Structural</span>
        {CATEGORY_GROUPS.structural.map(renderButton)}
      </div>
      <div className={styles['toolbar-separator']} />
      <div className={styles['toolbar-group']}>
        <span className={styles['toolbar-group-label']}>Semantic</span>
        {CATEGORY_GROUPS.semantic.map(renderButton)}
      </div>
      {analyzing && (
        <div className={styles['analyzing-indicator']}>
          <div className={styles['spinner-small']} />
          Analyzing...
        </div>
      )}
      <span className={styles['counter']}>
        {activeCategories.size}/{MAX_ACTIVE_CATEGORIES} selected
        {source && <span className={styles['source-badge']}>{source}</span>}
      </span>
    </div>
  )
}
