/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import '@logseq/libs'
import { makeNodeBookRenderer } from './nodebook-renderer'

function main(): void {
  // Logseq matches the fence info string exactly, so cover common casings of
  // the canonical ```nodeBook fence.
  for (const language of ['nodeBook', 'nodebook', 'NodeBook']) {
    try {
      logseq.Experiments.registerFencedCodeRenderer(language, {
        edit: false,
        render: makeNodeBookRenderer()
      })
    } catch (error) {
      console.error(`logseq-nodebook: failed to register renderer for "${language}"`, error)
    }
  }
}

logseq.ready(main).catch(console.error)
