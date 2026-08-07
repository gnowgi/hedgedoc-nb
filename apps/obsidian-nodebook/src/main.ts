/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { renderNodeBook } from '@nodebook/dom'
import type { NodeBookHandle, NodeBookTheme } from '@nodebook/dom'
import { MarkdownRenderChild, Plugin } from 'obsidian'

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

  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly plugin: NodeBookPlugin
  ) {
    super(containerEl)
  }

  override onload(): void {
    this.render()
    // Re-theme in place when the user switches Obsidian's base theme.
    this.registerEvent(this.plugin.app.workspace.on('css-change', () => this.handle?.setTheme(currentTheme())))
  }

  override onunload(): void {
    this.handle?.destroy()
    this.handle = null
  }

  private render(): void {
    this.handle?.destroy()
    this.containerEl.empty()
    try {
      this.handle = renderNodeBook(this.containerEl, this.source, { theme: currentTheme() })
    } catch (error) {
      this.containerEl.createDiv({ text: `nodeBook: render failed (${String(error)})` })
      console.error('obsidian-nodebook: render failed', error)
    }
  }
}

export default class NodeBookPlugin extends Plugin {
  override onload(): void {
    // Obsidian matches the fence info string exactly; cover common casings.
    for (const language of ['nodeBook', 'nodebook', 'NodeBook']) {
      try {
        this.registerMarkdownCodeBlockProcessor(language, (source, el, ctx) => {
          ctx.addChild(new NodeBookBlock(el, source, this))
        })
      } catch (error) {
        console.error(`obsidian-nodebook: could not register processor for "${language}"`, error)
      }
    }
  }
}
