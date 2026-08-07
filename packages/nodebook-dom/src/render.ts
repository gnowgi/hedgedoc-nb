/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  getOperationsFromCnl,
  operationsToGraph,
  validateOperations
} from '@nodebook/core'
import type { CnlGraphData, CnlOperation, CnlParseError } from '@nodebook/core'
import cytoscape from 'cytoscape'
import type { Core, LayoutOptions } from 'cytoscape'
import { buildCytoscapeElements } from './elements'
import { backgroundColor, buildStylesheet } from './styles'
import type { NodeBookTheme } from './styles'

export type NodeBookLayout = 'breadthfirst' | 'cose' | 'grid' | 'circle' | 'concentric'

export interface RenderNodeBookOptions {
  /** Color theme. Default 'light'. */
  theme?: NodeBookTheme
  /** Cytoscape layout name. Default 'breadthfirst'. */
  layout?: NodeBookLayout
  /** Render attributes as leaf nodes. Default true. */
  showAttributes?: boolean
  /** Initial active morph per node id (node id → morph id). */
  activeMorphs?: Record<string, string>
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

  const elements = buildCytoscapeElements(graph, { activeMorphs, showAttributes })
  const cy = cytoscape({
    ...(headless ? { headless: true, styleEnabled: false } : { container: container as HTMLElement }),
    elements,
    ...(headless ? {} : { style: buildStylesheet(theme) }),
    layout: headless ? { name: 'null' } : layoutOptions(currentLayout),
    wheelSensitivity: 0.2
  })

  const rebuildElements = (): void => {
    const next = buildCytoscapeElements(graph, { activeMorphs, showAttributes })
    cy.elements().remove()
    cy.add(next)
    if (!headless) {
      cy.layout(layoutOptions(currentLayout)).run()
    }
  }

  return {
    cy,
    graph,
    operations,
    errors,
    warnings,
    setMorph(nodeId: string, morph: string): void {
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
    },
    setTheme(next: NodeBookTheme): void {
      theme = next
      if (!headless) {
        cy.style(buildStylesheet(theme))
      }
      if (container) {
        container.style.backgroundColor = backgroundColor(theme)
      }
    },
    relayout(layout?: NodeBookLayout): void {
      if (layout) {
        currentLayout = layout
      }
      if (!headless) {
        cy.layout(layoutOptions(currentLayout)).run()
      }
    },
    destroy(): void {
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
