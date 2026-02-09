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

  // Dynamic library loading (following Mermaid/Graphviz pattern)
  const {
    value: cytoscapeModules,
    error: libLoadingError,
    loading: isLibLoading
  } = useAsync(async () => {
    const [cyModule, dagreModule, svgModule] = await Promise.all([
      import(/* webpackChunkName: "cytoscape" */ 'cytoscape'),
      import(/* webpackChunkName: "cytoscape-dagre" */ 'cytoscape-dagre'),
      import(/* webpackChunkName: "cytoscape-svg" */ 'cytoscape-svg')
    ])
    const cy = cyModule.default
    const dagre = dagreModule.default
    cy.use(dagre)
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

  // Render Cytoscape graph
  useEffect(() => {
    if (!containerRef.current || !cytoscapeModules || !inMemoryGraph) return

    const cytoscape = cytoscapeModules

    // Build node elements
    const cyNodes: cytoscape.ElementDefinition[] = inMemoryGraph.nodes.map((node) => {
      let displayName = node.name
      if (node.role !== 'Transition' && node.morphs && node.nbh) {
        const activeMorph = node.morphs.find((m) => m.morph_id === node.nbh)
        if (activeMorph && activeMorph.name !== 'basic') {
          displayName = `${node.name} (${activeMorph.name})`
        }
      }

      let nodeType: 'transition' | 'polynode' = 'polynode'
      if (node.role === 'Transition') nodeType = 'transition'

      return {
        data: {
          id: node.id,
          label: displayName,
          type: nodeType,
          hasMorphs: node.morphs.length > 1
        }
      }
    })

    // Build edge elements
    const nodeIds = new Set(inMemoryGraph.nodes.map((n) => n.id))
    const cyEdges: cytoscape.ElementDefinition[] = inMemoryGraph.edges
      .filter((edge) => nodeIds.has(edge.source_id) && nodeIds.has(edge.target_id))
      .map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source_id,
          target: edge.target_id,
          label: edge.name
        }
      }))

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy()
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
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
          selector: 'node[type="transition"]',
          style: {
            'background-color': '#8b5cf6',
            label: 'data(label)',
            color: '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            shape: 'diamond',
            width: 'label',
            height: 'label',
            padding: '14px',
            'border-width': 2,
            'border-color': '#6d28d9'
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
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 50,
        rankSep: 80,
        padding: 20
      } as cytoscape.LayoutOptions,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false
    })

    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id()
      setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
    })

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
  }, [cytoscapeModules, inMemoryGraph])

  // Handle morph change
  const handleMorphChange = useCallback(
    (nodeId: string, morphId: string) => {
      if (!inMemoryGraph) return

      const updatedNodes = inMemoryGraph.nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, nbh: morphId }
        }
        return node
      })

      // Re-filter edges and attributes based on new morph states
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

  // Handle transition simulation
  const handleTransitionSimulate = useCallback(
    (transitionNodeId: string) => {
      if (!inMemoryGraph) return

      const transitionNode = inMemoryGraph.nodes.find((n) => n.id === transitionNodeId)
      if (!transitionNode || transitionNode.role !== 'Transition') return

      // Find prior_state and post_state edges
      const priorStateEdges = graphData.edges.filter(
        (e) => e.source_id === transitionNodeId && e.name === 'has prior_state'
      )
      const postStateEdges = graphData.edges.filter(
        (e) => e.source_id === transitionNodeId && e.name === 'has post_state'
      )

      if (priorStateEdges.length === 0 || postStateEdges.length === 0) return

      // Switch morphs on prior_state nodes to their next non-basic morph
      const updatedNodes = inMemoryGraph.nodes.map((node) => {
        const isPriorState = priorStateEdges.some((e) => e.target_id === node.id)
        if (isPriorState && node.morphs.length > 1) {
          const currentMorphIdx = node.morphs.findIndex((m) => m.morph_id === node.nbh)
          const nextIdx = (currentMorphIdx + 1) % node.morphs.length
          return { ...node, nbh: node.morphs[nextIdx].morph_id }
        }
        return node
      })

      // Re-filter based on new morph states
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

    // Transition data
    let transitionData: { priorStates: string[]; postStates: string[] } | null = null
    if (selectedNode.role === 'Transition') {
      const priorStates = graphData.edges
        .filter((e) => e.source_id === selectedNode.id && e.name === 'has prior_state')
        .map((e) => e.target_id)
      const postStates = graphData.edges
        .filter((e) => e.source_id === selectedNode.id && e.name === 'has post_state')
        .map((e) => e.target_id)
      transitionData = { priorStates, postStates }
    }

    return { attributes: nodeAttributes, relations: nodeRelations, morphSections, transitionData }
  }, [selectedNode, inMemoryGraph, graphData])

  if (graphData.errors.length > 0 && graphData.nodes.length === 0) {
    return <ApplicationErrorAlert>{graphData.errors.map((e) => e.message).join('; ')}</ApplicationErrorAlert>
  }

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

        <div className={styles['export-buttons']}>
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
              <span className={styles['node-type-badge']}>{selectedNode.role}</span>
              <button className={styles['close-button']} onClick={() => setSelectedNodeId(null)}>
                &times;
              </button>
            </h4>

            {selectedNode.description && <div className={styles['node-description']}>{selectedNode.description}</div>}

            {/* Morph selector */}
            {selectedNode.morphs.length > 1 && (
              <div className={styles['morph-selector']}>
                <div className={styles['morph-selector-label']}>
                  Current State:
                  {selectedNode.nbh &&
                    selectedNode.morphs.find((m) => m.morph_id === selectedNode.nbh)?.name !== 'basic' && (
                      <span className={styles['transition-indicator']} title='Morph changed by transition simulation'>
                        &#9889;
                      </span>
                    )}
                </div>
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

            {/* Transition simulation */}
            {selectedNodeData.transitionData && (
              <div className={styles['transition-panel']}>
                <div className={styles['transition-label']}>Transition</div>
                <div className={styles['transition-states']}>
                  <span>Prior states: {selectedNodeData.transitionData.priorStates.join(', ')}</span>
                  <span>Post states: {selectedNodeData.transitionData.postStates.join(', ')}</span>
                </div>
                <button className={styles['simulate-button']} onClick={() => handleTransitionSimulate(selectedNode.id)}>
                  Simulate Transition
                </button>
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
