/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type MarkdownIt from 'markdown-it'

export interface NodeBookMarkdownItOptions {
  /**
   * Fence info strings handled by the plugin, compared case-insensitively.
   * Defaults to `['nodebook']`, which matches ```nodeBook / ```nodebook fences.
   */
  languages?: string[]
  /** CSS class put on the placeholder element. Defaults to `nodebook-block`. */
  className?: string
  /**
   * Name of the data attribute carrying the raw CNL source. Must start with
   * `data-`. Defaults to `data-nodebook`. `@nodebook/dom`'s
   * `hydrateNodeBookBlocks` looks for this attribute.
   */
  dataAttribute?: string
  /** Tag name of the placeholder element. Defaults to `div`. */
  tagName?: string
}

/**
 * markdown-it plugin that replaces ```nodeBook code fences with an empty
 * placeholder element carrying the CNL source in a data attribute:
 *
 *     <div class="nodebook-block" data-nodebook="# Water [Substance]..."></div>
 *
 * The plugin performs no rendering itself and has no dependencies, so it is
 * safe in any markdown-it pipeline (static site generators, editors, previews).
 * Pair it with `hydrateNodeBookBlocks` from `@nodebook/dom` to turn the
 * placeholders into interactive graphs, or consume the data attribute with
 * your own renderer.
 */
export function nodeBookMarkdownItPlugin(md: MarkdownIt, options: NodeBookMarkdownItOptions = {}): void {
  const languages = (options.languages ?? ['nodebook']).map((lang) => lang.toLowerCase())
  const className = options.className ?? 'nodebook-block'
  const dataAttribute = options.dataAttribute ?? 'data-nodebook'
  const tagName = options.tagName ?? 'div'

  if (!/^data-[a-z][a-z0-9-]*$/.test(dataAttribute)) {
    throw new Error(`@nodebook/markdown-it: dataAttribute must look like "data-*", got "${dataAttribute}"`)
  }
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(tagName)) {
    throw new Error(`@nodebook/markdown-it: invalid tagName "${tagName}"`)
  }

  const previousFence = md.renderer.rules.fence

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx]
    const info = (token.info ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
    if (languages.includes(info)) {
      const escape = md.utils.escapeHtml
      return `<${tagName} class="${escape(className)}" ${dataAttribute}="${escape(token.content)}"></${tagName}>\n`
    }
    if (previousFence) {
      return previousFence(tokens, idx, opts, env, self)
    }
    return self.renderToken(tokens, idx, opts)
  }
}

export default nodeBookMarkdownItPlugin
