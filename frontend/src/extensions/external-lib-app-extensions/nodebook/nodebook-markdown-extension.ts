/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { CodeBlockMarkdownRendererExtension } from '../../../components/markdown-renderer/extensions/_base-classes/code-block-markdown-extension/code-block-markdown-renderer-extension'
import { CodeBlockComponentReplacer } from '../../../components/markdown-renderer/replace-components/code-block-component-replacer'
import { NodeBookGraph } from './nodebook-graph'

/**
 * Adds support for rendering nodeBook knowledge graphs using code fences with "nodeBook" as language.
 */
export class NodeBookMarkdownExtension extends CodeBlockMarkdownRendererExtension {
  public buildReplacers(): CodeBlockComponentReplacer[] {
    return [new CodeBlockComponentReplacer(NodeBookGraph, 'nodeBook')]
  }
}
