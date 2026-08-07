/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useMemo } from 'react'
import MarkdownIt from 'markdown-it'
import { NodeBookGraph, NodeBookSchemaDisplay } from '@nodebook/react'
import { setUserSchemas, parseSchemaBlock, mergeSchemaResults } from '@nodebook/core'
import type { SchemaParseResult } from '@nodebook/core'
import styles from './graph-panel.module.scss'

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

type Segment =
  | { type: 'html'; html: string }
  | { type: 'nodeBook'; code: string }
  | { type: 'nodeBook-schema'; code: string }

/**
 * Split markdown into segments: rendered HTML prose and raw nodeBook/nodeBook-schema
 * code blocks. We walk markdown-it tokens to find fence blocks and render everything
 * else as HTML.
 */
function segmentMarkdown(source: string): Segment[] {
  const tokens = md.parse(source, {})
  const segments: Segment[] = []
  const schemaResults: SchemaParseResult[] = []

  // Collect non-nodebook tokens into runs, render them as HTML
  let proseTokens: typeof tokens = []

  function flushProse() {
    if (proseTokens.length === 0) return
    const html = md.renderer.render(proseTokens, md.options, {})
    if (html.trim()) {
      segments.push({ type: 'html', html })
    }
    proseTokens = []
  }

  for (const token of tokens) {
    if (token.type === 'fence' && token.info.trim() === 'nodeBook') {
      flushProse()
      segments.push({ type: 'nodeBook', code: token.content })
    } else if (token.type === 'fence' && token.info.trim() === 'nodeBook-schema') {
      flushProse()
      segments.push({ type: 'nodeBook-schema', code: token.content })
      schemaResults.push(parseSchemaBlock(token.content))
    } else {
      proseTokens.push(token)
    }
  }
  flushProse()

  // Apply schemas
  if (schemaResults.length > 0) {
    const merged = mergeSchemaResults(schemaResults)
    setUserSchemas(merged.schemas)
  } else {
    setUserSchemas(null)
  }

  return segments
}

interface GraphPanelProps {
  code: string
}

export const GraphPanel: React.FC<GraphPanelProps> = ({ code }) => {
  const segments = useMemo(() => segmentMarkdown(code), [code])

  if (segments.length === 0 || !code.trim()) {
    return (
      <div className={styles.empty}>
        <div>
          <p>Start writing in the editor.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
            Use <code>```nodeBook</code> code fences to embed knowledge graphs.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          return (
            <div
              key={i}
              className={styles.prose}
              dangerouslySetInnerHTML={{ __html: seg.html }}
            />
          )
        }
        if (seg.type === 'nodeBook-schema') {
          return (
            <div key={i} className={styles.blockSection}>
              <NodeBookSchemaDisplay code={seg.code} />
            </div>
          )
        }
        return (
          <div key={i} className={styles.graphBlock}>
            <NodeBookGraph code={seg.code} />
          </div>
        )
      })}
    </div>
  )
}
