/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import '@logseq/libs'
import { ensureVendorLoaded, hostNodeBookDom } from './nodebook-renderer'

/** The user-editable schema store: a normal Logseq page. */
export const SCHEMAS_PAGE = 'nodebook/schemas'
const PAGE_SOURCE_ID = 'logseq:schemas-page'
const FENCE_RE = /```node[bB]ook-schema\n([\s\S]*?)```/g

let lastAppliedText: string | null = null

/** Extract every ```nodeBook-schema fence from a page's blocks. */
async function collectSchemaFences(pageName: string): Promise<string[]> {
  const tree = await logseq.Editor.getPageBlocksTree(pageName)
  const texts: string[] = []
  const walk = (blocks: Array<{ content?: string; children?: unknown }>): void => {
    for (const block of blocks ?? []) {
      const content = block.content ?? ''
      for (const match of content.matchAll(FENCE_RE)) {
        texts.push(match[1])
      }
      if (Array.isArray(block.children)) {
        walk(block.children as Array<{ content?: string; children?: unknown }>)
      }
    }
  }
  walk((tree ?? []) as Array<{ content?: string; children?: unknown }>)
  return texts
}

/**
 * Resolve a `schemas: [[Page A]], [[Page B]];` directive at the top of a
 * nodeBook fence: returns the fence body without the directive plus the
 * linked pages' schema-block texts (in listed order — later pages override
 * earlier ones by name, and all of them override the shared store).
 */
export async function resolveSchemaDirective(code: string): Promise<{ code: string; schemaTexts: string[] }> {
  const lines = code.split('\n')
  const directiveIndex = lines.findIndex((line) => line.trim().length > 0)
  const directive = directiveIndex >= 0 ? lines[directiveIndex].trim() : ''
  const match = directive.match(/^schemas:\s*(.+?);?\s*$/)
  if (!match) return { code, schemaTexts: [] }

  const pageNames = [...match[1].matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1])
  if (pageNames.length === 0) return { code, schemaTexts: [] }

  const schemaTexts: string[] = []
  for (const name of pageNames) {
    try {
      const fences = await collectSchemaFences(name)
      if (fences.length > 0) {
        schemaTexts.push(fences.join('\n'))
      } else {
        console.warn(`logseq-nodebook: schema page "${name}" has no \`\`\`nodeBook-schema fences`)
      }
    } catch (error) {
      console.warn(`logseq-nodebook: could not read schema page "${name}"`, error)
    }
  }
  const stripped = [...lines.slice(0, directiveIndex), ...lines.slice(directiveIndex + 1)].join('\n')
  return { code: stripped, schemaTexts }
}

/** Read the schemas page and (re-)register it as the shared store source. */
export async function applySchemasPage(): Promise<void> {
  await ensureVendorLoaded()
  const host = hostNodeBookDom()
  if (!host) return
  const texts = await collectSchemaFences(SCHEMAS_PAGE)
  const combined = texts.join('\n')
  if (combined === lastAppliedText) return
  lastAppliedText = combined
  if (combined.trim().length > 0) {
    host.registerSchemaSource(PAGE_SOURCE_ID, combined)
  } else {
    host.unregisterSchemaSource(PAGE_SOURCE_ID)
  }
}

/**
 * Make sure the schemas page exists; seed it with the factory schemas so the
 * built-in type system is visible and editable. Then load it and watch for
 * edits (debounced — the store version bump makes live graphs refresh).
 */
export async function initSchemasPage(): Promise<void> {
  await ensureVendorLoaded()
  const host = hostNodeBookDom()
  if (!host) return

  const existing = await logseq.Editor.getPage(SCHEMAS_PAGE)
  if (!existing) {
    const factory = host.factorySchemasText()
    const intro =
      'This page is the editable nodeBook schema store. Definitions in ```nodeBook-schema fences here apply to every nodeBook graph. The block below was seeded from the built-in (factory) schemas — edit or extend it; your version of a definition wins by name.'
    await logseq.Editor.createPage(SCHEMAS_PAGE, {}, { redirect: false, createFirstBlock: false })
    await logseq.Editor.appendBlockInPage(SCHEMAS_PAGE, intro)
    await logseq.Editor.appendBlockInPage(SCHEMAS_PAGE, '```nodeBook-schema\n' + factory + '\n```')
  }
  await applySchemasPage()

  let timer: ReturnType<typeof setTimeout> | null = null
  logseq.DB.onChanged(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void applySchemasPage()
    }, 1500)
  })
}
