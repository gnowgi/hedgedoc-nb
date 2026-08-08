/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  attributeTypes,
  functionTypes,
  nodeTypes,
  relationTypes,
  serializeSchemas,
  transitionTypes
} from '@nodebook/core'
import { registerSchemaSource, renderNodeBook, renderNodeBookSchema, unregisterSchemaSource } from '@nodebook/dom'

/** The factory (built-in) schemas as editable ```nodeBook-schema block text. */
function factorySchemasText(): string {
  return serializeSchemas({ nodeTypes, relationTypes, attributeTypes, transitionTypes, functionTypes })
}

// Executed in the Logseq HOST page via logseq.Experiments.loadScripts().
// The fenced-code renderer reaches it through ensureHostScope().
;(globalThis as unknown as Record<string, unknown>).NodeBookDom = {
  renderNodeBook,
  renderNodeBookSchema,
  registerSchemaSource,
  unregisterSchemaSource,
  factorySchemasText
}
