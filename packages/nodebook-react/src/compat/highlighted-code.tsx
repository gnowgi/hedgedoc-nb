/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react'

interface HighlightedCodeProps {
  code: string
  language?: string
  wrapLines?: boolean
}

const HighlightedCode: React.FC<HighlightedCodeProps> = ({ code, wrapLines = true }) => {
  return (
    <pre
      style={{
        margin: 0,
        padding: '0.75rem',
        fontSize: '0.85rem',
        lineHeight: 1.5,
        overflow: 'auto',
        whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
        background: 'var(--nb-code-bg, #f6f8fa)',
        borderRadius: '4px'
      }}>
      <code>{code}</code>
    </pre>
  )
}

export default HighlightedCode
