/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { renderNodeBook, renderNodeBookSchema } from '@nodebook/dom'
import type { NodeBookHandle, NodeBookSchemaHandle, NodeBookTheme } from '@nodebook/dom'
import { MarkdownRenderChild, Plugin, TFile } from 'obsidian'
import { applySchemasNote, initSchemasNote, resolveSchemaDirective, SCHEMAS_NOTE_PATH } from './schema-note'

function currentTheme(): NodeBookTheme {
  return document.body.classList.contains('theme-dark') ? 'dark' : 'light'
}

/**
 * One rendered ```nodeBook block. MarkdownRenderChild ties the Cytoscape
 * instance's lifetime to the block's DOM: Obsidian calls onunload when the
 * preview re-renders or the leaf closes.
 */
class NodeBookBlock extends MarkdownRenderChild {
  private handle: NodeBookHandle | null = null
  private cancelled = false

  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly sourcePath: string,
    private readonly plugin: NodeBookPlugin
  ) {
    super(containerEl)
  }

  override onload(): void {
    void this.render()
    // Re-theme in place when the user switches Obsidian's base theme.
    this.registerEvent(this.plugin.app.workspace.on('css-change', () => this.handle?.setTheme(currentTheme())))
  }

  override onunload(): void {
    this.cancelled = true
    this.handle?.destroy()
    this.handle = null
  }

  private async render(): Promise<void> {
    // Resolve a leading `schemas: [[Note]]` directive before rendering.
    const { code, schemaTexts } = await resolveSchemaDirective(this.plugin.app, this.source, this.sourcePath)
    if (this.cancelled) return
    this.handle?.destroy()
    this.containerEl.empty()
    try {
      this.handle = renderNodeBook(this.containerEl, code, { theme: currentTheme(), schemaTexts })
    } catch (error) {
      this.containerEl.createDiv({ text: `nodeBook: render failed (${String(error)})` })
      console.error('obsidian-nodebook: render failed', error)
    }
  }
}

/** One rendered ```nodeBook-schema block: summary panel + store contribution. */
class NodeBookSchemaBlock extends MarkdownRenderChild {
  private handle: NodeBookSchemaHandle | null = null
  private static seq = 0

  constructor(
    containerEl: HTMLElement,
    private readonly source: string
  ) {
    super(containerEl)
  }

  override onload(): void {
    try {
      this.handle = renderNodeBookSchema(this.containerEl, this.source, {
        theme: currentTheme(),
        sourceId: `obsidian:block-${++NodeBookSchemaBlock.seq}`
      })
    } catch (error) {
      this.containerEl.createDiv({ text: `nodeBook schema: render failed (${String(error)})` })
      console.error('obsidian-nodebook: schema render failed', error)
    }
  }

  override onunload(): void {
    this.handle?.destroy()
    this.handle = null
  }
}

export default class NodeBookPlugin extends Plugin {
  override onload(): void {
    // Obsidian matches the fence info string exactly; cover common casings.
    for (const language of ['nodeBook', 'nodebook', 'NodeBook']) {
      try {
        this.registerMarkdownCodeBlockProcessor(language, (source, el, ctx) => {
          ctx.addChild(new NodeBookBlock(el, source, ctx.sourcePath, this))
        })
      } catch (error) {
        console.error(`obsidian-nodebook: could not register processor for "${language}"`, error)
      }
    }
    for (const language of ['nodeBook-schema', 'nodebook-schema']) {
      try {
        this.registerMarkdownCodeBlockProcessor(language, (source, el, ctx) => {
          ctx.addChild(new NodeBookSchemaBlock(el, source))
        })
      } catch (error) {
        console.error(`obsidian-nodebook: could not register schema processor for "${language}"`, error)
      }
    }

    // User-editable schema store: the nodebook/schemas.md note (seeded from
    // the factory schemas on first run, watched for edits — the store version
    // bump makes live graphs refresh).
    this.app.workspace.onLayoutReady(() => {
      void initSchemasNote(this.app).catch((error) =>
        console.error('obsidian-nodebook: schema note init failed', error)
      )
      let timer: ReturnType<typeof setTimeout> | null = null
      this.registerEvent(
        this.app.vault.on('modify', (file) => {
          if (!(file instanceof TFile) || file.path !== SCHEMAS_NOTE_PATH) return
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            void applySchemasNote(this.app)
          }, 1200)
        })
      )
    })
  }
}
