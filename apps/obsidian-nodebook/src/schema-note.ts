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
import { registerSchemaSource, unregisterSchemaSource } from '@nodebook/dom'
import { TFile } from 'obsidian'
import type { App } from 'obsidian'

/** The user-editable schema store: a normal note in the vault. */
export const SCHEMAS_NOTE_PATH = 'nodebook/schemas.md'
const NOTE_SOURCE_ID = 'obsidian:schemas-note'
const FENCE_RE = /```node[bB]ook-schema\n([\s\S]*?)```/g

let lastAppliedText: string | null = null

export function factorySchemasText(): string {
  return serializeSchemas({ nodeTypes, relationTypes, attributeTypes, transitionTypes, functionTypes })
}

function extractSchemaFences(markdown: string): string[] {
  return [...markdown.matchAll(FENCE_RE)].map((m) => m[1])
}

/** Read the schemas note and (re-)register it as the shared store source. */
export async function applySchemasNote(app: App): Promise<void> {
  const file = app.vault.getAbstractFileByPath(SCHEMAS_NOTE_PATH)
  if (!(file instanceof TFile)) {
    unregisterSchemaSource(NOTE_SOURCE_ID)
    lastAppliedText = null
    return
  }
  const markdown = await app.vault.cachedRead(file)
  const combined = extractSchemaFences(markdown).join('\n')
  if (combined === lastAppliedText) return
  lastAppliedText = combined
  if (combined.trim().length > 0) {
    registerSchemaSource(NOTE_SOURCE_ID, combined)
  } else {
    unregisterSchemaSource(NOTE_SOURCE_ID)
  }
}

/**
 * Make sure the schemas note exists; seed it with the factory schemas so the
 * built-in type system is visible and editable, then load it.
 */
export async function initSchemasNote(app: App): Promise<void> {
  if (!app.vault.getAbstractFileByPath(SCHEMAS_NOTE_PATH)) {
    const folder = SCHEMAS_NOTE_PATH.split('/').slice(0, -1).join('/')
    if (folder && !app.vault.getAbstractFileByPath(folder)) {
      await app.vault.createFolder(folder).catch(() => undefined)
    }
    const body = [
      'This note is the editable nodeBook schema store. Definitions in `nodeBook-schema` fences here apply to every nodeBook graph in the vault.',
      'The block below was seeded from the built-in (factory) schemas — edit or extend it; your version of a definition wins by name.',
      '',
      '```nodeBook-schema',
      factorySchemasText(),
      '```',
      ''
    ].join('\n')
    await app.vault.create(SCHEMAS_NOTE_PATH, body).catch(() => undefined)
  }
  await applySchemasNote(app)
}

/**
 * Resolve a `schemas: [[Note]]` directive at the top of a nodeBook fence:
 * returns the fence body without the directive plus the linked notes'
 * schema-block texts (in listed order — later notes override earlier ones by
 * name, and all of them override the shared store).
 */
export async function resolveSchemaDirective(
  app: App,
  code: string,
  sourcePath: string
): Promise<{ code: string; schemaTexts: string[] }> {
  const lines = code.split('\n')
  const directiveIndex = lines.findIndex((line) => line.trim().length > 0)
  const directive = directiveIndex >= 0 ? lines[directiveIndex].trim() : ''
  const match = directive.match(/^schemas:\s*(.+?);?\s*$/)
  if (!match) return { code, schemaTexts: [] }

  const linkNames = [...match[1].matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim())
  if (linkNames.length === 0) return { code, schemaTexts: [] }

  const schemaTexts: string[] = []
  for (const name of linkNames) {
    const file = app.metadataCache.getFirstLinkpathDest(name, sourcePath)
    if (!file) {
      console.warn(`obsidian-nodebook: schema note "${name}" not found`)
      continue
    }
    const markdown = await app.vault.cachedRead(file)
    const fences = extractSchemaFences(markdown)
    if (fences.length > 0) {
      schemaTexts.push(fences.join('\n'))
    } else {
      console.warn(`obsidian-nodebook: schema note "${name}" has no \`\`\`nodeBook-schema fences`)
    }
  }
  const stripped = [...lines.slice(0, directiveIndex), ...lines.slice(directiveIndex + 1)].join('\n')
  return { code: stripped, schemaTexts }
}
