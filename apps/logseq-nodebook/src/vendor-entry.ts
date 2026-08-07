/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { renderNodeBook } from '@nodebook/dom'

// Executed in the Logseq HOST page via logseq.Experiments.loadScripts().
// The fenced-code renderer reaches it through ensureHostScope().
;(globalThis as unknown as Record<string, unknown>).NodeBookDom = { renderNodeBook }
