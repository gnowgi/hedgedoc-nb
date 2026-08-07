/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlGraphData, CnlNode } from '@nodebook/core'
import type { Core } from 'cytoscape'
import { filterGraphForMorphs } from './elements'
import type { NodeBookTheme } from './styles'

export type NodeBookLayoutName = 'breadthfirst' | 'cose' | 'grid' | 'circle' | 'concentric'

const STYLE_ELEMENT_ID = 'nodebook-dom-ui-styles'

const UI_CSS = `
.nodebook-graph-container { position: relative; }
.nb-ui-toolbar {
  position: absolute; top: 8px; right: 8px; z-index: 10;
  display: flex; gap: 4px; align-items: center;
  font: 12px/1.4 system-ui, sans-serif;
}
.nb-ui-btn {
  border: 1px solid var(--nb-border); background: var(--nb-panel-bg); color: var(--nb-text);
  border-radius: 6px; padding: 3px 8px; cursor: pointer; font: inherit;
}
.nb-ui-btn:hover { border-color: var(--nb-accent); }
.nb-ui-select {
  border: 1px solid var(--nb-border); background: var(--nb-panel-bg); color: var(--nb-text);
  border-radius: 6px; padding: 2px 4px; font: inherit; cursor: pointer;
}
.nb-ui-inspector {
  position: absolute; top: 8px; left: 8px; z-index: 10;
  width: 240px; max-height: calc(100% - 16px); overflow-y: auto;
  background: var(--nb-panel-bg); color: var(--nb-text);
  border: 1px solid var(--nb-border); border-radius: 8px;
  padding: 10px 12px; font: 12px/1.5 system-ui, sans-serif;
  box-shadow: 0 2px 10px rgba(0,0,0,0.18);
}
.nb-ui-inspector h3 { margin: 0 0 2px; font-size: 14px; }
.nb-ui-inspector .nb-ui-role {
  display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;
  background: var(--nb-badge-bg); color: var(--nb-badge-text);
  border-radius: 4px; padding: 1px 6px; margin-bottom: 6px;
}
.nb-ui-inspector h4 {
  margin: 10px 0 3px; font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--nb-muted);
}
.nb-ui-inspector ul { margin: 0; padding-left: 16px; }
.nb-ui-inspector .nb-ui-negated { text-decoration: line-through; opacity: 0.75; }
.nb-ui-close {
  position: absolute; top: 6px; right: 8px; border: none; background: none;
  color: var(--nb-muted); cursor: pointer; font-size: 14px; line-height: 1; padding: 2px;
}
.nb-ui-close:hover { color: var(--nb-text); }
.nb-ui-morphs { display: flex; flex-wrap: wrap; gap: 4px; }
.nb-ui-morph-btn {
  border: 1px solid var(--nb-border); background: transparent; color: var(--nb-text);
  border-radius: 999px; padding: 2px 10px; cursor: pointer; font: inherit; font-size: 11px;
}
.nb-ui-morph-btn:hover { border-color: var(--nb-accent); }
.nb-ui-morph-btn.nb-ui-active {
  background: var(--nb-accent); border-color: var(--nb-accent); color: var(--nb-accent-text);
}
[data-nb-theme='light'] {
  --nb-panel-bg: #ffffff; --nb-text: #22313f; --nb-muted: #7a8894;
  --nb-border: #ccd6df; --nb-accent: #4d8fd1; --nb-accent-text: #ffffff;
  --nb-badge-bg: #e7f1ff; --nb-badge-text: #1a3350;
}
[data-nb-theme='dark'] {
  --nb-panel-bg: #1d2430; --nb-text: #dbe4ee; --nb-muted: #8b99a8;
  --nb-border: #3a4656; --nb-accent: #5c9ded; --nb-accent-text: #10161f;
  --nb-badge-bg: #1f3a5a; --nb-badge-text: #dbe9f8;
}
`

function ensureStylesInjected(doc: Document): void {
  if (!doc.getElementById(STYLE_ELEMENT_ID)) {
    const style = doc.createElement('style')
    style.id = STYLE_ELEMENT_ID
    style.textContent = UI_CSS
    doc.head.appendChild(style)
  }
}

export interface InspectorContext {
  graph: CnlGraphData
  /** Current morph selection (node id → morph id). */
  activeMorphs: Record<string, string>
  /** Called when the user picks a morph in the switcher. */
  onMorphSelect: (nodeId: string, morphId: string) => void
  onClose: () => void
}

/**
 * Build the inspector panel contents for one node: name, role, description,
 * morph switcher, visible attributes, and visible relations. Pure DOM — no
 * Cytoscape required — so it is unit-testable in jsdom.
 */
export function buildInspectorContent(doc: Document, nodeId: string, ctx: InspectorContext): HTMLElement {
  const node = ctx.graph.nodes.find((n) => n.id === nodeId)
  const panel = doc.createElement('div')
  panel.className = 'nb-ui-inspector'
  if (!node) {
    panel.textContent = `Unknown node "${nodeId}"`
    return panel
  }

  const filtered = filterGraphForMorphs(ctx.graph, ctx.activeMorphs)
  const nodeNames = new Map(ctx.graph.nodes.map((n) => [n.id, n.name]))

  const close = doc.createElement('button')
  close.className = 'nb-ui-close'
  close.textContent = '×'
  close.title = 'Close'
  close.addEventListener('click', () => ctx.onClose())
  panel.appendChild(close)

  const title = doc.createElement('h3')
  title.textContent = node.name
  panel.appendChild(title)

  const role = doc.createElement('span')
  role.className = 'nb-ui-role'
  role.textContent = node.role
  panel.appendChild(role)

  if (node.description) {
    const desc = doc.createElement('p')
    desc.textContent = node.description
    panel.appendChild(desc)
  }

  appendDetailRows(doc, panel, node)

  if (node.morphs.length > 1) {
    const heading = doc.createElement('h4')
    heading.textContent = 'Morphs'
    panel.appendChild(heading)
    const wrap = doc.createElement('div')
    wrap.className = 'nb-ui-morphs'
    const activeId = ctx.activeMorphs[node.id] ?? node.nbh
    for (const morph of node.morphs) {
      const btn = doc.createElement('button')
      btn.className = 'nb-ui-morph-btn' + (morph.morph_id === activeId ? ' nb-ui-active' : '')
      btn.textContent = morph.name
      btn.dataset.morphId = morph.morph_id
      btn.addEventListener('click', () => ctx.onMorphSelect(node.id, morph.morph_id))
      wrap.appendChild(btn)
    }
    panel.appendChild(wrap)
  }

  const attributes = filtered.attributes.filter((a) => a.source_id === node.id)
  if (attributes.length > 0) {
    const heading = doc.createElement('h4')
    heading.textContent = 'Attributes'
    panel.appendChild(heading)
    const list = doc.createElement('ul')
    for (const attr of attributes) {
      const item = doc.createElement('li')
      if (attr.negated) item.className = 'nb-ui-negated'
      const unit = attr.unit ? ` ${attr.unit}` : ''
      const adverb = attr.adverb ? `${attr.adverb} ` : ''
      item.textContent = `${attr.name}: ${adverb}${attr.value}${unit}`
      list.appendChild(item)
    }
    panel.appendChild(list)
  }

  const outgoing = filtered.edges.filter((e) => e.source_id === node.id)
  const incoming = filtered.edges.filter((e) => e.target_id === node.id)
  if (outgoing.length > 0 || incoming.length > 0) {
    const heading = doc.createElement('h4')
    heading.textContent = 'Relations'
    panel.appendChild(heading)
    const list = doc.createElement('ul')
    for (const edge of outgoing) {
      const item = doc.createElement('li')
      if (edge.negated) item.className = 'nb-ui-negated'
      item.textContent = `${edge.name} → ${nodeNames.get(edge.target_id) ?? edge.target_id}`
      list.appendChild(item)
    }
    for (const edge of incoming) {
      const item = doc.createElement('li')
      if (edge.negated) item.className = 'nb-ui-negated'
      item.textContent = `${nodeNames.get(edge.source_id) ?? edge.source_id} → ${edge.name}`
      list.appendChild(item)
    }
    panel.appendChild(list)
  }

  return panel
}

function appendDetailRows(doc: Document, panel: HTMLElement, node: CnlNode): void {
  const details: string[] = []
  if (node.adjective) details.push(`adjective: ${node.adjective}`)
  if (node.quantifier) details.push(`quantifier: ${node.quantifier}`)
  if (node.parent_types.length > 0) details.push(`is a: ${node.parent_types.join(', ')}`)
  if (details.length > 0) {
    const list = doc.createElement('ul')
    for (const line of details) {
      const item = doc.createElement('li')
      item.textContent = line
      list.appendChild(item)
    }
    panel.appendChild(list)
  }
}

export interface ToolbarContext {
  layouts: readonly NodeBookLayoutName[]
  currentLayout: () => NodeBookLayoutName
  onFit: () => void
  onRelayout: (layout: NodeBookLayoutName) => void
  onExportPng: () => void
}

/** Build the toolbar (fit, layout picker, PNG export). Pure DOM. */
export function buildToolbar(doc: Document, ctx: ToolbarContext): HTMLElement {
  const bar = doc.createElement('div')
  bar.className = 'nb-ui-toolbar'

  const fit = doc.createElement('button')
  fit.className = 'nb-ui-btn'
  fit.textContent = 'Fit'
  fit.title = 'Fit graph to view'
  fit.addEventListener('click', () => ctx.onFit())
  bar.appendChild(fit)

  const select = doc.createElement('select')
  select.className = 'nb-ui-select'
  select.title = 'Layout'
  for (const layout of ctx.layouts) {
    const option = doc.createElement('option')
    option.value = layout
    option.textContent = layout
    if (layout === ctx.currentLayout()) option.selected = true
    select.appendChild(option)
  }
  select.addEventListener('change', () => ctx.onRelayout(select.value as NodeBookLayoutName))
  bar.appendChild(select)

  const png = doc.createElement('button')
  png.className = 'nb-ui-btn'
  png.textContent = 'PNG'
  png.title = 'Download as PNG'
  png.addEventListener('click', () => ctx.onExportPng())
  bar.appendChild(png)

  return bar
}

export interface AttachUiOptions {
  toolbar: boolean
  inspector: boolean
  theme: NodeBookTheme
  layouts: readonly NodeBookLayoutName[]
  currentLayout: () => NodeBookLayoutName
  graph: CnlGraphData
  activeMorphs: Record<string, string>
  onMorphSelect: (nodeId: string, morphId: string) => void
  onFit: () => void
  onRelayout: (layout: NodeBookLayoutName) => void
  onExportPng: () => void
}

export interface UiHandle {
  setTheme(theme: NodeBookTheme): void
  /** Re-render the inspector (after a morph switch or element rebuild). */
  refreshInspector(): void
  destroy(): void
}

// Overlay panels live inside the same container Cytoscape listens on. Without
// this, a real mousedown on a panel bubbles to the container, Cytoscape treats
// it as a background tap (closing the inspector mid-gesture, which also
// cancels the button's pending click), and wheel-scrolling a panel zooms the
// graph. Stopping propagation at the panel keeps its own buttons working while
// hiding the interaction from Cytoscape.
function isolateFromGraph(el: HTMLElement): void {
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'touchstart', 'wheel']) {
    el.addEventListener(type, (event) => event.stopPropagation())
  }
}

/** Wire the toolbar and click-to-inspect panel onto a rendered graph. */
export function attachUi(cy: Core, container: HTMLElement, options: AttachUiOptions): UiHandle {
  const doc = container.ownerDocument
  ensureStylesInjected(doc)
  container.dataset.nbTheme = options.theme

  let toolbarEl: HTMLElement | null = null
  if (options.toolbar) {
    toolbarEl = buildToolbar(doc, {
      layouts: options.layouts,
      currentLayout: options.currentLayout,
      onFit: options.onFit,
      onRelayout: options.onRelayout,
      onExportPng: options.onExportPng
    })
    isolateFromGraph(toolbarEl)
    container.appendChild(toolbarEl)
  }

  let inspectorEl: HTMLElement | null = null
  let inspectedNodeId: string | null = null

  const closeInspector = (): void => {
    inspectorEl?.remove()
    inspectorEl = null
    inspectedNodeId = null
  }

  const openInspector = (nodeId: string): void => {
    inspectorEl?.remove()
    inspectedNodeId = nodeId
    inspectorEl = buildInspectorContent(doc, nodeId, {
      graph: options.graph,
      activeMorphs: options.activeMorphs,
      onMorphSelect: options.onMorphSelect,
      onClose: closeInspector
    })
    isolateFromGraph(inspectorEl)
    container.appendChild(inspectorEl)
  }

  if (options.inspector) {
    cy.on('tap', 'node[kind = "concept"]', (event) => {
      openInspector(event.target.id() as string)
    })
    cy.on('tap', (event) => {
      if (event.target === cy) closeInspector()
    })
  }

  return {
    setTheme(theme: NodeBookTheme): void {
      container.dataset.nbTheme = theme
    },
    refreshInspector(): void {
      if (inspectedNodeId) openInspector(inspectedNodeId)
    },
    destroy(): void {
      closeInspector()
      toolbarEl?.remove()
      toolbarEl = null
    }
  }
}
