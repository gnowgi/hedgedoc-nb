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
import { LedgerMarkdownExtension } from './ledger-markdown-extension'
import type { CompletionSource } from '@codemirror/autocomplete'

/**
 * Adds support for personal accounting ledger rendering to the markdown renderer.
 * Users write transactions inside a ledger code fence, and HedgeDoc renders
 * tables with running balances and charts.
 */
export class LedgerAppExtension extends AppExtension {
  buildMarkdownRendererExtensions(): MarkdownRendererExtension[] {
    return [new LedgerMarkdownExtension()]
  }

  buildCheatsheetExtensions(): CheatsheetExtension[] {
    return [{ i18nKey: 'ledger', categoryI18nKey: 'charts' }]
  }

  buildAutocompletion(): CompletionSource[] {
    return [
      basicCompletion(
        codeFenceRegex,
        '```ledger\n@account Checking 1000.00\n\n| Date | Description | Amount | Account | Tags |\n|------|-------------|--------|---------|------|\n| 2024-01-15 | Groceries | -50.00 | Checking | #food |\n\n---\nbalance\nchart pie categories\n```'
      )
    ]
  }
}
