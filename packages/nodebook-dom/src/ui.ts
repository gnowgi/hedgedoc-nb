/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlGraphData, CnlNode, InferredEdge } from '@nodebook/core'
import type { Core } from 'cytoscape'
import { filterGraphForMorphs } from './elements'
import type { NodeBookTheme } from './styles'

export type NodeBookLayoutName = 'process' | 'breadthfirst' | 'cose' | 'grid' | 'circle' | 'concentric'

const STYLE_ELEMENT_ID = 'nodebook-dom-ui-styles'

const UI_CSS = `
.nodebook-graph-container {
  position: relative;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  box-sizing: border-box;
  overflow: hidden;
}
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
.nb-ui-btn.nb-ui-active { background: var(--nb-accent); border-color: var(--nb-accent); color: var(--nb-accent-text); }
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
.nb-ui-inspector .nb-ui-inferred { color: var(--nb-inferred); font-style: italic; }
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
.nb-ui-tooltip {
  position: absolute; z-index: 20; pointer-events: none;
  max-width: 280px; padding: 6px 10px;
  background: var(--nb-panel-bg); color: var(--nb-text);
  border: 1px solid var(--nb-inferred); border-radius: 6px;
  font: 11px/1.5 system-ui, sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.22);
}
.nb-ui-tooltip .nb-ui-tooltip-rule {
  color: var(--nb-inferred); font-weight: 600; text-transform: uppercase;
  font-size: 10px; letter-spacing: 0.05em; display: block; margin-bottom: 2px;
}
[data-nb-theme='light'] {
  --nb-panel-bg: #ffffff; --nb-text: #22313f; --nb-muted: #7a8894;
  --nb-border: #ccd6df; --nb-accent: #4d8fd1; --nb-accent-text: #ffffff;
  --nb-badge-bg: #e7f1ff; --nb-badge-text: #1a3350; --nb-inferred: #7c3aed;
}
[data-nb-theme='dark'] {
  --nb-panel-bg: #1d2430; --nb-text: #dbe4ee; --nb-muted: #8b99a8;
  --nb-border: #3a4656; --nb-accent: #5c9ded; --nb-accent-text: #10161f;
  --nb-badge-bg: #1f3a5a; --nb-badge-text: #dbe9f8; --nb-inferred: #a78bfa;
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
  /** Inferred relations for the currently visible graph (optional). */
  inferredEdges?: InferredEdge[]
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

  const inferred = (ctx.inferredEdges ?? []).filter((e) => e.source_id === node.id || e.target_id === node.id)
  if (inferred.length > 0) {
    const heading = doc.createElement('h4')
    heading.textContent = 'Inferred'
    panel.appendChild(heading)
    const list = doc.createElement('ul')
    for (const edge of inferred) {
      const item = doc.createElement('li')
      item.className = 'nb-ui-inferred'
      item.textContent =
        edge.source_id === node.id
          ? `${edge.name} → ${nodeNames.get(edge.target_id) ?? edge.target_id}`
          : `${nodeNames.get(edge.source_id) ?? edge.source_id} → ${edge.name}`
      item.title = `${edge.inferenceRule}: ${edge.proofPath.join(' → ')}`
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

export interface ToolbarAction {
  label: string
  title?: string
  onClick: () => void
}

export interface ToolbarContext {
  layouts: readonly NodeBookLayoutName[]
  currentLayout: () => NodeBookLayoutName
  onFit: () => void
  onRelayout: (layout: NodeBookLayoutName) => void
  onExportPng: () => void
  /** Show a "Nest" toggle for containment view. */
  hasContainment?: boolean
  isContainmentActive?: () => boolean
  onToggleContainment?: () => void
  /** Show an "Inferred" toggle for derived relations. */
  hasInferredToggle?: boolean
  isInferredVisible?: () => boolean
  onToggleInferred?: () => void
  /** Show a "Reset" button for the token simulation. */
  hasSimulation?: boolean
  onResetSimulation?: () => void
  /** Host-provided extra buttons, appended at the end of the toolbar. */
  extraActions?: ToolbarAction[]
}

/** Build the toolbar (fit, containment toggle, layout picker, PNG export). Pure DOM. */
export function buildToolbar(doc: Document, ctx: ToolbarContext): HTMLElement {
  const bar = doc.createElement('div')
  bar.className = 'nb-ui-toolbar'

  const fit = doc.createElement('button')
  fit.className = 'nb-ui-btn'
  fit.textContent = 'Fit'
  fit.title = 'Fit graph to view'
  fit.addEventListener('click', () => ctx.onFit())
  bar.appendChild(fit)

  if (ctx.hasContainment && ctx.onToggleContainment) {
    const nest = doc.createElement('button')
    nest.className = 'nb-ui-btn nb-ui-nest' + (ctx.isContainmentActive?.() ? ' nb-ui-active' : '')
    nest.textContent = 'Nest'
    nest.title = 'Toggle containment view (nest along is_a / member_of)'
    nest.addEventListener('click', () => ctx.onToggleContainment!())
    bar.appendChild(nest)
  }

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

  if (ctx.hasInferredToggle && ctx.onToggleInferred) {
    const inferred = doc.createElement('button')
    inferred.className = 'nb-ui-btn nb-ui-inferred-toggle' + ((ctx.isInferredVisible?.() ?? true) ? ' nb-ui-active' : '')
    inferred.textContent = 'Inferred'
    inferred.title = 'Show or hide derived relations (transitive closure, inheritance)'
    inferred.addEventListener('click', () => ctx.onToggleInferred!())
    bar.appendChild(inferred)
  }

  if (ctx.hasSimulation && ctx.onResetSimulation) {
    const reset = doc.createElement('button')
    reset.className = 'nb-ui-btn nb-ui-reset'
    reset.textContent = 'Reset'
    reset.title = 'Reset the token simulation to its initial marking'
    reset.addEventListener('click', () => ctx.onResetSimulation!())
    bar.appendChild(reset)
  }

  const png = doc.createElement('button')
  png.className = 'nb-ui-btn'
  png.textContent = 'PNG'
  png.title = 'Download as PNG'
  png.addEventListener('click', () => ctx.onExportPng())
  bar.appendChild(png)

  for (const action of ctx.extraActions ?? []) {
    const btn = doc.createElement('button')
    btn.className = 'nb-ui-btn'
    btn.textContent = action.label
    if (action.title) btn.title = action.title
    btn.addEventListener('click', () => action.onClick())
    bar.appendChild(btn)
  }

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
  getInferredEdges?: () => InferredEdge[]
  hasInferredToggle?: () => boolean
  isInferredVisible?: () => boolean
  onToggleInferred?: () => void
  hasContainment?: boolean
  isContainmentActive?: () => boolean
  onToggleContainment?: () => void
  hasSimulation?: boolean
  onResetSimulation?: () => void
  /** Nodes for which the inspector should NOT open on tap (e.g. fireable transitions). */
  suppressInspectorFor?: (nodeId: string) => boolean
  onMorphSelect: (nodeId: string, morphId: string) => void
  onFit: () => void
  onRelayout: (layout: NodeBookLayoutName) => void
  onExportPng: () => void
  extraActions?: ToolbarAction[]
}

export interface UiHandle {
  setTheme(theme: NodeBookTheme): void
  /** Re-render the inspector (after a morph switch or element rebuild). */
  refreshInspector(): void
  /** Re-render the toolbar (after containment or layout state changes). */
  refreshToolbar(): void
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
  const mountToolbar = (): void => {
    toolbarEl?.remove()
    toolbarEl = buildToolbar(doc, {
      layouts: options.layouts,
      currentLayout: options.currentLayout,
      onFit: options.onFit,
      onRelayout: options.onRelayout,
      onExportPng: options.onExportPng,
      hasContainment: options.hasContainment,
      isContainmentActive: options.isContainmentActive,
      onToggleContainment: options.onToggleContainment,
      hasInferredToggle: options.hasInferredToggle?.(),
      isInferredVisible: options.isInferredVisible,
      onToggleInferred: options.onToggleInferred,
      hasSimulation: options.hasSimulation,
      onResetSimulation: options.onResetSimulation,
      extraActions: options.extraActions
    })
    isolateFromGraph(toolbarEl)
    container.appendChild(toolbarEl)
  }
  if (options.toolbar) {
    mountToolbar()
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
      inferredEdges: options.getInferredEdges?.(),
      onMorphSelect: options.onMorphSelect,
      onClose: closeInspector
    })
    isolateFromGraph(inspectorEl)
    container.appendChild(inspectorEl)
  }

  if (options.inspector) {
    cy.on('tap', 'node[kind = "concept"]', (event) => {
      const nodeId = event.target.id() as string
      if (options.suppressInspectorFor?.(nodeId)) return
      openInspector(nodeId)
    })
    cy.on('tap', (event) => {
      if (event.target === cy) closeInspector()
    })
  }

  // Styled hover tooltip for inferred edges: inference rule + proof chain.
  let tooltipEl: HTMLElement | null = null
  const hideTooltip = (): void => {
    tooltipEl?.remove()
    tooltipEl = null
  }
  cy.on('mouseover', 'edge[kind = "inferred-relation"]', (event) => {
    hideTooltip()
    tooltipEl = doc.createElement('div')
    tooltipEl.className = 'nb-ui-tooltip'
    const rule = doc.createElement('span')
    rule.className = 'nb-ui-tooltip-rule'
    rule.textContent = String(event.target.data('inferenceRule') ?? 'inferred')
    tooltipEl.appendChild(rule)
    tooltipEl.appendChild(doc.createTextNode(String(event.target.data('proofPath') ?? '')))
    // Prefer the pointer's own position (present on real mouse events); fall
    // back to the edge midpoint, which may be missing before a render frame.
    const rendered = (event as { renderedPosition?: { x: number; y: number } }).renderedPosition
    let x = rendered?.x
    let y = rendered?.y
    if (typeof x !== 'number' || typeof y !== 'number') {
      const mid = (event.target as { midpoint?: () => { x: number; y: number } | undefined }).midpoint?.()
      if (mid && typeof mid.x === 'number') {
        const pan = cy.pan()
        const zoom = cy.zoom()
        x = mid.x * zoom + pan.x
        y = mid.y * zoom + pan.y
      }
    }
    tooltipEl.style.left = `${Math.max(4, (x ?? 0) + 12)}px`
    tooltipEl.style.top = `${Math.max(4, (y ?? 0) + 12)}px`
    container.appendChild(tooltipEl)
  })
  cy.on('mouseout', 'edge[kind = "inferred-relation"]', hideTooltip)
  cy.on('pan zoom', hideTooltip)

  return {
    setTheme(theme: NodeBookTheme): void {
      container.dataset.nbTheme = theme
    },
    refreshInspector(): void {
      if (inspectedNodeId) openInspector(inspectedNodeId)
    },
    refreshToolbar(): void {
      if (options.toolbar) mountToolbar()
    },
    destroy(): void {
      closeInspector()
      hideTooltip()
      toolbarEl?.remove()
      toolbarEl = null
    }
  }
}
