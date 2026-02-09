/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { CodeBlockMarkdownRendererExtension } from '../../../components/markdown-renderer/extensions/_base-classes/code-block-markdown-extension/code-block-markdown-renderer-extension'
import { parseCodeBlockParameters } from '../../../components/markdown-renderer/extensions/_base-classes/code-block-markdown-extension/code-block-parameters'
import { CodeBlockComponentReplacer } from '../../../components/markdown-renderer/replace-components/code-block-component-replacer'
import { NodeBookGraph } from './nodebook-graph'
import { NodeBookSchemaDisplay } from './nodebook-schema-display'
import { parseSchemaBlock, mergeSchemaResults } from './nodebook-parser/schema-parser'
import type { SchemaParseResult } from './nodebook-parser/schema-parser'
import { setUserSchemas } from './nodebook-parser/schema-store'
import type MarkdownIt from 'markdown-it'

const schemaExtractRuleName = 'nodebook-schema-extract'

/**
 * Adds support for rendering nodeBook knowledge graphs and schema definitions.
 */
export class NodeBookMarkdownExtension extends CodeBlockMarkdownRendererExtension {
  public buildReplacers(): CodeBlockComponentReplacer[] {
    return [
      new CodeBlockComponentReplacer(NodeBookGraph, 'nodeBook'),
      new CodeBlockComponentReplacer(NodeBookSchemaDisplay, 'nodeBook-schema')
    ]
  }

  public configureMarkdownIt(markdownIt: MarkdownIt): void {
    super.configureMarkdownIt(markdownIt)

    if (markdownIt.core.ruler.getRules(schemaExtractRuleName).length === 0) {
      markdownIt.core.ruler.push(schemaExtractRuleName, (state) => {
        const results: SchemaParseResult[] = []

        for (const token of state.tokens) {
          if (token.type !== 'fence') continue
          const { language } = parseCodeBlockParameters(token.info)
          if (language !== 'nodeBook-schema') continue
          results.push(parseSchemaBlock(token.content))
        }

        if (results.length > 0) {
          const merged = mergeSchemaResults(results)
          setUserSchemas(merged.schemas)
        } else {
          setUserSchemas(null)
        }
      })
    }
  }
}
