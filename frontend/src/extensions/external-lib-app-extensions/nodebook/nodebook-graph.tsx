/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { AsyncLoadingBoundary } from '../../../components/common/async-loading-boundary/async-loading-boundary'
import { ApplicationErrorAlert } from '../../../components/common/application-error-alert/application-error-alert'
import type { CodeProps } from '../../../components/markdown-renderer/replace-components/code-block-component-replacer'
import { cypressId } from '../../../utils/cypress-attribute'
import { Logger } from '../../../utils/logger'
import { getOperationsFromCnl } from './nodebook-parser/cnl-parser'
import { MorphRegistry } from './nodebook-parser/morph-registry'
import { operationsToGraph } from './nodebook-parser/operations-to-graph'
import type { CnlAttribute, CnlEdge, CnlGraphData, CnlNode, CnlParseError } from './nodebook-parser/types'
import { validateOperations } from './nodebook-parser/validate-operations'
import { getMergedSchemas } from './nodebook-parser/schema-store'
import styles from './nodebook-graph.module.scss'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAsync } from 'react-use'

const log = new Logger('NodeBookGraph')

interface InMemoryGraph {
  nodes: CnlNode[]
  edges: CnlEdge[]
  attributes: CnlAttribute[]
}

type GraphMode = 'mindmap' | 'petri-net' | 'concept-map'

/**
 * Renders an interactive nodeBook knowledge graph from CNL code.
 *
 * @param code The CNL code for the knowledge graph.
 */
export const NodeBookGraph: React.FC<CodeProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [inMemoryGraph, setInMemoryGraph] = useState<InMemoryGraph | null>(null)
  const [validationWarnings, setValidationWarnings] = useState<CnlParseError[]>([])
  const [hasValidated, setHasValidated] = useState(false)
  const [marking, setMarking] = useState<Map<string, number>>(new Map())

  // Parse CNL synchronously (pure regex, microsecond-fast)
  const { graphData, operations } = useMemo(() => {
    try {
      const ops = getOperationsFromCnl(code)
      const data = operationsToGraph(ops)
      return { graphData: data, operations: ops }
    } catch (error) {
      log.error('Error parsing CNL', error)
      return {
        graphData: { nodes: [], edges: [], attributes: [], description: null, errors: [{ message: String(error) }] } as CnlGraphData,
        operations: []
      }
    }
  }, [code])

  // Determine graph mode
  const graphMode: GraphMode = useMemo(() => {
    const hasTransitions = graphData.nodes.some((n) => n.role === 'Transition')
    if (hasTransitions) return 'petri-net'
    const isMindmapOnly = operations.length > 0 && operations.every((op) => op.source === 'mindmap')
    if (isMindmapOnly) return 'mindmap'
    return 'concept-map'
  }, [graphData, operations])

  // Compute prior/post state sets for Petri net mode
  const { priorStateNodeIds, postStateNodeIds } = useMemo(() => {
    const prior = new Set<string>()
    const post = new Set<string>()
    if (graphMode === 'petri-net') {
      for (const edge of graphData.edges) {
        if (edge.name === 'has prior_state') prior.add(edge.target_id)
        if (edge.name === 'has post_state') post.add(edge.target_id)
      }
    }
    return { priorStateNodeIds: prior, postStateNodeIds: post }
  }, [graphData, graphMode])

  // Initialize Petri net marking when graph data changes
  useEffect(() => {
    if (graphMode !== 'petri-net') {
      setMarking(new Map())
      return
    }
    const initial = new Map<string, number>()
    for (const nodeId of priorStateNodeIds) initial.set(nodeId, 1)
    for (const nodeId of postStateNodeIds) {
      if (!priorStateNodeIds.has(nodeId)) initial.set(nodeId, 0)
    }
    setMarking(initial)
  }, [graphData, graphMode, priorStateNodeIds, postStateNodeIds])

  // Petri net: check if a transition is enabled
  const isTransitionEnabled = useCallback(
    (transitionId: string, currentMarking: Map<string, number>): boolean => {
      const inputPlaces = graphData.edges
        .filter((e) => e.source_id === transitionId && e.name === 'has prior_state')
        .map((e) => e.target_id)
      return inputPlaces.length > 0 && inputPlaces.every((placeId) => (currentMarking.get(placeId) ?? 0) >= 1)
    },
    [graphData]
  )

  // Petri net: fire a transition
  const fireTransition = useCallback(
    (transitionId: string) => {
      setMarking((prev) => {
        if (!isTransitionEnabled(transitionId, prev)) return prev
        const next = new Map(prev)
        const inputs = graphData.edges
          .filter((e) => e.source_id === transitionId && e.name === 'has prior_state')
          .map((e) => e.target_id)
        for (const placeId of inputs) {
          next.set(placeId, (next.get(placeId) ?? 0) - 1)
        }
        const outputs = graphData.edges
          .filter((e) => e.source_id === transitionId && e.name === 'has post_state')
          .map((e) => e.target_id)
        for (const placeId of outputs) {
          next.set(placeId, (next.get(placeId) ?? 0) + 1)
        }
        return next
      })
    },
    [graphData, isTransitionEnabled]
  )

  // Petri net: reset marking to initial state
  const resetMarking = useCallback(() => {
    const initial = new Map<string, number>()
    for (const nodeId of priorStateNodeIds) initial.set(nodeId, 1)
    for (const nodeId of postStateNodeIds) {
      if (!priorStateNodeIds.has(nodeId)) initial.set(nodeId, 0)
    }
    setMarking(initial)
  }, [priorStateNodeIds, postStateNodeIds])

  // Check if any transition is enabled (for deadlock detection)
  const hasEnabledTransition = useMemo(() => {
    if (graphMode !== 'petri-net') return true
    return graphData.nodes.some((n) => n.role === 'Transition' && isTransitionEnabled(n.id, marking))
  }, [graphData, graphMode, marking, isTransitionEnabled])

  // Reset validation state when code changes
  useEffect(() => {
    setValidationWarnings([])
    setHasValidated(false)
  }, [code])

  const handleValidate = useCallback(() => {
    const merged = getMergedSchemas()
    const warns = validateOperations(operations, merged)
    setValidationWarnings(warns)
    setHasValidated(true)
  }, [operations])

  // Build morph registry from parsed graph
  const morphRegistry = useMemo(() => {
    const registry = new MorphRegistry()
    for (const node of graphData.nodes) {
      for (const morph of node.morphs) {
        registry.addMorph(morph.morph_id, node.id, morph.name, morph.relationNode_ids, morph.attributeNode_ids)
      }
    }
    return registry
  }, [graphData])

  // Initialize in-memory graph with morph-filtered data
  useEffect(() => {
    const filteredEdges: CnlEdge[] = []
    const filteredAttributes: CnlAttribute[] = []

    for (const node of graphData.nodes) {
      const activeMorph = node.morphs.find((m) => m.morph_id === node.nbh)
      if (activeMorph) {
        for (const relId of activeMorph.relationNode_ids) {
          const edge = graphData.edges.find((e) => e.id === relId)
          if (edge) filteredEdges.push(edge)
        }
        for (const attrId of activeMorph.attributeNode_ids) {
          const attr = graphData.attributes.find((a) => a.id === attrId)
          if (attr) filteredAttributes.push(attr)
        }
      }
    }

    setInMemoryGraph({
      nodes: graphData.nodes.map((n) => ({ ...n })),
      edges: filteredEdges,
      attributes: filteredAttributes
    })
  }, [graphData])

  // Dynamic library loading — ELK replaces dagre
  const {
    value: cytoscapeModules,
    error: libLoadingError,
    loading: isLibLoading
  } = useAsync(async () => {
    const [cyModule, elkModule, svgModule] = await Promise.all([
      import(/* webpackChunkName: "cytoscape" */ 'cytoscape'),
      import(/* webpackChunkName: "cytoscape-elk" */ 'cytoscape-elk'),
      import(/* webpackChunkName: "cytoscape-svg" */ 'cytoscape-svg')
    ])
    const cy = cyModule.default
    const elk = elkModule.default
    cy.use(elk)
    try {
      const svg = svgModule.default
      if (typeof svg === 'function') {
        cy.use(svg)
      }
    } catch {
      // cytoscape-svg may not have a default export in all builds
    }
    return cy
  }, [])

  // Build ELK layout config based on graph mode
  const layoutConfig = useMemo(() => {
    if (graphMode === 'mindmap') {
      return {
        name: 'elk',
        elk: {
          algorithm: 'mrtree',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': '30'
        }
      }
    }

    const hasTransitions = graphMode === 'petri-net'
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      elk: {
        algorithm: 'layered',
        'elk.direction': 'RIGHT',
        'elk.layered.spacing.nodeNodeBetweenLayers': hasTransitions ? '120' : '80',
        'elk.spacing.nodeNode': '40',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.hierarchyHandling': hasTransitions ? 'INCLUDE_CHILDREN' : 'SEPARATE_CHILDREN',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        ...(hasTransitions && { 'elk.partitioning.activate': 'true' })
      }
    }
  }, [graphMode])

  // Render Cytoscape graph
  useEffect(() => {
    if (!containerRef.current || !cytoscapeModules || !inMemoryGraph) return

    const cytoscape = cytoscapeModules
    const isPetriNet = graphMode === 'petri-net'

    // Build node elements
    const cyNodes: cytoscape.ElementDefinition[] = []

    // In Petri net mode, create compound parent nodes for each transition's groups
    const transitionGroups = new Map<string, { priorGroupId: string; postGroupId: string }>()
    if (isPetriNet) {
      for (const node of inMemoryGraph.nodes) {
        if (node.role === 'Transition') {
          const priorGroupId = `prior-group-${node.id}`
          const postGroupId = `post-group-${node.id}`
          transitionGroups.set(node.id, { priorGroupId, postGroupId })

          cyNodes.push({
            data: {
              id: priorGroupId,
              label: 'Prior States',
              groupType: 'prior'
            }
          })
          cyNodes.push({
            data: {
              id: postGroupId,
              label: 'Post States',
              groupType: 'post'
            }
          })
        }
      }
    }

    // Find which transition each prior/post node belongs to
    const nodeToTransition = new Map<string, string>()
    if (isPetriNet) {
      for (const edge of graphData.edges) {
        if (edge.name === 'has prior_state' || edge.name === 'has post_state') {
          if (!nodeToTransition.has(edge.target_id)) {
            nodeToTransition.set(edge.target_id, edge.source_id)
          }
        }
      }
    }

    for (const node of inMemoryGraph.nodes) {
      if (isPetriNet) {
        if (node.role === 'Transition') {
          // Transition bar
          cyNodes.push({
            data: {
              id: node.id,
              label: node.name,
              type: 'pn-transition',
              partition: 1,
              enabled: isTransitionEnabled(node.id, marking)
            }
          })
        } else if (priorStateNodeIds.has(node.id)) {
          const transId = nodeToTransition.get(node.id)
          const group = transId ? transitionGroups.get(transId) : undefined
          cyNodes.push({
            data: {
              id: node.id,
              label: node.name,
              type: 'pn-place',
              tokenCount: marking.get(node.id) ?? 1,
              partition: 0,
              ...(group && { parent: group.priorGroupId })
            }
          })
        } else if (postStateNodeIds.has(node.id)) {
          const transId = nodeToTransition.get(node.id)
          const group = transId ? transitionGroups.get(transId) : undefined
          cyNodes.push({
            data: {
              id: node.id,
              label: node.name,
              type: 'pn-place',
              tokenCount: marking.get(node.id) ?? 0,
              partition: 2,
              ...(group && { parent: group.postGroupId })
            }
          })
        } else {
          // Regular node in a graph that also has transitions
          cyNodes.push({
            data: {
              id: node.id,
              label: node.name,
              type: 'polynode',
              hasMorphs: node.morphs.length > 1
            }
          })
        }
      } else {
        // Concept map / mindmap mode — original behavior
        let displayName = node.name
        if (node.morphs && node.nbh) {
          const activeMorph = node.morphs.find((m) => m.morph_id === node.nbh)
          if (activeMorph && activeMorph.name !== 'basic') {
            displayName = `${node.name} (${activeMorph.name})`
          }
        }
        cyNodes.push({
          data: {
            id: node.id,
            label: displayName,
            type: 'polynode',
            hasMorphs: node.morphs.length > 1
          }
        })
      }
    }

    // Build edge elements
    const nodeIds = new Set(inMemoryGraph.nodes.map((n) => n.id))
    const cyEdges: cytoscape.ElementDefinition[] = []

    for (const edge of inMemoryGraph.edges) {
      if (!nodeIds.has(edge.source_id) || !nodeIds.has(edge.target_id)) continue

      if (isPetriNet && edge.name === 'has prior_state') {
        // Reverse direction: place → transition (for correct LR flow)
        cyEdges.push({
          data: {
            id: edge.id,
            source: edge.target_id,
            target: edge.source_id,
            label: '',
            edgeType: 'prior_state'
          }
        })
      } else if (isPetriNet && edge.name === 'has post_state') {
        // Direction already correct: transition → place
        cyEdges.push({
          data: {
            id: edge.id,
            source: edge.source_id,
            target: edge.target_id,
            label: '',
            edgeType: 'post_state'
          }
        })
      } else {
        cyEdges.push({
          data: {
            id: edge.id,
            source: edge.source_id,
            target: edge.target_id,
            label: edge.name
          }
        })
      }
    }

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy()
    }

    // Build style array
    const graphStyles: Array<cytoscape.StylesheetStyle | cytoscape.StylesheetCSS> = [
      // Standard concept map / mindmap node style
      {
        selector: 'node[type="polynode"]',
        style: {
          'background-color': '#4a90d9',
          label: 'data(label)',
          color: '#fff',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '11px',
          'text-wrap': 'wrap',
          'text-max-width': '120px',
          shape: 'round-rectangle',
          width: 'label',
          height: 'label',
          padding: '10px',
          'border-width': 2,
          'border-color': '#2c5aa0'
        }
      },
      {
        selector: 'node[?hasMorphs]',
        style: {
          'border-width': 3,
          'border-style': 'double'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-color': '#f97316',
          'border-width': 3
        }
      },
      // Default edge style
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#94a3b8',
          'target-arrow-color': '#64748b',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(label)',
          'font-size': '9px',
          color: '#475569',
          'text-rotation': 'autorotate',
          'text-margin-y': -8
        }
      }
    ]

    if (isPetriNet) {
      graphStyles.push(
        // Place nodes (circles)
        {
          selector: 'node[type="pn-place"]',
          style: {
            shape: 'ellipse',
            width: 60,
            height: 60,
            'background-color': '#ffffff',
            'border-width': 3,
            'border-color': '#334155',
            label: 'data(label)',
            color: '#334155',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'font-size': '10px',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            content: 'data(tokenCount)',
            'text-halign': 'center'
          }
        },
        // Place with tokens
        {
          selector: 'node[type="pn-place"][tokenCount > 0]',
          style: {
            content: 'data(tokenCount)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '18px',
            'font-weight': 'bold',
            color: '#1e293b'
          }
        },
        // Empty place
        {
          selector: 'node[type="pn-place"][tokenCount = 0]',
          style: {
            'background-color': '#f1f5f9',
            'border-style': 'dashed',
            content: '',
            color: '#94a3b8'
          }
        },
        // Transition bar
        {
          selector: 'node[type="pn-transition"]',
          style: {
            shape: 'rectangle',
            width: 15,
            height: 60,
            'background-color': '#1e293b',
            'border-width': 0,
            label: 'data(label)',
            color: '#334155',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'font-size': '10px',
            'text-wrap': 'wrap',
            'text-max-width': '100px'
          }
        },
        // Enabled transition (green)
        {
          selector: 'node[type="pn-transition"][?enabled]',
          style: {
            'background-color': '#16a34a',
            'border-width': 2,
            'border-color': '#15803d'
          }
        },
        // Disabled transition
        {
          selector: 'node[type="pn-transition"][!enabled]',
          style: {
            'background-color': '#94a3b8'
          }
        },
        // Compound group: prior states
        {
          selector: ':parent[groupType="prior"]',
          style: {
            'background-color': '#dbeafe',
            'background-opacity': 0.4,
            'border-width': 2,
            'border-color': '#93c5fd',
            'border-style': 'dashed',
            padding: '20px',
            shape: 'round-rectangle',
            'text-valign': 'top',
            'text-halign': 'center',
            'font-size': '10px',
            color: '#1e40af',
            label: 'data(label)'
          }
        },
        // Compound group: post states
        {
          selector: ':parent[groupType="post"]',
          style: {
            'background-color': '#dcfce7',
            'background-opacity': 0.4,
            'border-width': 2,
            'border-color': '#86efac',
            'border-style': 'dashed',
            padding: '20px',
            shape: 'round-rectangle',
            'text-valign': 'top',
            'text-halign': 'center',
            'font-size': '10px',
            color: '#166534',
            label: 'data(label)'
          }
        },
        // Input arcs (place → transition) — blue
        {
          selector: 'edge[edgeType="prior_state"]',
          style: {
            'line-color': '#3b82f6',
            'target-arrow-color': '#2563eb',
            'target-arrow-shape': 'triangle',
            width: 3,
            'curve-style': 'bezier',
            label: ''
          }
        },
        // Output arcs (transition → place) — green
        {
          selector: 'edge[edgeType="post_state"]',
          style: {
            'line-color': '#22c55e',
            'target-arrow-color': '#16a34a',
            'target-arrow-shape': 'triangle',
            width: 3,
            'curve-style': 'bezier',
            label: ''
          }
        }
      )
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: graphStyles,
      layout: layoutConfig as cytoscape.LayoutOptions,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false
    })

    // Tap handlers
    if (isPetriNet) {
      // Click enabled transition to fire it
      cy.on('tap', 'node[type="pn-transition"]', (evt) => {
        const nodeId = evt.target.id()
        if (evt.target.data('enabled')) {
          fireTransition(nodeId)
        }
        setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
      })
      // Click place to select it
      cy.on('tap', 'node[type="pn-place"]', (evt) => {
        const nodeId = evt.target.id()
        setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
      })
    } else {
      cy.on('tap', 'node', (evt) => {
        const nodeId = evt.target.id()
        setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
      })
    }

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNodeId(null)
      }
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [cytoscapeModules, inMemoryGraph, graphMode, layoutConfig, marking, priorStateNodeIds, postStateNodeIds, isTransitionEnabled, fireTransition, graphData])

  // Update Cytoscape node data when marking changes (without full re-render)
  useEffect(() => {
    if (!cyRef.current || graphMode !== 'petri-net') return
    for (const [placeId, count] of marking) {
      const node = cyRef.current.$id(placeId)
      if (node.length) {
        node.data('tokenCount', count)
      }
    }
    for (const node of graphData.nodes) {
      if (node.role === 'Transition') {
        const enabled = isTransitionEnabled(node.id, marking)
        const cyNode = cyRef.current.$id(node.id)
        if (cyNode.length) {
          cyNode.data('enabled', enabled)
        }
      }
    }
  }, [marking, graphMode, graphData, isTransitionEnabled])

  // Handle morph change (concept map mode)
  const handleMorphChange = useCallback(
    (nodeId: string, morphId: string) => {
      if (!inMemoryGraph) return

      const updatedNodes = inMemoryGraph.nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, nbh: morphId }
        }
        return node
      })

      const filteredEdges: CnlEdge[] = []
      const filteredAttributes: CnlAttribute[] = []

      for (const node of updatedNodes) {
        const activeMorph = node.morphs.find((m) => m.morph_id === node.nbh)
        if (activeMorph) {
          for (const relId of activeMorph.relationNode_ids) {
            const edge = graphData.edges.find((e) => e.id === relId)
            if (edge) filteredEdges.push(edge)
          }
          for (const attrId of activeMorph.attributeNode_ids) {
            const attr = graphData.attributes.find((a) => a.id === attrId)
            if (attr) filteredAttributes.push(attr)
          }
        }
      }

      setInMemoryGraph({
        nodes: updatedNodes,
        edges: filteredEdges,
        attributes: filteredAttributes
      })
    },
    [inMemoryGraph, graphData]
  )

  // Export handlers
  const handleExportPng = useCallback(() => {
    if (!cyRef.current) return
    const pngData = cyRef.current.png({ full: true, scale: 2, bg: '#ffffff' })
    const link = document.createElement('a')
    link.href = pngData
    link.download = 'nodebook-graph.png'
    link.click()
  }, [])

  const handleExportSvg = useCallback(() => {
    if (!cyRef.current) return
    try {
      const svgContent = (cyRef.current as unknown as { svg: (opts: Record<string, unknown>) => string }).svg({ full: true, scale: 1, bg: '#ffffff' })
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'nodebook-graph.svg'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      log.error('SVG export not available')
    }
  }, [])

  // Get selected node data
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !inMemoryGraph) return null
    return inMemoryGraph.nodes.find((n) => n.id === selectedNodeId) ?? null
  }, [selectedNodeId, inMemoryGraph])

  // Get selected node's attributes and relations
  const selectedNodeData = useMemo(() => {
    if (!selectedNode || !inMemoryGraph) return null

    const nodeAttributes = inMemoryGraph.attributes.filter((a) => a.source_id === selectedNode.id)
    const nodeRelations = inMemoryGraph.edges.filter((e) => e.source_id === selectedNode.id)

    // Group by morph
    const morphSections = selectedNode.morphs.map((morph) => {
      const morphAttrs = graphData.attributes.filter(
        (a) => a.source_id === selectedNode.id && a.morph_ids.includes(morph.morph_id)
      )
      const morphRels = graphData.edges.filter(
        (e) => e.source_id === selectedNode.id && e.morph_ids.includes(morph.morph_id)
      )
      return { morph, attributes: morphAttrs, relations: morphRels }
    })

    // Transition data (Petri net)
    let transitionData: { priorStates: { id: string; name: string }[]; postStates: { id: string; name: string }[] } | null = null
    if (selectedNode.role === 'Transition') {
      const priorStates = graphData.edges
        .filter((e) => e.source_id === selectedNode.id && e.name === 'has prior_state')
        .map((e) => {
          const node = inMemoryGraph.nodes.find((n) => n.id === e.target_id)
          return { id: e.target_id, name: node?.name ?? e.target_id }
        })
      const postStates = graphData.edges
        .filter((e) => e.source_id === selectedNode.id && e.name === 'has post_state')
        .map((e) => {
          const node = inMemoryGraph.nodes.find((n) => n.id === e.target_id)
          return { id: e.target_id, name: node?.name ?? e.target_id }
        })
      transitionData = { priorStates, postStates }
    }

    return { attributes: nodeAttributes, relations: nodeRelations, morphSections, transitionData }
  }, [selectedNode, inMemoryGraph, graphData])

  if (graphData.errors.length > 0 && graphData.nodes.length === 0) {
    return <ApplicationErrorAlert>{graphData.errors.map((e) => e.message).join('; ')}</ApplicationErrorAlert>
  }

  const isPetriNet = graphMode === 'petri-net'

  return (
    <AsyncLoadingBoundary loading={isLibLoading || !cytoscapeModules} componentName={'nodeBook'} error={libLoadingError}>
      <div className={styles['nodebook-container']} {...cypressId('nodebook-frame')}>
        {hasValidated && validationWarnings.length === 0 && (
          <div className={styles['validation-pass-banner']}>Validation passed - no schema warnings</div>
        )}
        {hasValidated && validationWarnings.length > 0 && (
          <div className={styles['warning-banner']}>
            <details>
              <summary>{validationWarnings.length} schema warning(s)</summary>
              <ul>
                {validationWarnings.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {isPetriNet && !hasEnabledTransition && marking.size > 0 && (
          <div className={styles['deadlock-banner']}>Deadlock: no transition can fire</div>
        )}

        <div className={styles['export-buttons']}>
          {isPetriNet && (
            <button onClick={resetMarking} title='Reset token marking to initial state'>
              Reset
            </button>
          )}
          <button onClick={handleValidate} title='Validate against schemas'>
            Validate
          </button>
          <button onClick={handleExportPng} title='Export as PNG'>
            PNG
          </button>
          <button onClick={handleExportSvg} title='Export as SVG'>
            SVG
          </button>
        </div>

        <div ref={containerRef} className={styles['graph-canvas']} />

        {selectedNode && selectedNodeData && (
          <div className={styles['node-detail-panel']}>
            <h4>
              {selectedNode.name}
              <span className={styles['node-type-badge']}>
                {isPetriNet && selectedNode.role === 'Transition' ? 'Transition' : selectedNode.role}
              </span>
              <button className={styles['close-button']} onClick={() => setSelectedNodeId(null)}>
                &times;
              </button>
            </h4>

            {selectedNode.description && <div className={styles['node-description']}>{selectedNode.description}</div>}

            {/* Petri net transition detail */}
            {isPetriNet && selectedNodeData.transitionData && (
              <div className={styles['transition-panel']}>
                <div className={styles['transition-label']}>Petri Net Transition</div>
                <div className={styles['transition-flow']}>
                  <div className={styles['transition-flow-group']}>
                    <span className={styles['transition-flow-heading']}>Prior States</span>
                    {selectedNodeData.transitionData.priorStates.map((s) => (
                      <span key={s.id} className={styles['transition-flow-item']}>
                        {s.name} ({marking.get(s.id) ?? 0})
                      </span>
                    ))}
                  </div>
                  <span className={styles['transition-flow-arrow']}>&rarr;</span>
                  <div className={styles['transition-flow-center']}>{selectedNode.name}</div>
                  <span className={styles['transition-flow-arrow']}>&rarr;</span>
                  <div className={styles['transition-flow-group']}>
                    <span className={styles['transition-flow-heading']}>Post States</span>
                    {selectedNodeData.transitionData.postStates.map((s) => (
                      <span key={s.id} className={styles['transition-flow-item']}>
                        {s.name} ({marking.get(s.id) ?? 0})
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles['transition-buttons']}>
                  <button
                    className={styles['simulate-button']}
                    onClick={() => fireTransition(selectedNode.id)}
                    disabled={!isTransitionEnabled(selectedNode.id, marking)}
                  >
                    Fire Transition
                  </button>
                  <button className={styles['reset-button']} onClick={resetMarking}>
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Petri net place detail */}
            {isPetriNet && (priorStateNodeIds.has(selectedNode.id) || postStateNodeIds.has(selectedNode.id)) && (
              <div className={styles['place-panel']}>
                <div className={styles['place-info']}>
                  <span>Tokens: <strong>{marking.get(selectedNode.id) ?? 0}</strong></span>
                  <span>Role: {priorStateNodeIds.has(selectedNode.id) ? 'Prior State (Input)' : 'Post State (Output)'}</span>
                </div>
              </div>
            )}

            {/* Morph selector (concept map mode only) */}
            {!isPetriNet && selectedNode.morphs.length > 1 && (
              <div className={styles['morph-selector']}>
                <div className={styles['morph-selector-label']}>Current State:</div>
                <div className={styles['morph-radio-group']}>
                  {selectedNode.morphs.map((morph) => (
                    <label key={morph.morph_id} className={styles['morph-radio-option']}>
                      <input
                        type='radio'
                        name={`morph-${selectedNode.id}`}
                        value={morph.morph_id}
                        checked={(selectedNode.nbh || selectedNode.morphs[0]?.morph_id) === morph.morph_id}
                        onChange={() => handleMorphChange(selectedNode.id, morph.morph_id)}
                      />
                      <span className={styles['morph-radio-label']}>{morph.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Morph sections */}
            {selectedNodeData.morphSections.map(
              (section) =>
                (section.attributes.length > 0 || section.relations.length > 0) && (
                  <div key={section.morph.morph_id} className={styles['morph-section']}>
                    <h5>{section.morph.name}</h5>
                    {section.attributes.length > 0 && (
                      <ul>
                        {section.attributes.map((attr) => (
                          <li key={attr.id}>
                            <strong>{attr.name}:</strong> {attr.value}
                            {attr.unit ? ` ${attr.unit}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.relations.length > 0 && (
                      <ul>
                        {section.relations.map((rel) => (
                          <li key={rel.id}>
                            <strong>{rel.name}</strong> &rarr; {rel.target_id}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
            )}
          </div>
        )}
      </div>
    </AsyncLoadingBoundary>
  )
}
