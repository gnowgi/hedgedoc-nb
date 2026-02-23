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
import { expressionToPetriNetOps } from './nodebook-parser/equation-to-pn'
import { MorphRegistry } from './nodebook-parser/morph-registry'
import { evaluateExpression } from './nodebook-parser/nodebook-evaluator'
import { operationsToGraph } from './nodebook-parser/operations-to-graph'
import type { CnlAttribute, CnlEdge, CnlGraphData, CnlNode, CnlParseError } from './nodebook-parser/types'
import { validateOperations } from './nodebook-parser/validate-operations'
import { getMergedSchemas } from './nodebook-parser/schema-store'
import styles from './nodebook-graph.module.scss'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAsync } from 'react-use'
import {
  ZoomIn as IconZoomIn,
  ZoomOut as IconZoomOut,
  Fullscreen as IconFit,
  Mouse as IconMouse,
  ArrowCounterclockwise as IconReset,
  PlayFill as IconPlay,
  ShieldCheck as IconValidate,
  Image as IconPng,
  FileEarmarkCode as IconSvg,
  Calculator as IconEvalAll
} from 'react-bootstrap-icons'

const log = new Logger('NodeBookGraph')

/** Detect Bootstrap dark mode from the body element. */
function isDarkMode(): boolean {
  return typeof document !== 'undefined' && document.body.getAttribute('data-bs-theme') === 'dark'
}

/** Map currency codes to their symbols. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CNY: '¥',
  PHP: '₱', KRW: '₩', THB: '฿', BRL: 'R$', ZAR: 'R',
  MXN: '$', CAD: 'C$', AUD: 'A$', CHF: 'CHF', SEK: 'kr',
  RUB: '₽', TRY: '₺', SAR: '﷼', AED: 'د.إ', NGN: '₦'
}

/** Resolve a currency code/symbol to its display symbol. */
function resolveCurrencySymbol(currency: string | null): string {
  if (!currency) return '$'
  const upper = currency.toUpperCase()
  if (CURRENCY_SYMBOLS[upper]) return CURRENCY_SYMBOLS[upper]
  // If the user typed a symbol directly (e.g., "€"), use it as-is
  return currency
}

/** Build a display label for a Petri-net place: name + token indicator + optional computed value. */
function placeDisplayLabel(name: string, tokenCount: number, isAccounting: boolean, currencySymbol: string, computedValue?: number | null): string {
  if (isAccounting) {
    return `${name}\n${currencySymbol}${tokenCount.toFixed(2)}`
  }
  if (computedValue !== undefined && computedValue !== null) {
    return `${name}\n= ${Number.isInteger(computedValue) ? computedValue : computedValue.toFixed(4)}`
  }
  if (tokenCount <= 0) return name
  if (tokenCount <= 3) return `${name}\n${'●'.repeat(tokenCount)}`
  return `${name}\n${tokenCount}`
}

/** Account types recognized for the accounting equation. */
const ACCOUNT_TYPES = new Set(['Account', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'])

/** Check if a node role is a transition-like role (Transition or Transaction). */
function isTransitionRole(role: string): boolean {
  return role === 'Transition' || role === 'Transaction' || role === 'Function'
}

/** Convert a number to a circled Unicode digit (①-⑳), falling back to parenthesized form. */
function circledNumber(n: number): string {
  if (n >= 1 && n <= 20) return String.fromCodePoint(0x245f + n)
  return `(${n})`
}

/** Map a quantifier string to a display symbol prefix. */
function quantifierSymbol(quantifier: string): string {
  const lower = quantifier.toLowerCase()
  if (lower === 'all' || lower === 'every') return '∀ '
  if (lower === 'some' || lower === 'exists') return '∃ '
  return `[${quantifier}] `
}

/** DFS-based cycle detection on directed edges. */
function graphHasCycle(edges: CnlEdge[]): boolean {
  const adj = new Map<string, string[]>()
  for (const edge of edges) {
    if (!adj.has(edge.source_id)) adj.set(edge.source_id, [])
    adj.get(edge.source_id)!.push(edge.target_id)
  }
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  for (const [node, neighbors] of adj) {
    color.set(node, WHITE)
    for (const n of neighbors) if (!color.has(n)) color.set(n, WHITE)
  }
  function dfs(node: string): boolean {
    color.set(node, GRAY)
    for (const neighbor of adj.get(node) ?? []) {
      const c = color.get(neighbor) ?? WHITE
      if (c === GRAY) return true
      if (c === WHITE && dfs(neighbor)) return true
    }
    color.set(node, BLACK)
    return false
  }
  for (const [node, c] of color) {
    if (c === WHITE && dfs(node)) return true
  }
  return false
}

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
  const [placeValues, setPlaceValues] = useState<Map<string, number>>(new Map())
  const [tokenMultiplier, setTokenMultiplier] = useState<number>(1)
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false)

  // Parse CNL synchronously (pure regex, microsecond-fast)
  const { parsedGraphData, operations } = useMemo(() => {
    try {
      const ops = getOperationsFromCnl(code)
      const data = operationsToGraph(ops)
      return { parsedGraphData: data, operations: ops }
    } catch (error) {
      log.error('Error parsing CNL', error)
      return {
        parsedGraphData: { nodes: [], edges: [], attributes: [], abbreviations: {}, expressions: [], description: null, currency: null, errors: [{ message: String(error) }] } as CnlGraphData,
        operations: []
      }
    }
  }, [code])

  // Expand expressions asynchronously, then merge into graph data
  const [graphData, setGraphData] = useState<CnlGraphData>(parsedGraphData)
  useEffect(() => {
    if (parsedGraphData.expressions.length === 0) {
      setGraphData(parsedGraphData)
      return
    }
    let cancelled = false
    void (async () => {
      const allExtraOps = []
      for (const expr of parsedGraphData.expressions) {
        const exprOps = await expressionToPetriNetOps(expr.expression)
        allExtraOps.push(...exprOps)
      }
      if (cancelled) return
      // Merge expression ops with original ops and re-process
      const merged = operationsToGraph([...operations, ...allExtraOps])
      // Preserve the expression list and other metadata from original parse
      merged.description = merged.description ?? parsedGraphData.description
      merged.currency = merged.currency ?? parsedGraphData.currency
      setGraphData(merged)
    })()
    return () => { cancelled = true }
  }, [parsedGraphData, operations])

  // Determine graph mode
  const graphMode: GraphMode = useMemo(() => {
    const hasTransitions = graphData.nodes.some((n) => isTransitionRole(n.role))
    if (hasTransitions) return 'petri-net'
    const isMindmapOnly = operations.length > 0 && operations.every((op) => op.source === 'mindmap')
    if (isMindmapOnly) return 'mindmap'
    return 'concept-map'
  }, [graphData, operations])

  // Detect cycles in concept-map graphs (for stress layout)
  const hasCycle = useMemo(() => {
    if (graphMode !== 'concept-map') return false
    return graphHasCycle(graphData.edges)
  }, [graphData.edges, graphMode])

  // Detect accounting mode (Transaction nodes present)
  const isAccountingMode = useMemo(
    () => graphData.nodes.some((n) => n.role === 'Transaction'),
    [graphData]
  )

  // Detect function mode (Function nodes present)
  const hasFunctions = useMemo(
    () => graphData.nodes.some((n) => n.role === 'Function'),
    [graphData]
  )

  // Resolve currency symbol from graph data
  const currencySymbol = useMemo(
    () => resolveCurrencySymbol(graphData.currency),
    [graphData.currency]
  )

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

  // Compute the maximum prior-state arc weight per place
  const maxPriorWeight = useMemo(() => {
    const weightMap = new Map<string, number>()
    if (graphMode !== 'petri-net') return weightMap
    for (const edge of graphData.edges) {
      if (edge.name === 'has prior_state') {
        const current = weightMap.get(edge.target_id) ?? 0
        if (edge.weight > current) weightMap.set(edge.target_id, edge.weight)
      }
    }
    return weightMap
  }, [graphData.edges, graphMode])

  // Initialize Petri net marking when graph data changes
  useEffect(() => {
    if (graphMode !== 'petri-net') {
      setMarking(new Map())
      return
    }
    const initial = new Map<string, number>()
    if (isAccountingMode) {
      // Accounting mode: use balance: attribute for initial values, default to 0
      for (const node of graphData.nodes) {
        if (isTransitionRole(node.role)) continue
        const balanceAttr = graphData.attributes.find(
          (a) => a.source_id === node.id && a.name.toLowerCase() === 'balance'
        )
        initial.set(node.id, balanceAttr ? parseFloat(balanceAttr.value) || 0 : 0)
      }
      // Auto-fire all transactions: apply each transaction's effects once
      for (const node of graphData.nodes) {
        if (node.role !== 'Transaction') continue
        const creditEdges = graphData.edges.filter((e) => e.source_id === node.id && e.name === 'has prior_state')
        for (const edge of creditEdges) {
          initial.set(edge.target_id, (initial.get(edge.target_id) ?? 0) - edge.weight)
        }
        const debitEdges = graphData.edges.filter((e) => e.source_id === node.id && e.name === 'has post_state')
        for (const edge of debitEdges) {
          initial.set(edge.target_id, (initial.get(edge.target_id) ?? 0) + edge.weight)
        }
      }
    } else if (hasFunctions) {
      // Function mode: places with a "value" attribute get 1 token, others get 0
      const initialValues = new Map<string, number>()
      for (const node of graphData.nodes) {
        if (isTransitionRole(node.role)) continue
        const valueAttr = graphData.attributes.find(
          (a) => a.source_id === node.id && a.name.toLowerCase() === 'value'
        )
        if (valueAttr) {
          const numVal = parseFloat(valueAttr.value)
          if (!isNaN(numVal)) {
            initialValues.set(node.id, numVal)
            initial.set(node.id, 1)
          } else {
            initial.set(node.id, 0)
          }
        } else {
          initial.set(node.id, priorStateNodeIds.has(node.id) ? 1 : 0)
        }
      }
      setPlaceValues(initialValues)
    } else {
      for (const nodeId of priorStateNodeIds) {
        const weight = maxPriorWeight.get(nodeId) ?? 1
        initial.set(nodeId, tokenMultiplier * weight)
      }
      for (const nodeId of postStateNodeIds) {
        if (!priorStateNodeIds.has(nodeId)) initial.set(nodeId, 0)
      }
    }
    setMarking(initial)
  }, [graphData, graphMode, isAccountingMode, hasFunctions, priorStateNodeIds, postStateNodeIds, tokenMultiplier, maxPriorWeight])

  // Petri net: check if a transition is enabled (respects arc weights)
  const isTransitionEnabled = useCallback(
    (transitionId: string, currentMarking: Map<string, number>): boolean => {
      const inputEdges = graphData.edges.filter((e) => e.source_id === transitionId && e.name === 'has prior_state')
      if (inputEdges.length === 0) return false
      // Sum required tokens per input place (handles multiple arcs to the same place)
      const required = new Map<string, number>()
      for (const edge of inputEdges) {
        required.set(edge.target_id, (required.get(edge.target_id) ?? 0) + edge.weight)
      }
      return [...required.entries()].every(([placeId, need]) => (currentMarking.get(placeId) ?? 0) >= need)
    },
    [graphData]
  )

  // Petri net: fire a transition (respects arc weights, evaluates Function expressions)
  const fireTransition = useCallback(
    (transitionId: string) => {
      const transitionNode = graphData.nodes.find((n) => n.id === transitionId)
      const isFunctionNode = transitionNode?.role === 'Function'

      if (isFunctionNode) {
        // Async fire for Function transitions: evaluate definition, then update marking + values
        const expressionAttr = graphData.attributes.find(
          (a) => a.source_id === transitionId && a.name.toLowerCase() === 'definition'
        )
        if (!expressionAttr) return

        const inputEdges = graphData.edges.filter((e) => e.source_id === transitionId && e.name === 'has prior_state')
        const outputEdges = graphData.edges.filter((e) => e.source_id === transitionId && e.name === 'has post_state')

        // Build scope: map input place names to their numeric values
        const scope: Record<string, number> = {}
        for (const edge of inputEdges) {
          const inputNode = graphData.nodes.find((n) => n.id === edge.target_id)
          if (inputNode) {
            // Use the place's computed value if available, else try its "value" attribute
            const val = placeValues.get(edge.target_id)
            if (val !== undefined) {
              scope[inputNode.base_name] = val
              // Also add by node ID (cleaned)
              scope[edge.target_id] = val
            } else {
              const valAttr = graphData.attributes.find(
                (a) => a.source_id === edge.target_id && a.name.toLowerCase() === 'value'
              )
              if (valAttr) {
                const numVal = parseFloat(valAttr.value)
                if (!isNaN(numVal)) {
                  scope[inputNode.base_name] = numVal
                  scope[edge.target_id] = numVal
                }
              }
            }
          }
        }

        // Add abbreviation aliases to scope
        for (const [abbrev, info] of Object.entries(graphData.abbreviations)) {
          const nodeVal = placeValues.get(info.nodeId)
          if (nodeVal !== undefined) {
            scope[abbrev] = nodeVal
          } else {
            // Find the attribute value from the source node
            const valAttr = graphData.attributes.find(
              (a) => a.source_id === info.nodeId && a.name === info.fullName
            )
            if (valAttr) {
              const numVal = parseFloat(valAttr.value)
              if (!isNaN(numVal)) scope[abbrev] = numVal
            }
          }
        }

        // Evaluate asynchronously
        void evaluateExpression(expressionAttr.value, scope).then((result) => {
          if (result.value !== null) {
            // Update marking: standard token consume/produce
            setMarking((prev) => {
              if (!isTransitionEnabled(transitionId, prev)) return prev
              const next = new Map(prev)
              for (const edge of inputEdges) {
                next.set(edge.target_id, (next.get(edge.target_id) ?? 0) - edge.weight)
              }
              for (const edge of outputEdges) {
                next.set(edge.target_id, (next.get(edge.target_id) ?? 0) + edge.weight)
              }
              return next
            })
            // Write computed result to all output places
            setPlaceValues((prev) => {
              const next = new Map(prev)
              for (const edge of outputEdges) {
                next.set(edge.target_id, result.value!)
              }
              return next
            })
          } else {
            log.error('Expression evaluation error:', result.error)
          }
        })
      } else {
        // Standard PN firing
        setMarking((prev) => {
          if (!isTransitionEnabled(transitionId, prev)) return prev
          const next = new Map(prev)
          const inputEdges = graphData.edges.filter((e) => e.source_id === transitionId && e.name === 'has prior_state')
          for (const edge of inputEdges) {
            next.set(edge.target_id, (next.get(edge.target_id) ?? 0) - edge.weight)
          }
          const outputEdges = graphData.edges.filter((e) => e.source_id === transitionId && e.name === 'has post_state')
          for (const edge of outputEdges) {
            next.set(edge.target_id, (next.get(edge.target_id) ?? 0) + edge.weight)
          }
          return next
        })
      }
    },
    [graphData, isTransitionEnabled, placeValues]
  )

  // Petri net: reset marking to initial state
  const resetMarking = useCallback(() => {
    const initial = new Map<string, number>()
    if (hasFunctions) {
      const initialValues = new Map<string, number>()
      for (const node of graphData.nodes) {
        if (isTransitionRole(node.role)) continue
        const valueAttr = graphData.attributes.find(
          (a) => a.source_id === node.id && a.name.toLowerCase() === 'value'
        )
        if (valueAttr) {
          const numVal = parseFloat(valueAttr.value)
          if (!isNaN(numVal)) {
            initialValues.set(node.id, numVal)
            initial.set(node.id, 1)
          } else {
            initial.set(node.id, 0)
          }
        } else {
          initial.set(node.id, priorStateNodeIds.has(node.id) ? 1 : 0)
        }
      }
      setPlaceValues(initialValues)
    } else {
      for (const nodeId of priorStateNodeIds) {
        const weight = maxPriorWeight.get(nodeId) ?? 1
        initial.set(nodeId, tokenMultiplier * weight)
      }
      for (const nodeId of postStateNodeIds) {
        if (!priorStateNodeIds.has(nodeId)) initial.set(nodeId, 0)
      }
    }
    setMarking(initial)
  }, [graphData, hasFunctions, priorStateNodeIds, postStateNodeIds, tokenMultiplier, maxPriorWeight])

  // Evaluate all Function transitions in topological order
  const evaluateAll = useCallback(async () => {
    const functionNodes = graphData.nodes.filter((n) => n.role === 'Function')
    if (functionNodes.length === 0) return

    // Build adjacency: a Function depends on another if its input places are outputs of the other
    const outputToFunction = new Map<string, string>() // placeId → functionId that produces it
    for (const fn of functionNodes) {
      const outEdges = graphData.edges.filter((e) => e.source_id === fn.id && e.name === 'has post_state')
      for (const e of outEdges) outputToFunction.set(e.target_id, fn.id)
    }

    // Topological sort via Kahn's algorithm
    const inDeg = new Map<string, number>()
    const adj = new Map<string, string[]>()
    for (const fn of functionNodes) {
      inDeg.set(fn.id, 0)
      adj.set(fn.id, [])
    }
    for (const fn of functionNodes) {
      const inEdges = graphData.edges.filter((e) => e.source_id === fn.id && e.name === 'has prior_state')
      for (const e of inEdges) {
        const producer = outputToFunction.get(e.target_id)
        if (producer && producer !== fn.id) {
          adj.get(producer)!.push(fn.id)
          inDeg.set(fn.id, (inDeg.get(fn.id) ?? 0) + 1)
        }
      }
    }

    const queue: string[] = []
    for (const [id, deg] of inDeg) {
      if (deg === 0) queue.push(id)
    }

    const sorted: string[] = []
    while (queue.length > 0) {
      const current = queue.shift()!
      sorted.push(current)
      for (const next of adj.get(current) ?? []) {
        const newDeg = (inDeg.get(next) ?? 1) - 1
        inDeg.set(next, newDeg)
        if (newDeg === 0) queue.push(next)
      }
    }

    // Fire each Function transition in order
    let currentValues = new Map(placeValues)
    let currentMarking = new Map(marking)

    for (const fnId of sorted) {
      const fn = graphData.nodes.find((n) => n.id === fnId)
      if (!fn) continue

      const exprAttr = graphData.attributes.find(
        (a) => a.source_id === fnId && a.name.toLowerCase() === 'definition'
      )
      if (!exprAttr) continue

      const inputEdges = graphData.edges.filter((e) => e.source_id === fnId && e.name === 'has prior_state')
      const outputEdges = graphData.edges.filter((e) => e.source_id === fnId && e.name === 'has post_state')

      // Build scope
      const scope: Record<string, number> = {}
      for (const edge of inputEdges) {
        const inputNode = graphData.nodes.find((n) => n.id === edge.target_id)
        if (inputNode) {
          const val = currentValues.get(edge.target_id)
          if (val !== undefined) {
            scope[inputNode.base_name] = val
            scope[edge.target_id] = val
          } else {
            const valAttr = graphData.attributes.find(
              (a) => a.source_id === edge.target_id && a.name.toLowerCase() === 'value'
            )
            if (valAttr) {
              const numVal = parseFloat(valAttr.value)
              if (!isNaN(numVal)) {
                scope[inputNode.base_name] = numVal
                scope[edge.target_id] = numVal
              }
            }
          }
        }
      }

      // Add abbreviation aliases
      for (const [abbrev, info] of Object.entries(graphData.abbreviations)) {
        const nodeVal = currentValues.get(info.nodeId)
        if (nodeVal !== undefined) {
          scope[abbrev] = nodeVal
        } else {
          const valAttr = graphData.attributes.find(
            (a) => a.source_id === info.nodeId && a.name === info.fullName
          )
          if (valAttr) {
            const numVal = parseFloat(valAttr.value)
            if (!isNaN(numVal)) scope[abbrev] = numVal
          }
        }
      }

      const result = await evaluateExpression(exprAttr.value, scope)
      if (result.value !== null) {
        // Update token flow
        for (const edge of inputEdges) {
          currentMarking.set(edge.target_id, (currentMarking.get(edge.target_id) ?? 0) - edge.weight)
        }
        for (const edge of outputEdges) {
          currentMarking.set(edge.target_id, (currentMarking.get(edge.target_id) ?? 0) + edge.weight)
          currentValues.set(edge.target_id, result.value)
        }
      }
    }

    setMarking(new Map(currentMarking))
    setPlaceValues(new Map(currentValues))
  }, [graphData, placeValues, marking])

  // Check if any transition is enabled (for deadlock detection)
  const hasEnabledTransition = useMemo(() => {
    if (graphMode !== 'petri-net') return true
    return graphData.nodes.some((n) => isTransitionRole(n.role) && isTransitionEnabled(n.id, marking))
  }, [graphData, graphMode, marking, isTransitionEnabled])

  // Accounting: validate that debits == credits per transaction
  const unbalancedTransactions = useMemo(() => {
    if (!isAccountingMode) return []
    const result: Array<{ name: string; debits: number; credits: number }> = []
    for (const node of graphData.nodes) {
      if (node.role !== 'Transaction') continue
      const debitEdges = graphData.edges.filter((e) => e.source_id === node.id && e.name === 'has post_state')
      const creditEdges = graphData.edges.filter((e) => e.source_id === node.id && e.name === 'has prior_state')
      const totalDebits = debitEdges.reduce((sum, e) => sum + e.weight, 0)
      const totalCredits = creditEdges.reduce((sum, e) => sum + e.weight, 0)
      if (Math.abs(totalDebits - totalCredits) > 0.001) {
        result.push({ name: node.name, debits: totalDebits, credits: totalCredits })
      }
    }
    return result
  }, [graphData, isAccountingMode])

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

    if (graphMode === 'concept-map' && hasCycle) {
      return {
        name: 'elk',
        nodeDimensionsIncludeLabels: true,
        elk: {
          algorithm: 'stress',
          'elk.stress.desiredEdgeLength': '120',
          'elk.spacing.nodeNode': '50'
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
  }, [graphMode, hasCycle])

  // Render Cytoscape graph
  useEffect(() => {
    if (!containerRef.current || !cytoscapeModules || !inMemoryGraph) return

    const cytoscape = cytoscapeModules
    const isPetriNet = graphMode === 'petri-net'

    // Build node elements
    const cyNodes: cytoscape.ElementDefinition[] = []

    if (isPetriNet) {
      // --- Petri net node building: compute all assignments first, then create elements ---

      // 1. Identify transition IDs and prepare group ID templates
      const transitionIds: string[] = []
      for (const node of inMemoryGraph.nodes) {
        if (isTransitionRole(node.role)) transitionIds.push(node.id)
      }

      // 2. Build a map: for each place, track which transition+role (prior/post) it belongs to.
      //    A place shared across transitions gets assigned to the first transition where it
      //    appears, preferring the role (prior vs post) from that first edge.
      const placeAssignment = new Map<string, { transId: string; role: 'prior' | 'post' }>()
      for (const edge of graphData.edges) {
        if (edge.name !== 'has prior_state' && edge.name !== 'has post_state') continue
        if (placeAssignment.has(edge.target_id)) continue
        const role = edge.name === 'has prior_state' ? 'prior' : 'post'
        placeAssignment.set(edge.target_id, { transId: edge.source_id, role })
      }

      // 3. Auxiliary nodes: trace non-Petri edges to find a connected place's group
      const auxiliaryAssignment = new Map<string, { transId: string; role: 'prior' | 'post' }>()
      for (const edge of inMemoryGraph.edges) {
        if (edge.name === 'has prior_state' || edge.name === 'has post_state') continue
        const sourcePlace = placeAssignment.get(edge.source_id)
        const targetPlace = placeAssignment.get(edge.target_id)
        if (sourcePlace && !placeAssignment.has(edge.target_id) && !auxiliaryAssignment.has(edge.target_id)) {
          auxiliaryAssignment.set(edge.target_id, sourcePlace)
        }
        if (targetPlace && !placeAssignment.has(edge.source_id) && !auxiliaryAssignment.has(edge.source_id)) {
          auxiliaryAssignment.set(edge.source_id, targetPlace)
        }
      }

      // 4. Determine which groups actually have members
      const groupMembers = new Map<string, number>()
      for (const [, assignment] of placeAssignment) {
        const groupId = `${assignment.role}-group-${assignment.transId}`
        groupMembers.set(groupId, (groupMembers.get(groupId) ?? 0) + 1)
      }
      for (const [, assignment] of auxiliaryAssignment) {
        const groupId = `${assignment.role}-group-${assignment.transId}`
        groupMembers.set(groupId, (groupMembers.get(groupId) ?? 0) + 1)
      }

      // 5. Only create compound groups that have at least one member
      const priorGroupLabel = isAccountingMode ? 'Credits' : 'Inputs'
      const postGroupLabel = isAccountingMode ? 'Debits' : 'Outputs'
      for (const transId of transitionIds) {
        const priorGroupId = `prior-group-${transId}`
        const postGroupId = `post-group-${transId}`
        if (groupMembers.has(priorGroupId)) {
          cyNodes.push({ data: { id: priorGroupId, label: priorGroupLabel, groupType: 'prior' } })
        }
        if (groupMembers.has(postGroupId)) {
          cyNodes.push({ data: { id: postGroupId, label: postGroupLabel, groupType: 'post' } })
        }
      }

      // 6. Create node elements
      for (const node of inMemoryGraph.nodes) {
        if (isTransitionRole(node.role)) {
          const isFn = node.role === 'Function'
          const exprAttr = isFn ? graphData.attributes.find((a) => a.source_id === node.id && a.name.toLowerCase() === 'definition') : null
          cyNodes.push({
            data: {
              id: node.id,
              label: isFn && exprAttr ? `${node.name}\nf(x) = ${exprAttr.value}` : node.name,
              type: 'pn-transition',
              isFunction: isFn,
              partition: 1,
              enabled: isTransitionEnabled(node.id, marking)
            }
          })
        } else if (placeAssignment.has(node.id)) {
          const assignment = placeAssignment.get(node.id)!
          const groupId = `${assignment.role}-group-${assignment.transId}`
          const hasGroup = groupMembers.has(groupId)
          const isPrior = assignment.role === 'prior'
          const tokens = marking.get(node.id) ?? (isPrior ? (isAccountingMode ? 0 : tokenMultiplier * (maxPriorWeight.get(node.id) ?? 1)) : 0)
          cyNodes.push({
            data: {
              id: node.id,
              label: node.name,
              displayLabel: placeDisplayLabel(node.name, tokens, isAccountingMode, currencySymbol, placeValues.get(node.id)),
              type: 'pn-place',
              tokenCount: tokens,
              computedValue: placeValues.get(node.id) ?? null,
              partition: isPrior ? 0 : 2,
              ...(hasGroup && { parent: groupId })
            }
          })
        } else {
          // Auxiliary or orphan node
          const auxAssignment = auxiliaryAssignment.get(node.id)
          const parentGroupId = auxAssignment ? `${auxAssignment.role}-group-${auxAssignment.transId}` : undefined
          const hasParent = parentGroupId && groupMembers.has(parentGroupId)
          cyNodes.push({
            data: {
              id: node.id,
              label: node.name,
              type: hasParent ? 'polynode' : 'pn-orphan',
              hasMorphs: node.morphs.length > 1,
              ...(hasParent && { parent: parentGroupId })
            }
          })
        }
      }
    } else {
      // Concept map / mindmap mode — original behavior
      for (const node of inMemoryGraph.nodes) {
        let displayName = node.name
        if (node.morphs && node.nbh) {
          const activeMorph = node.morphs.find((m) => m.morph_id === node.nbh)
          if (activeMorph && activeMorph.name !== 'basic') {
            displayName = `${node.name} (${activeMorph.name})`
          }
        }
        if (node.quantifier) {
          displayName = `${quantifierSymbol(node.quantifier)}${displayName}`
        }
        cyNodes.push({
          data: {
            id: node.id,
            label: displayName,
            type: 'polynode',
            hasMorphs: node.morphs.length > 1,
            hasQuantifier: !!node.quantifier
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
        const arcLabel = isAccountingMode
          ? `${currencySymbol}${edge.weight.toFixed(2)}`
          : edge.weight > 1 ? circledNumber(edge.weight) : ''
        cyEdges.push({
          data: {
            id: edge.id,
            source: edge.target_id,
            target: edge.source_id,
            label: arcLabel,
            edgeType: 'prior_state'
          }
        })
      } else if (isPetriNet && edge.name === 'has post_state') {
        // Direction already correct: transition → place
        const arcLabel = isAccountingMode
          ? `${currencySymbol}${edge.weight.toFixed(2)}`
          : edge.weight > 1 ? circledNumber(edge.weight) : ''
        cyEdges.push({
          data: {
            id: edge.id,
            source: edge.source_id,
            target: edge.target_id,
            label: arcLabel,
            edgeType: 'post_state'
          }
        })
      } else {
        cyEdges.push({
          data: {
            id: edge.id,
            source: edge.source_id,
            target: edge.target_id,
            label: edge.weight > 1 ? `${edge.name} ${circledNumber(edge.weight)}` : edge.name
          }
        })
      }
    }

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy()
    }

    // Build style array — adapt colors for dark mode
    const dark = isDarkMode()
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
        selector: 'node[?hasQuantifier]',
        style: {
          'border-style': 'dashed',
          'border-color': '#7c3aed',
          'border-width': 3
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
          'line-color': dark ? '#64748b' : '#94a3b8',
          'target-arrow-color': dark ? '#94a3b8' : '#64748b',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(label)',
          'font-size': '9px',
          color: dark ? '#cbd5e1' : '#1e293b',
          'text-rotation': 'autorotate',
          'text-margin-y': -8
        }
      }
    ]

    if (isPetriNet) {
      graphStyles.push(
        // Place nodes (rounded rectangles — consistent with concept map style)
        {
          selector: 'node[type="pn-place"]',
          style: {
            shape: 'round-rectangle',
            'background-color': dark ? '#1e293b' : '#ffffff',
            'border-width': 3,
            'border-color': dark ? '#94a3b8' : '#334155',
            label: 'data(displayLabel)',
            color: dark ? '#e2e8f0' : '#1e293b',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            width: 'label',
            height: 'label',
            padding: '10px'
          }
        },
        // Place with tokens — solid border
        {
          selector: 'node[type="pn-place"][tokenCount > 0]',
          style: {
            'border-color': dark ? '#94a3b8' : '#334155',
            'border-width': 3
          }
        },
        // Empty place — dashed, muted
        {
          selector: 'node[type="pn-place"][tokenCount = 0]',
          style: {
            'background-color': dark ? '#0f172a' : '#f1f5f9',
            'border-style': 'dashed',
            color: dark ? '#64748b' : '#64748b'
          }
        },
        // Transition bar
        {
          selector: 'node[type="pn-transition"]',
          style: {
            shape: 'rectangle',
            width: 15,
            height: 60,
            'background-color': dark ? '#94a3b8' : '#1e293b',
            'border-width': 0,
            label: 'data(label)',
            color: dark ? '#e2e8f0' : '#1e293b',
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
        // Function transition — wider bar with expression label
        {
          selector: 'node[type="pn-transition"][?isFunction]',
          style: {
            width: 30,
            height: 50,
            shape: 'round-rectangle',
            'background-color': '#7c3aed',
            'border-width': 2,
            'border-color': '#6d28d9',
            'font-size': '9px',
            'text-max-width': '120px'
          }
        },
        // Enabled Function transition
        {
          selector: 'node[type="pn-transition"][?isFunction][?enabled]',
          style: {
            'background-color': '#7c3aed',
            'border-color': '#5b21b6'
          }
        },
        // Computed value badge on place nodes
        {
          selector: 'node[type="pn-place"][computedValue]',
          style: {
            'border-color': dark ? '#60a5fa' : '#2563eb',
            'border-width': 3,
            'background-color': dark ? '#1e3a5f' : '#eff6ff'
          }
        },
        // Compound group: prior states
        {
          selector: ':parent[groupType="prior"]',
          style: {
            'background-color': dark ? '#1e3a5f' : '#dbeafe',
            'background-opacity': dark ? 0.5 : 0.4,
            'border-width': 2,
            'border-color': dark ? '#3b82f6' : '#93c5fd',
            'border-style': 'dashed',
            padding: '20px',
            shape: 'round-rectangle',
            'text-valign': 'top',
            'text-halign': 'center',
            'font-size': '10px',
            color: dark ? '#93c5fd' : '#1e3a8a',
            label: 'data(label)'
          }
        },
        // Compound group: post states
        {
          selector: ':parent[groupType="post"]',
          style: {
            'background-color': dark ? '#14532d' : '#dcfce7',
            'background-opacity': dark ? 0.5 : 0.4,
            'border-width': 2,
            'border-color': dark ? '#22c55e' : '#86efac',
            'border-style': 'dashed',
            padding: '20px',
            shape: 'round-rectangle',
            'text-valign': 'top',
            'text-halign': 'center',
            'font-size': '10px',
            color: dark ? '#86efac' : '#14532d',
            label: 'data(label)'
          }
        },
        // Input arcs (place → transition) — blue
        {
          selector: 'edge[edgeType="prior_state"]',
          style: {
            'line-color': dark ? '#60a5fa' : '#3b82f6',
            'target-arrow-color': dark ? '#93c5fd' : '#2563eb',
            'target-arrow-shape': 'triangle',
            width: 3,
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '14px',
            color: dark ? '#93c5fd' : '#1e3a8a',
            'text-background-color': dark ? '#1e293b' : '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        },
        // Output arcs (transition → place) — green
        {
          selector: 'edge[edgeType="post_state"]',
          style: {
            'line-color': dark ? '#4ade80' : '#22c55e',
            'target-arrow-color': dark ? '#86efac' : '#16a34a',
            'target-arrow-shape': 'triangle',
            width: 3,
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '14px',
            color: dark ? '#86efac' : '#14532d',
            'text-background-color': dark ? '#1e293b' : '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        },
        // Orphan nodes — sharp rectangles to signal unaffiliated status
        {
          selector: 'node[type="pn-orphan"]',
          style: {
            shape: 'rectangle',
            'background-color': dark ? '#1e293b' : '#f8fafc',
            'border-width': 2,
            'border-color': dark ? '#64748b' : '#94a3b8',
            'border-style': 'dashed',
            label: 'data(label)',
            color: dark ? '#cbd5e1' : '#334155',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '10px',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            width: 'label',
            height: 'label',
            padding: '8px'
          }
        }
      )
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: graphStyles,
      layout: layoutConfig as cytoscape.LayoutOptions,
      userZoomingEnabled: scrollZoomEnabled,
      userPanningEnabled: true,
      boxSelectionEnabled: false
    })

    // Tap handlers
    if (isPetriNet) {
      // Click enabled transition to fire it
      cy.on('tap', 'node[type="pn-transition"]', (evt) => {
        const nodeId = evt.target.id()
        if (!isAccountingMode && evt.target.data('enabled')) {
          fireTransition(nodeId)
        }
        setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
      })
      // Click place to select it
      cy.on('tap', 'node[type="pn-place"]', (evt) => {
        const nodeId = evt.target.id()
        setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
      })
      // Click auxiliary/orphan nodes to select
      cy.on('tap', 'node[type="polynode"], node[type="pn-orphan"]', (evt) => {
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
  // Note: scrollZoomEnabled is intentionally excluded — toggling it updates the live cy instance directly via toggleScrollZoom
  }, [cytoscapeModules, inMemoryGraph, graphMode, layoutConfig, marking, placeValues, priorStateNodeIds, postStateNodeIds, isTransitionEnabled, fireTransition, graphData, isAccountingMode, currencySymbol])

  // Update Cytoscape node data when marking or placeValues change (without full re-render)
  useEffect(() => {
    if (!cyRef.current || graphMode !== 'petri-net') return
    for (const [placeId, count] of marking) {
      const node = cyRef.current.$id(placeId)
      if (node.length) {
        node.data('tokenCount', count)
        node.data('computedValue', placeValues.get(placeId) ?? null)
        node.data('displayLabel', placeDisplayLabel(node.data('label'), count, isAccountingMode, currencySymbol, placeValues.get(placeId)))
      }
    }
    // Also update places that only have value changes (not in marking)
    for (const [placeId, val] of placeValues) {
      const node = cyRef.current.$id(placeId)
      if (node.length) {
        node.data('computedValue', val)
        const count = marking.get(placeId) ?? 0
        node.data('displayLabel', placeDisplayLabel(node.data('label'), count, isAccountingMode, currencySymbol, val))
      }
    }
    for (const node of graphData.nodes) {
      if (isTransitionRole(node.role)) {
        const enabled = isTransitionEnabled(node.id, marking)
        const cyNode = cyRef.current.$id(node.id)
        if (cyNode.length) {
          cyNode.data('enabled', enabled)
        }
      }
    }
  }, [marking, placeValues, graphMode, graphData, isTransitionEnabled, isAccountingMode, currencySymbol])

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

  const handleZoomIn = useCallback(() => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.zoom({ level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
  }, [])

  const handleFitGraph = useCallback(() => {
    if (!cyRef.current) return
    cyRef.current.fit(undefined, 30)
  }, [])

  const toggleScrollZoom = useCallback(() => {
    setScrollZoomEnabled((prev) => {
      const next = !prev
      if (cyRef.current) {
        cyRef.current.userZoomingEnabled(next)
      }
      return next
    })
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
    let transitionData: {
      priorStates: { id: string; name: string; weight: number }[]
      postStates: { id: string; name: string; weight: number }[]
    } | null = null
    if (isTransitionRole(selectedNode.role)) {
      const priorStates = graphData.edges
        .filter((e) => e.source_id === selectedNode.id && e.name === 'has prior_state')
        .map((e) => {
          const node = inMemoryGraph.nodes.find((n) => n.id === e.target_id)
          return { id: e.target_id, name: node?.name ?? e.target_id, weight: e.weight }
        })
      const postStates = graphData.edges
        .filter((e) => e.source_id === selectedNode.id && e.name === 'has post_state')
        .map((e) => {
          const node = inMemoryGraph.nodes.find((n) => n.id === e.target_id)
          return { id: e.target_id, name: node?.name ?? e.target_id, weight: e.weight }
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

        {isAccountingMode && marking.size > 0 && (
          <div className={styles['deadlock-banner']}>
            Balances reflect all transactions in this block
          </div>
        )}

        {isPetriNet && !isAccountingMode && !hasEnabledTransition && marking.size > 0 && (
          <div className={styles['deadlock-banner']}>
            Deadlock: no transition can fire
          </div>
        )}

        {isAccountingMode && unbalancedTransactions.length > 0 && (
          <div className={styles['warning-banner']}>
            <details open>
              <summary>{unbalancedTransactions.length} unbalanced transaction(s)</summary>
              <ul>
                {unbalancedTransactions.map((t, i) => (
                  <li key={i}>{t.name}: debits {currencySymbol}{t.debits.toFixed(2)} != credits {currencySymbol}{t.credits.toFixed(2)}</li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <div className={styles['export-buttons']}>
          {isPetriNet && !isAccountingMode && (
            <>
              <input
                type='number'
                min={1}
                step={1}
                value={tokenMultiplier}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (v >= 1) setTokenMultiplier(v)
                }}
                className={styles['token-input']}
                title='Token multiplier — initial tokens = multiplier × arc weight'
              />
            </>
          )}
          {isPetriNet && !isAccountingMode && (
            <button onClick={resetMarking} title='Reset token marking to initial state'>
              <IconReset size={14} />
            </button>
          )}
          {isPetriNet && hasFunctions && (
            <button onClick={() => void evaluateAll()} title='Evaluate all Function transitions in order'>
              <IconEvalAll size={14} />
            </button>
          )}
          <button onClick={handleZoomIn} title='Zoom in'>
            <IconZoomIn size={14} />
          </button>
          <button onClick={handleZoomOut} title='Zoom out'>
            <IconZoomOut size={14} />
          </button>
          <button onClick={handleFitGraph} title='Fit graph to view'>
            <IconFit size={14} />
          </button>
          <button
            onClick={toggleScrollZoom}
            className={scrollZoomEnabled ? styles['toggle-active'] : undefined}
            title={scrollZoomEnabled ? 'Disable scroll-to-zoom (currently on)' : 'Enable scroll-to-zoom (currently off)'}
          >
            <IconMouse size={14} />
          </button>
          <button onClick={handleValidate} title='Validate against schemas'>
            <IconValidate size={14} />
          </button>
          <button onClick={handleExportPng} title='Export as PNG'>
            <IconPng size={14} />
          </button>
          <button onClick={handleExportSvg} title='Export as SVG'>
            <IconSvg size={14} />
          </button>
        </div>

        <div ref={containerRef} className={styles['graph-canvas']} />

        {selectedNode && selectedNodeData && (
          <div className={styles['node-detail-panel']}>
            <h4>
              {selectedNode.name}
              <span className={styles['node-type-badge']}>
                {selectedNode.role}
              </span>
              {selectedNode.quantifier && (
                <span className={styles['quantifier-badge']}>
                  {quantifierSymbol(selectedNode.quantifier).trim()} {selectedNode.quantifier}
                </span>
              )}
              <button className={styles['close-button']} onClick={() => setSelectedNodeId(null)}>
                &times;
              </button>
            </h4>

            {selectedNode.description && <div className={styles['node-description']}>{selectedNode.description}</div>}

            {/* Petri net transition / accounting transaction detail */}
            {isPetriNet && selectedNodeData.transitionData && (
              <div className={styles['transition-panel']}>
                <div className={styles['transition-label']}>
                  {selectedNode.role === 'Function' ? 'Function Transition' : isAccountingMode ? 'Accounting Transaction' : 'Petri Net Transition'}
                </div>
                {selectedNode.role === 'Function' && (() => {
                  const exprAttr = graphData.attributes.find(
                    (a) => a.source_id === selectedNode.id && a.name.toLowerCase() === 'definition'
                  )
                  return exprAttr ? (
                    <div className={styles['definition-display']}>
                      <strong>f(x)</strong> = <code>{exprAttr.value}</code>
                    </div>
                  ) : null
                })()}
                <div className={styles['transition-flow']}>
                  <div className={styles['transition-flow-group']}>
                    <span className={styles['transition-flow-heading']}>
                      {isAccountingMode ? 'Credits (from)' : 'Inputs'}
                    </span>
                    {selectedNodeData.transitionData.priorStates.map((s) => (
                      <span key={s.id} className={styles['transition-flow-item']}>
                        {isAccountingMode
                          ? `${currencySymbol}${s.weight.toFixed(2)} ${s.name} (bal: ${currencySymbol}${(marking.get(s.id) ?? 0).toFixed(2)})`
                          : `${s.weight > 1 ? `${circledNumber(s.weight)} ` : ''}${s.name} (${marking.get(s.id) ?? 0})`
                        }
                      </span>
                    ))}
                  </div>
                  <span className={styles['transition-flow-arrow']}>&rarr;</span>
                  <div className={styles['transition-flow-center']}>{selectedNode.name}</div>
                  <span className={styles['transition-flow-arrow']}>&rarr;</span>
                  <div className={styles['transition-flow-group']}>
                    <span className={styles['transition-flow-heading']}>
                      {isAccountingMode ? 'Debits (to)' : 'Outputs'}
                    </span>
                    {selectedNodeData.transitionData.postStates.map((s) => (
                      <span key={s.id} className={styles['transition-flow-item']}>
                        {isAccountingMode
                          ? `${currencySymbol}${s.weight.toFixed(2)} ${s.name} (bal: ${currencySymbol}${(marking.get(s.id) ?? 0).toFixed(2)})`
                          : `${s.weight > 1 ? `${circledNumber(s.weight)} ` : ''}${s.name} (${marking.get(s.id) ?? 0})`
                        }
                      </span>
                    ))}
                  </div>
                </div>
                {!isAccountingMode && (
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
                )}
              </div>
            )}

            {/* Petri net place / account detail */}
            {isPetriNet && (priorStateNodeIds.has(selectedNode.id) || postStateNodeIds.has(selectedNode.id)) && (
              <div className={styles['place-panel']}>
                <div className={styles['place-info']}>
                  <span>
                    {isAccountingMode ? 'Balance: ' : 'Tokens: '}
                    <strong>
                      {isAccountingMode
                        ? `${currencySymbol}${(marking.get(selectedNode.id) ?? 0).toFixed(2)}`
                        : marking.get(selectedNode.id) ?? 0
                      }
                    </strong>
                  </span>
                  <span>
                    Role: {isAccountingMode
                      ? (priorStateNodeIds.has(selectedNode.id) ? 'Credit Source' : 'Debit Destination')
                      : (priorStateNodeIds.has(selectedNode.id) ? 'Prior State (Input)' : 'Post State (Output)')
                    }
                  </span>
                  {placeValues.has(selectedNode.id) && (
                    <span className={styles['computed-badge']}>
                      Value: <strong>{placeValues.get(selectedNode.id)}</strong>
                    </span>
                  )}
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
                            {attr.quantifier && (
                              <span className={`${styles['attr-tag']} ${styles['attr-tag-quantifier']}`}>{attr.quantifier}</span>
                            )}
                            {attr.adverb && (
                              <span className={`${styles['attr-tag']} ${styles['attr-tag-adverb']}`}>{attr.adverb}</span>
                            )}
                            {attr.modality && (
                              <span className={`${styles['attr-tag']} ${styles['attr-tag-modality']}`}>{attr.modality}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.relations.length > 0 && (
                      <ul>
                        {section.relations.map((rel) => (
                          <li key={rel.id}>
                            <strong>{rel.name}</strong>{rel.weight > 1 ? ` ${circledNumber(rel.weight)}` : ''} &rarr; {rel.target_id}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
            )}
          </div>
        )}

        {/* Accounting balance summary table */}
        {isAccountingMode && marking.size > 0 && (
          <div className={styles['balance-summary']}>
            <h4>Account Balances</h4>
            <table className={styles['balance-table']}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th className={styles['balance-amount']}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {graphData.nodes
                  .filter((n) => !isTransitionRole(n.role))
                  .map((n) => {
                    const balance = marking.get(n.id) ?? 0
                    return (
                      <tr key={n.id} className={balance < 0 ? styles['negative-balance'] : undefined}>
                        <td>{n.name}</td>
                        <td>
                          <span className={styles['account-type-badge']}>{n.role}</span>
                        </td>
                        <td className={styles['balance-amount']}>{currencySymbol}{balance.toFixed(2)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
            {/* Accounting equation summary */}
            {(() => {
              const accountNodes = graphData.nodes.filter((n) => !isTransitionRole(n.role))
              const hasTypedAccounts = accountNodes.some((n) =>
                ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].includes(n.role)
              )
              if (!hasTypedAccounts) return null
              const sum = (roles: string[]) =>
                accountNodes
                  .filter((n) => roles.includes(n.role))
                  .reduce((s, n) => s + (marking.get(n.id) ?? 0), 0)
              const assets = sum(['Asset'])
              const liabilities = sum(['Liability'])
              const equity = sum(['Equity'])
              const revenue = sum(['Revenue'])
              const expenses = sum(['Expense'])
              return (
                <div className={styles['accounting-equation']}>
                  <span>Assets: <strong>{currencySymbol}{assets.toFixed(2)}</strong></span>
                  <span> = </span>
                  <span>Liabilities: <strong>{currencySymbol}{liabilities.toFixed(2)}</strong></span>
                  <span> + </span>
                  <span>Equity: <strong>{currencySymbol}{equity.toFixed(2)}</strong></span>
                  {(revenue > 0 || expenses > 0) && (
                    <>
                      <span> + </span>
                      <span>Revenue: <strong>{currencySymbol}{revenue.toFixed(2)}</strong></span>
                      <span> - </span>
                      <span>Expenses: <strong>{currencySymbol}{expenses.toFixed(2)}</strong></span>
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </AsyncLoadingBoundary>
  )
}
