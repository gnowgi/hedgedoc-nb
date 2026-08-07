/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  getMergedSchemas,
  getOperationsFromCnl,
  operationsToGraph,
  TransitiveClosureEngine,
  validateOperations
} from '@nodebook/core'
import type { CnlGraphData, CnlOperation, CnlParseError, InferredEdge } from '@nodebook/core'
import cytoscape from 'cytoscape'
import type { Core, LayoutOptions } from 'cytoscape'
import {
  buildCytoscapeElements,
  buildInferredEdgeElements,
  CONTAINMENT_RELATIONS,
  filterGraphForMorphs
} from './elements'
import { backgroundColor, buildStylesheet } from './styles'
import type { NodeBookTheme } from './styles'
import { attachUi } from './ui'
import type { ToolbarAction, UiHandle } from './ui'

export type NodeBookLayout = 'breadthfirst' | 'cose' | 'grid' | 'circle' | 'concentric'

const ALL_LAYOUTS: readonly NodeBookLayout[] = ['breadthfirst', 'cose', 'grid', 'circle', 'concentric']

export interface RenderNodeBookOptions {
  /** Color theme. Default 'light'. */
  theme?: NodeBookTheme
  /** Cytoscape layout name. Default 'breadthfirst'. */
  layout?: NodeBookLayout
  /** Render attributes as leaf nodes. Default true. */
  showAttributes?: boolean
  /** Initial active morph per node id (node id → morph id). */
  activeMorphs?: Record<string, string>
  /** Show the fit / layout / PNG toolbar. Default true. */
  toolbar?: boolean
  /** Open an inspector panel (details + morph switcher) on node click. Default true. */
  inspector?: boolean
  /**
   * Derive and display inferred relations (transitive closure, inverse and
   * symmetric relations, membership inheritance) as dashed purple edges.
   * Default true.
   */
  inference?: boolean
  /**
   * Start in containment view: nest nodes inside compound parents along
   * is_a / member_of / instance_of instead of drawing those edges.
   * Default false. Toggleable at runtime via the toolbar or setContainment().
   */
  containment?: boolean
  /**
   * Extra host-provided toolbar buttons (e.g. an "Edit source" action in an
   * editor integration), appended after the built-in ones.
   */
  toolbarActions?: ToolbarAction[]
  /**
   * Run Cytoscape headlessly (no container, no rendering). Useful for tests
   * and server-side graph inspection. When true, `container` may be null.
   */
  headless?: boolean
}

export interface NodeBookHandle {
  /** The live Cytoscape instance. */
  cy: Core
  /** The full (unfiltered) graph built from the CNL source. */
  graph: CnlGraphData
  /** The parsed operations. */
  operations: CnlOperation[]
  /** Parse errors. Rendering proceeds on best effort. */
  errors: CnlParseError[]
  /** Advisory schema warnings (unknown types etc.), never fatal. */
  warnings: CnlParseError[]
  /** Inferred relations for the currently visible (morph-filtered) graph. */
  getInferredEdges(): InferredEdge[]
  /** Toggle containment view (compound nesting along is_a/member_of/instance_of). */
  setContainment(enabled: boolean): void
  /** Switch a node to one of its morphs (by morph id or morph name) and re-render. */
  setMorph(nodeId: string, morph: string): void
  /** Switch the color theme in place. */
  setTheme(theme: NodeBookTheme): void
  /** Re-run the layout, optionally with a different layout name. */
  relayout(layout?: NodeBookLayout): void
  /** Tear down the Cytoscape instance and release the container. */
  destroy(): void
}

function layoutOptions(name: NodeBookLayout): LayoutOptions {
  switch (name) {
    case 'breadthfirst':
      return { name, directed: true, spacingFactor: 1.2, padding: 24 } as LayoutOptions
    default:
      return { name, padding: 24 } as LayoutOptions
  }
}

/**
 * Parse nodeBook CNL and render it as an interactive Cytoscape graph inside
 * `container`. Framework-agnostic: no React, no build-time CSS.
 *
 * ```ts
 * import { renderNodeBook } from '@nodebook/dom'
 * const handle = renderNodeBook(document.querySelector('#graph'), cnlText)
 * ```
 */
export function renderNodeBook(
  container: HTMLElement | null,
  code: string,
  options: RenderNodeBookOptions = {}
): NodeBookHandle {
  const headless = options.headless ?? false
  if (!container && !headless) {
    throw new Error('@nodebook/dom: renderNodeBook needs a container element (or set options.headless)')
  }

  const operations = getOperationsFromCnl(code)
  const warnings = validateOperations(operations)
  const graph = operationsToGraph(operations)
  const errors = graph.errors

  let theme: NodeBookTheme = options.theme ?? 'light'
  let currentLayout: NodeBookLayout = options.layout ?? 'breadthfirst'
  const showAttributes = options.showAttributes ?? true
  const activeMorphs: Record<string, string> = { ...options.activeMorphs }

  if (container) {
    container.classList.add('nodebook-graph-container')
    if (container.clientHeight === 0 && !container.style.height) {
      container.style.height = '420px'
    }
    container.style.backgroundColor = backgroundColor(theme)
  }

  const inferenceEnabled = options.inference ?? true
  let inferredEdges: InferredEdge[] = []
  const computeInference = (): void => {
    if (!inferenceEnabled) return
    try {
      const filtered = filterGraphForMorphs(graph, activeMorphs)
      inferredEdges = new TransitiveClosureEngine().infer(filtered, getMergedSchemas()).inferredEdges
    } catch {
      inferredEdges = []
    }
  }
  computeInference()

  let containment = options.containment ?? false

  const buildExplicit = () =>
    buildCytoscapeElements(graph, { activeMorphs, showAttributes, containment, inferredEdges })

  const elements = buildExplicit()
  const cy = cytoscape({
    ...(headless ? { headless: true, styleEnabled: false } : { container: container as HTMLElement }),
    elements,
    ...(headless ? {} : { style: buildStylesheet(theme) }),
    // Layout runs explicitly below so inferred edges can be added after it.
    layout: { name: 'preset' }
  })

  // Inferred edges are added AFTER the layout finishes: node positions should
  // come from explicit structure only, with derived facts arcing over it.
  const layoutThenInferred = (): void => {
    const addInferred = (): void => {
      // In containment view, inferred containment facts are expressed by the
      // nesting itself — only non-containment inferences get arrows.
      const visible = containment ? inferredEdges.filter((e) => !CONTAINMENT_RELATIONS.has(e.name)) : inferredEdges
      if (visible.length > 0 && cy.$('edge[kind = "inferred-relation"]').length === 0) {
        cy.add(buildInferredEdgeElements(visible, graph))
      }
    }
    if (headless) {
      addInferred()
      return
    }
    cy.one('layoutstop', addInferred)
    cy.layout(layoutOptions(currentLayout)).run()
  }
  layoutThenInferred()

  const rebuildElements = (): void => {
    computeInference()
    const next = buildExplicit()
    cy.elements().remove()
    cy.add(next)
    layoutThenInferred()
  }

  const setContainment = (enabled: boolean): void => {
    if (containment === enabled) return
    containment = enabled
    // cose is the compound-aware built-in layout; switch to it when nesting.
    if (enabled && currentLayout === 'breadthfirst') {
      currentLayout = 'cose'
    }
    rebuildElements()
    ui?.refreshToolbar()
  }

  const setMorph = (nodeId: string, morph: string): void => {
    const node = graph.nodes.find((n) => n.id === nodeId)
    if (!node) {
      throw new Error(`@nodebook/dom: unknown node "${nodeId}"`)
    }
    const target = node.morphs.find((m) => m.morph_id === morph || m.name === morph)
    if (!target) {
      const available = node.morphs.map((m) => m.name).join(', ')
      throw new Error(`@nodebook/dom: node "${nodeId}" has no morph "${morph}" (available: ${available})`)
    }
    activeMorphs[nodeId] = target.morph_id
    rebuildElements()
    ui?.refreshInspector()
  }

  const relayout = (layout?: NodeBookLayout): void => {
    if (layout) {
      currentLayout = layout
    }
    if (!headless) {
      cy.layout(layoutOptions(currentLayout)).run()
    }
  }

  let ui: UiHandle | null = null
  const wantToolbar = options.toolbar ?? true
  const wantInspector = options.inspector ?? true
  if (!headless && container && (wantToolbar || wantInspector)) {
    ui = attachUi(cy, container, {
      toolbar: wantToolbar,
      inspector: wantInspector,
      theme,
      layouts: ALL_LAYOUTS,
      currentLayout: () => currentLayout,
      graph,
      activeMorphs,
      getInferredEdges: () => inferredEdges,
      hasContainment: graph.edges.some((e) => CONTAINMENT_RELATIONS.has(e.name)),
      isContainmentActive: () => containment,
      onToggleContainment: () => setContainment(!containment),
      onMorphSelect: setMorph,
      onFit: () => cy.fit(undefined, 24),
      onRelayout: relayout,
      extraActions: options.toolbarActions,
      onExportPng: () => {
        const uri = cy.png({ full: true, scale: 2, bg: backgroundColor(theme) })
        const link = container.ownerDocument.createElement('a')
        link.href = uri
        link.download = 'nodebook-graph.png'
        link.click()
      }
    })
  }

  return {
    cy,
    graph,
    operations,
    errors,
    warnings,
    getInferredEdges: () => inferredEdges,
    setContainment,
    setMorph,
    setTheme(next: NodeBookTheme): void {
      theme = next
      if (!headless) {
        cy.style(buildStylesheet(theme))
      }
      if (container) {
        container.style.backgroundColor = backgroundColor(theme)
      }
      ui?.setTheme(next)
    },
    relayout,
    destroy(): void {
      ui?.destroy()
      ui = null
      cy.destroy()
    }
  }
}

export interface HydrateOptions extends RenderNodeBookOptions {
  /**
   * Attribute carrying the CNL source, as emitted by `@nodebook/markdown-it`.
   * Default `data-nodebook`.
   */
  dataAttribute?: string
}

/**
 * Find every placeholder emitted by `@nodebook/markdown-it` under `root` and
 * render it. Already-hydrated placeholders are skipped, so calling this after
 * incremental re-renders is safe. Returns the handles of newly hydrated blocks.
 */
export function hydrateNodeBookBlocks(root: ParentNode, options: HydrateOptions = {}): NodeBookHandle[] {
  const dataAttribute = options.dataAttribute ?? 'data-nodebook'
  const handles: NodeBookHandle[] = []
  const blocks = root.querySelectorAll<HTMLElement>(`[${dataAttribute}]`)
  for (const block of blocks) {
    if (block.dataset.nodebookHydrated === 'true') continue
    const code = block.getAttribute(dataAttribute) ?? ''
    block.dataset.nodebookHydrated = 'true'
    handles.push(renderNodeBook(options.headless ? null : block, code, options))
  }
  return handles
}
