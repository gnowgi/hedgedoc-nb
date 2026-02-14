/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CheatsheetExtension } from '../../../components/cheatsheet/cheatsheet-extension'
import {
  basicCompletion,
  codeFenceRegex
} from '../../../components/editor-page/editor-pane/autocompletions/basic-completion'
import type { MarkdownRendererExtension } from '../../../components/markdown-renderer/extensions/_base-classes/markdown-renderer-extension'
import { AppExtension } from '../../_base-classes/app-extension'
import { NodeBookMarkdownExtension } from './nodebook-markdown-extension'
import type { CompletionSource } from '@codemirror/autocomplete'

/**
 * Adds support for nodeBook knowledge graph rendering to the markdown renderer.
 * Users write CNL (Controlled Natural Language) inside a nodeBook code fence,
 * and HedgeDoc renders an interactive knowledge graph inline.
 */
export class NodeBookAppExtension extends AppExtension {
  buildMarkdownRendererExtensions(): MarkdownRendererExtension[] {
    return [new NodeBookMarkdownExtension()]
  }

  buildCheatsheetExtensions(): CheatsheetExtension[] {
    return [
      { i18nKey: 'nodeBook', categoryI18nKey: 'charts', readMoreUrl: new URL('https://github.com/nodeBook') },
      { i18nKey: 'nodeBook-schema', categoryI18nKey: 'charts', readMoreUrl: new URL('https://github.com/nodeBook') }
    ]
  }

  buildAutocompletion(): CompletionSource[] {
    return [
      basicCompletion(codeFenceRegex, '```nodeBook\n# Node Name [Type]\nhas attribute: value;\n<relation> Target;\n```'),
      basicCompletion(
        codeFenceRegex,
        '```nodeBook\n# Central Topic <relation>\n- Branch 1\n  - Sub-branch 1\n  - Sub-branch 2\n- Branch 2\n```'
      ),
      basicCompletion(
        codeFenceRegex,
        '```nodeBook-schema\n# Define custom schema types\nnodeType: Planet, A celestial body, parent: Object\nrelationType: orbits, One body orbits another, domain: Planet, range: Star\nattributeType: diameter, float, Size measurement, unit: km, domain: Planet\n```'
      )
    ]
  }
}
