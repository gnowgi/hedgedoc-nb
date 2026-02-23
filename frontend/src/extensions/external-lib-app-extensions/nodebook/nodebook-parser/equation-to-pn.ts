/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlOperation } from './types'

/** Counter for generating unique operator and result place IDs */
let opCounter = 0

/** Map operator symbols to readable names */
const OP_NAMES: Record<string, string> = {
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '/': 'div',
  '^': 'pow'
}

interface WalkResult {
  placeId: string
  ops: CnlOperation[]
}

/**
 * Recursively walk a math.js AST node, emitting CnlOperations for each operator
 * and returning the place ID of the result.
 */
function walkNode(node: Record<string, unknown>): WalkResult {
  const type = node.type as string

  if (type === 'SymbolNode') {
    // Leaf: a variable reference — create an input place node
    const name = node.name as string
    const placeId = name.toLowerCase().replace(/\s+/g, '_')
    return {
      placeId,
      ops: [
        {
          type: 'addNode',
          payload: {
            base_name: name,
            displayName: name,
            role: 'class',
            options: { adjective: null }
          },
          id: placeId
        }
      ]
    }
  }

  if (type === 'ConstantNode') {
    // Leaf: a numeric constant — create a place with a value attribute
    const value = node.value as number
    opCounter++
    const placeId = `_const_${opCounter}`
    return {
      placeId,
      ops: [
        {
          type: 'addNode',
          payload: {
            base_name: String(value),
            displayName: String(value),
            role: 'class',
            options: { adjective: null }
          },
          id: placeId
        },
        {
          type: 'addAttribute',
          payload: { source: placeId, name: 'value', value: String(value) },
          id: `attr_${placeId}_value`
        }
      ]
    }
  }

  if (type === 'OperatorNode') {
    const op = node.op as string
    const args = node.args as Record<string, unknown>[]
    const opName = OP_NAMES[op] ?? op
    opCounter++

    // Recursively process operands
    const childResults = args.map(walkNode)
    const allOps: CnlOperation[] = []
    for (const child of childResults) {
      allOps.push(...child.ops)
    }

    // Create the Function transition for this operator
    const transitionId = `_op_${opName}_${opCounter}`
    const resultId = `_result_${opName}_${opCounter}`

    // Build the expression string from operand place names
    const operandNames = childResults.map((c) => c.placeId)
    const exprString = operandNames.join(` ${op} `)

    allOps.push(
      {
        type: 'addNode',
        payload: {
          base_name: `${opName}${opCounter}`,
          displayName: `${op}`,
          role: 'Function',
          options: { adjective: null, role: 'Function', parent_types: ['Transition'] }
        },
        id: transitionId
      },
      {
        type: 'addNode',
        payload: {
          base_name: `result_${opName}_${opCounter}`,
          displayName: `result`,
          role: 'class',
          options: { adjective: null }
        },
        id: resultId
      },
      {
        type: 'addAttribute',
        payload: { source: transitionId, name: 'definition', value: exprString },
        id: `attr_${transitionId}_definition`
      }
    )

    // Input arcs: each operand place → Function transition
    for (const child of childResults) {
      allOps.push({
        type: 'addRelation',
        payload: { source: transitionId, target: child.placeId, name: 'has prior_state', weight: 1 },
        id: `rel_${transitionId}_input_${child.placeId}`
      })
    }

    // Output arc: Function transition → result place
    allOps.push({
      type: 'addRelation',
      payload: { source: transitionId, target: resultId, name: 'has post_state', weight: 1 },
      id: `rel_${transitionId}_output_${resultId}`
    })

    return { placeId: resultId, ops: allOps }
  }

  if (type === 'ParenthesisNode') {
    const content = node.content as Record<string, unknown>
    return walkNode(content)
  }

  if (type === 'FunctionNode') {
    // Handle function calls like sqrt(), pow(), etc.
    const fnName = node.name as string | undefined
    const fn = node.fn as Record<string, unknown> | undefined
    const name = fnName ?? (fn?.name as string) ?? 'fn'
    const args = node.args as Record<string, unknown>[]
    opCounter++

    const childResults = args.map(walkNode)
    const allOps: CnlOperation[] = []
    for (const child of childResults) {
      allOps.push(...child.ops)
    }

    const transitionId = `_fn_${name}_${opCounter}`
    const resultId = `_result_${name}_${opCounter}`
    const argNames = childResults.map((c) => c.placeId)
    const exprString = `${name}(${argNames.join(', ')})`

    allOps.push(
      {
        type: 'addNode',
        payload: {
          base_name: `${name}${opCounter}`,
          displayName: name,
          role: 'Function',
          options: { adjective: null, role: 'Function', parent_types: ['Transition'] }
        },
        id: transitionId
      },
      {
        type: 'addNode',
        payload: {
          base_name: `result_${name}_${opCounter}`,
          displayName: 'result',
          role: 'class',
          options: { adjective: null }
        },
        id: resultId
      },
      {
        type: 'addAttribute',
        payload: { source: transitionId, name: 'definition', value: exprString },
        id: `attr_${transitionId}_definition`
      }
    )

    for (const child of childResults) {
      allOps.push({
        type: 'addRelation',
        payload: { source: transitionId, target: child.placeId, name: 'has prior_state', weight: 1 },
        id: `rel_${transitionId}_input_${child.placeId}`
      })
    }

    allOps.push({
      type: 'addRelation',
      payload: { source: transitionId, target: resultId, name: 'has post_state', weight: 1 },
      id: `rel_${transitionId}_output_${resultId}`
    })

    return { placeId: resultId, ops: allOps }
  }

  // Unhandled node type — return empty
  return { placeId: '', ops: [] }
}

/**
 * Parse a math expression into a Petri net decomposition.
 * Each operator becomes a [Function] transition with input/output place arcs.
 * Returns CnlOperations that can be merged into an existing graph.
 */
export async function expressionToPetriNetOps(expression: string): Promise<CnlOperation[]> {
  const math = await import(/* webpackChunkName: "mathjs" */ 'mathjs')
  const instance = math.create(math.all, {}) as unknown as { parse: (expr: string) => Record<string, unknown> }
  opCounter = 0

  try {
    const ast = instance.parse(expression) as Record<string, unknown>
    const result = walkNode(ast)
    return result.ops
  } catch {
    return []
  }
}
