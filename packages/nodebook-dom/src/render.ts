/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  getMergedSchemas,
  getOperationsFromCnl,
  operationsToGraph,
  PrologInferenceEngine,
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
import type { AttributeDisplay } from './elements'
import { backgroundColor, buildStylesheet } from './styles'
import type { NodeBookTheme } from './styles'
import {
  buildProcessModel,
  computeProcessPositions,
  fireTransition as fireProcessTransition,
  isTransitionEnabled,
  placeLabel
} from './simulation'
import type { ProcessModel } from './simulation'
import { attachUi } from './ui'
import type { ToolbarAction, UiHandle } from './ui'

export type NodeBookLayout = 'process' | 'breadthfirst' | 'cose' | 'grid' | 'circle' | 'concentric'

const ALL_LAYOUTS: readonly NodeBookLayout[] = ['breadthfirst', 'cose', 'grid', 'circle', 'concentric']

export interface RenderNodeBookOptions {
  /** Color theme. Default 'light'. */
  theme?: NodeBookTheme
  /** Cytoscape layout name. Default 'cose' ('process' for process graphs). */
  layout?: NodeBookLayout
  /**
   * How to render attributes: 'inline' (default) lists them inside the node
   * box under a divider like HedgeDoc (including inherited attributes in
   * italic), 'leaf' draws separate small nodes, 'hidden' omits them.
   */
  attributeDisplay?: AttributeDisplay
  /** @deprecated use attributeDisplay; false maps to 'hidden'. */
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
  /** Show or hide the inferred (derived) relations. */
  setInferredVisible(visible: boolean): void
  /** Toggle containment view (compound nesting along is_a/member_of/instance_of). */
  setContainment(enabled: boolean): void
  /** Current token marking (place id → tokens), or null when the graph has no process. */
  getMarking(): Map<string, number> | null
  /** Fire a transition by node id. Returns false when disabled or not a transition. */
  fireTransition(transitionId: string): boolean
  /** Reset the token marking to its initial state. */
  resetSimulation(): void
  /** Switch a node to one of its morphs (by morph id or morph name) and re-render. */
  setMorph(nodeId: string, morph: string): void
  /** Switch the color theme in place. */
  setTheme(theme: NodeBookTheme): void
  /** Re-run the layout, optionally with a different layout name. */
  relayout(layout?: NodeBookLayout): void
  /** Tear down the Cytoscape instance and release the container. */
  destroy(): void
}

// All layouts run synchronously (animate: false). Animated layouts (cose's
// default) depend on requestAnimationFrame, which hosts throttle or suspend
// for offscreen/virtualized blocks — the animation then never completes and
// nodes stay clustered at their random starting positions with the edges
// buried underneath.
function layoutOptions(name: NodeBookLayout): LayoutOptions {
  switch (name) {
    case 'breadthfirst':
      return { name, directed: true, spacingFactor: 1.2, padding: 24, animate: false } as LayoutOptions
    case 'cose':
      return { name, padding: 24, animate: false, nodeDimensionsIncludeLabels: true } as LayoutOptions
    default:
      return { name, padding: 24, animate: false } as LayoutOptions
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
  let currentLayout: NodeBookLayout = options.layout ?? 'cose'
  const attributeDisplay: AttributeDisplay =
    options.attributeDisplay ?? (options.showAttributes === false ? 'hidden' : 'inline')
  const activeMorphs: Record<string, string> = { ...options.activeMorphs }

  if (container) {
    container.classList.add('nodebook-graph-container')
    container.dataset.nbTheme = theme
    if (container.clientHeight === 0 && !container.style.height) {
      container.style.height = '420px'
    }
    container.style.backgroundColor = backgroundColor(theme)
  }

  const inferenceEnabled = options.inference ?? true
  let inferredEdges: InferredEdge[] = []
  let inferenceToken = 0
  // Two-stage inference, matching the HedgeDoc component: the synchronous
  // transitive-closure engine gives instant results, then the Prolog engine
  // (inverse/symmetric relations and richer rules) replaces them when it
  // resolves. A token discards stale async results after morph switches.
  const computeInference = (): void => {
    if (!inferenceEnabled) return
    const filtered = filterGraphForMorphs(graph, activeMorphs)
    try {
      inferredEdges = new TransitiveClosureEngine().infer(filtered, getMergedSchemas()).inferredEdges
    } catch {
      inferredEdges = []
    }
    const token = ++inferenceToken
    void new PrologInferenceEngine()
      .inferAsync(filtered, getMergedSchemas(), [])
      .then((result) => {
        if (result.errors.length > 0) {
          console.debug('@nodebook/dom: Prolog inference reported errors', result.errors)
        }
        if (token !== inferenceToken || destroyed) return
        inferredEdges = result.inferredEdges
        cy.$('edge[kind = "inferred-relation"]').remove()
        addInferred()
        ui?.refreshToolbar()
        ui?.refreshInspector()
      })
      .catch((error: unknown) => {
        // keep the transitive-closure results
        console.debug('@nodebook/dom: Prolog inference unavailable, using transitive closure', error)
      })
  }
  computeInference()

  let containment = options.containment ?? false

  // Token-game process simulation (prior/post-state arcs on transition-role
  // nodes). Built before the elements: process graphs render in Petri-net
  // convention (bar transitions, flow-directed arcs, layered layout).
  let processModel: ProcessModel | null = null
  let marking = new Map<string, number>()
  const rebuildProcessModel = (): void => {
    processModel = buildProcessModel(filterGraphForMorphs(graph, activeMorphs))
    marking = processModel ? new Map(processModel.initialMarking) : new Map()
  }
  rebuildProcessModel()
  if (!options.layout && processModel) {
    currentLayout = 'process'
  }

  const buildExplicit = () =>
    buildCytoscapeElements(graph, {
      activeMorphs,
      attributeDisplay,
      containment,
      inferredEdges,
      processMode: processModel !== null
    })

  const elements = buildExplicit()
  const cy = cytoscape({
    ...(headless ? { headless: true, styleEnabled: false } : { container: container as HTMLElement }),
    elements,
    ...(headless ? {} : { style: buildStylesheet(theme) }),
    // Layout runs explicitly below so inferred edges can be added after it.
    layout: { name: 'preset' }
  })

  // The 'process' layout is a layered left-to-right preset following token
  // flow (inputs → transition bars → outputs); other names map to Cytoscape
  // built-ins. Falls back to breadthfirst when no process exists.
  const resolveLayout = (): LayoutOptions => {
    if (currentLayout !== 'process') return layoutOptions(currentLayout)
    if (!processModel) return layoutOptions('breadthfirst')
    const conceptIds = cy.$('node[kind = "concept"]').map((n) => n.id())
    const attributeOwners = new Map<string, string>()
    for (const attrNode of cy.$('node[kind = "attribute"]')) {
      const owner = attrNode.connectedEdges().connectedNodes('[kind = "concept"]').first()
      if (owner.nonempty()) attributeOwners.set(attrNode.id(), owner.id())
    }
    const positions = computeProcessPositions(processModel, conceptIds, attributeOwners)
    return {
      name: 'preset',
      // Compound parents derive their bounds from children; positioning one
      // would translate its children after they were placed, so return the
      // parent's current (derived) position as a no-op.
      positions: (node: { id(): string; isParent(): boolean; position(): { x: number; y: number } }) =>
        node.isParent() ? node.position() : (positions.get(node.id()) ?? { x: 0, y: 0 }),
      padding: 24,
      fit: true
    } as unknown as LayoutOptions
  }

  // User-facing show/hide of derived facts (the toolbar "Inferred" toggle).
  let inferredVisible = true

  // Inferred edges are added AFTER the layout finishes: node positions should
  // come from explicit structure only, with derived facts arcing over it.
  const addInferred = (): void => {
    if (!inferredVisible) return
    // In containment view, inferred containment facts are expressed by the
    // nesting itself — only non-containment inferences get arrows.
    const visible = containment ? inferredEdges.filter((e) => !CONTAINMENT_RELATIONS.has(e.name)) : inferredEdges
    if (visible.length > 0 && cy.$('edge[kind = "inferred-relation"]').length === 0) {
      cy.add(buildInferredEdgeElements(visible, graph))
    }
  }

  const setInferredVisible = (visible: boolean): void => {
    if (inferredVisible === visible) return
    inferredVisible = visible
    if (visible) {
      addInferred()
    } else {
      cy.$('edge[kind = "inferred-relation"]').remove()
    }
    ui?.refreshToolbar()
  }

  const layoutThenInferred = (): void => {
    if (headless) {
      addInferred()
      return
    }
    // A detached or zero-sized container (Obsidian hands elements over before
    // attaching them) makes viewport-scaled layouts collapse or throw. Skip —
    // the watchers below run the first real layout once the container is sized.
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
      return
    }
    cy.one('layoutstop', addInferred)
    try {
      cy.layout(resolveLayout()).run()
      initialLayoutDone = true
    } catch (error) {
      console.error('@nodebook/dom: layout failed', error)
      addInferred()
    }
  }
  let initialLayoutDone = headless
  let destroyed = false
  layoutThenInferred()

  // Re-run the layout from scratch: inferred edges come back out so the
  // layout positions nodes on explicit structure only, then re-add.
  const rerunLayout = (): void => {
    cy.$('edge[kind = "inferred-relation"]').remove()
    layoutThenInferred()
  }

  // Hosts like Obsidian hand us a container BEFORE attaching it to the
  // document, so the initial layout can't run (see above) — and fit() would
  // be a no-op on the cached zero size. Recover with both a ResizeObserver
  // (also keeps Cytoscape in sync with later resizes) and a bounded poller,
  // because ResizeObserver delivery depends on render frames, which some
  // embedded webviews suspend while hidden.
  const recoverIfSized = (): void => {
    if (destroyed || !container) return
    if (container.clientWidth === 0 || container.clientHeight === 0) return
    cy.resize()
    if (!initialLayoutDone) {
      rerunLayout()
    }
  }
  let resizeObserver: ResizeObserver | null = null
  if (!headless && container) {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(recoverIfSized)
      resizeObserver.observe(container)
    }
    if (!initialLayoutDone) {
      let attempts = 0
      const poll = (): void => {
        if (destroyed || initialLayoutDone) return
        recoverIfSized()
        if (!initialLayoutDone && ++attempts < 150) {
          setTimeout(poll, 200)
        }
      }
      setTimeout(poll, 50)
    }
  }

  const applySimulationState = (): void => {
    if (!processModel) return
    cy.batch(() => {
      for (const placeId of processModel!.placeIds) {
        const node = cy.getElementById(placeId)
        if (node.empty()) continue
        const base = (node.data('baseLabel') as string | undefined) ?? (node.data('label') as string)
        node.data('baseLabel', base)
        node.data('label', placeLabel(base, marking.get(placeId) ?? 0))
      }
      for (const transitionId of processModel!.transitionIds) {
        const node = cy.getElementById(transitionId)
        if (node.empty()) continue
        node.data('enabledTransition', isTransitionEnabled(processModel!, marking, transitionId) ? 1 : 0)
      }
    })
  }

  const fireTransition = (transitionId: string): boolean => {
    if (!processModel || !processModel.transitionIds.includes(transitionId)) return false
    const next = fireProcessTransition(processModel, marking, transitionId)
    if (!next) return false
    marking = next
    applySimulationState()
    return true
  }

  const resetSimulation = (): void => {
    if (!processModel) return
    marking = new Map(processModel.initialMarking)
    applySimulationState()
  }

  const rebuildElements = (): void => {
    computeInference()
    const next = buildExplicit()
    cy.elements().remove()
    cy.add(next)
    rebuildProcessModel()
    applySimulationState()
    layoutThenInferred()
  }

  applySimulationState()

  // Tapping an enabled transition fires it (the inspector skips these nodes).
  cy.on('tap', 'node[kind = "concept"]', (event) => {
    const id = event.target.id() as string
    if (processModel && processModel.transitionIds.includes(id)) {
      fireTransition(id)
    }
  })

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
      cy.resize()
      rerunLayout()
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
      layouts: processModel ? ['process', ...ALL_LAYOUTS] : ALL_LAYOUTS,
      currentLayout: () => currentLayout,
      graph,
      activeMorphs,
      getInferredEdges: () => inferredEdges,
      hasInferredToggle: () => inferenceEnabled && inferredEdges.length > 0,
      isInferredVisible: () => inferredVisible,
      onToggleInferred: () => setInferredVisible(!inferredVisible),
      hasContainment: graph.edges.some((e) => CONTAINMENT_RELATIONS.has(e.name)),
      isContainmentActive: () => containment,
      onToggleContainment: () => setContainment(!containment),
      hasSimulation: processModel !== null,
      onResetSimulation: resetSimulation,
      suppressInspectorFor: (nodeId) => processModel !== null && processModel.transitionIds.includes(nodeId),
      onMorphSelect: setMorph,
      onFit: () => {
        cy.resize()
        cy.fit(undefined, 24)
      },
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
    setInferredVisible,
    setContainment,
    getMarking: () => (processModel ? new Map(marking) : null),
    fireTransition,
    resetSimulation,
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
      destroyed = true
      resizeObserver?.disconnect()
      resizeObserver = null
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
