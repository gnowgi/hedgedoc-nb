/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Main graph component
export { NodeBookGraph } from './nodebook-graph'
export type { NodeBookGraphProps } from './nodebook-graph'

// Schema display component
export { NodeBookSchemaDisplay } from './nodebook-schema-display'

// Text analyzer component
export { NodeBookTextAnalyzer } from './nodebook-text-analyzer'

// CodeMirror language support
export { cnlLanguageDescription } from './nodebook-codemirror-language'

// CodeMirror autocompletions
export { buildNodeBookInBlockCompletions } from './nodebook-completions'

// highlight.js language definition
export { default as cnlHljsLanguage } from './nodebook-hljs-language'

// Compat types (useful for consumers)
export type { CodeProps } from './compat/types'
