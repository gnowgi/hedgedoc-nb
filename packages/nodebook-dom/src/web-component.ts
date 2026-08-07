/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { renderNodeBook } from './render'
import type { NodeBookHandle, NodeBookLayout } from './render'
import type { NodeBookTheme } from './styles'

// SSR/Node safety: this module must be importable without a DOM (headless
// rendering is a supported use of the package), so fall back to a dummy base
// class when HTMLElement does not exist. defineNodeBookElement() guards for
// real DOM support at call time.
const ElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement)

/**
 * `<nodebook-graph>` custom element. The CNL source comes from the `code`
 * attribute or, more conveniently for multi-line CNL, the element's text
 * content:
 *
 * ```html
 * <nodebook-graph theme="dark" layout="cose">
 *   # Water [Substance]
 *   boiling_point: 100 *C*;
 * </nodebook-graph>
 * ```
 */
export class NodeBookGraphElement extends ElementBase {
  static observedAttributes = ['code', 'theme', 'layout']

  private handle: NodeBookHandle | null = null
  private mount: HTMLDivElement | null = null

  connectedCallback(): void {
    this.render()
  }

  disconnectedCallback(): void {
    this.teardown()
  }

  attributeChangedCallback(): void {
    if (this.isConnected && this.mount) {
      this.render()
    }
  }

  /** The live render handle, for programmatic control (setMorph, relayout, …). */
  get graphHandle(): NodeBookHandle | null {
    return this.handle
  }

  private sourceCode(): string {
    const attr = this.getAttribute('code')
    if (attr !== null && attr !== '') return attr
    // textContent keeps the original indentation of the embedded CNL; strip
    // the common leading whitespace so authors can indent naturally.
    const raw = this.mount ? (this.dataset.nodebookSource ?? '') : (this.textContent ?? '')
    return dedent(raw)
  }

  private render(): void {
    if (!this.mount) {
      // Preserve the original source before replacing children with the mount.
      this.dataset.nodebookSource = this.textContent ?? ''
      this.mount = document.createElement('div')
      this.mount.style.width = '100%'
      this.mount.style.height = '100%'
      this.replaceChildren(this.mount)
      if (this.clientHeight === 0 && !this.style.height) {
        this.style.display = 'block'
        this.style.height = '420px'
      }
    }
    this.teardown()
    const theme = (this.getAttribute('theme') as NodeBookTheme | null) ?? 'light'
    const layout = (this.getAttribute('layout') as NodeBookLayout | null) ?? 'breadthfirst'
    this.handle = renderNodeBook(this.mount, this.sourceCode(), { theme, layout })
  }

  private teardown(): void {
    this.handle?.destroy()
    this.handle = null
  }
}

function dedent(text: string): string {
  const lines = text.replace(/^\n+/, '').replace(/\s+$/, '').split('\n')
  const indents = lines.filter((l) => l.trim().length > 0).map((l) => l.match(/^\s*/)![0].length)
  const common = indents.length > 0 ? Math.min(...indents) : 0
  return lines.map((l) => l.slice(common)).join('\n')
}

/** Register `<nodebook-graph>` (or a custom tag name) as a custom element. */
export function defineNodeBookElement(tagName = 'nodebook-graph'): void {
  if (typeof customElements === 'undefined' || typeof HTMLElement === 'undefined') {
    throw new Error('@nodebook/dom: defineNodeBookElement requires a DOM environment')
  }
  if (!customElements.get(tagName)) {
    customElements.define(tagName, NodeBookGraphElement)
  }
}
