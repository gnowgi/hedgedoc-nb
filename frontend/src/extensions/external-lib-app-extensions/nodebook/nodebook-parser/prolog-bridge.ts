/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { MergedSchemas } from './schema-store'
import type { CnlGraphData, CnlQuery, QueryBindings, QueryResult } from './types'

let plInstance: { create(limit?: number): TauSession } | null = null

interface TauSession {
  consult(program: string, options?: { success?: () => void; error?: (err: unknown) => void }): void
  query(goal: string, options?: { success?: (goal: unknown) => void; error?: (err: unknown) => void }): void
  answer(options: { success?: (answer: TauAnswer | false) => void; error?: (err: unknown) => void; fail?: () => void; limit?: number }): void
  format_answer(answer: TauAnswer): string
}

interface TauAnswer {
  id: string
  links: Record<string, { id: string; toJavaScript: () => unknown }>
}

/**
 * Lazily load and cache the tau-prolog module.
 * Uses dynamic import with webpackChunkName for code splitting.
 */
async function getTauProlog(): Promise<typeof plInstance> {
  if (plInstance) return plInstance
  const mod = await import(/* webpackChunkName: "tau-prolog" */ 'tau-prolog')
  plInstance = mod.default as unknown as typeof plInstance
  return plInstance
}

/** Escape a string for use as a Prolog atom (single-quoted, escaping internal quotes). */
function prologAtom(s: string): string {
  const escaped = s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${escaped}'`
}

/**
 * Generate a Prolog program string from CnlGraphData and merged schemas.
 * Produces facts for nodes, explicit relations, attributes, types, and schema metadata,
 * plus derived rules for transitive closure, symmetry, inverse, and membership inheritance.
 */
export function generatePrologProgram(graphData: CnlGraphData, schemas: MergedSchemas): string {
  const lines: string[] = []

  // Node facts: node(Id, Name, Role)
  for (const node of graphData.nodes) {
    lines.push(`node(${prologAtom(node.id)}, ${prologAtom(node.name)}, ${prologAtom(node.role)}).`)
  }

  // Explicit relation facts: explicit_relation(Source, Target, RelName)
  for (const edge of graphData.edges) {
    lines.push(`explicit_relation(${prologAtom(edge.source_id)}, ${prologAtom(edge.target_id)}, ${prologAtom(edge.name)}).`)
  }

  // Attribute facts: attribute(NodeId, AttrName, Value)
  for (const attr of graphData.attributes) {
    lines.push(`attribute(${prologAtom(attr.source_id)}, ${prologAtom(attr.name)}, ${prologAtom(attr.value)}).`)
    if (attr.unit) {
      lines.push(`attribute_unit(${prologAtom(attr.source_id)}, ${prologAtom(attr.name)}, ${prologAtom(attr.unit)}).`)
    }
  }

  // Type facts: has_type(NodeId, TypeName)
  for (const node of graphData.nodes) {
    lines.push(`has_type(${prologAtom(node.id)}, ${prologAtom(node.role)}).`)
  }

  // Schema metadata facts
  for (const rel of schemas.relationTypes) {
    if (rel.transitive) {
      lines.push(`transitive(${prologAtom(rel.name)}).`)
    }
    if (rel.symmetric) {
      lines.push(`symmetric(${prologAtom(rel.name)}).`)
    }
    if (rel.inverse_name) {
      lines.push(`inverse(${prologAtom(rel.name)}, ${prologAtom(rel.inverse_name)}).`)
    }
  }

  // Derived rules for relation/3
  lines.push('')
  lines.push('% Base case: explicit relations are relations')
  lines.push('relation(X, Y, R) :- explicit_relation(X, Y, R).')
  lines.push('')
  lines.push('% Transitive closure')
  lines.push('relation(X, Z, R) :- transitive(R), explicit_relation(X, Y, R), relation(Y, Z, R), X \\= Z, X \\= Y.')
  lines.push('')
  lines.push('% Symmetric relations')
  lines.push('relation(X, Y, R) :- symmetric(R), explicit_relation(Y, X, R).')
  lines.push('')
  lines.push('% Inverse relations')
  lines.push('relation(X, Y, Inv) :- inverse(R, Inv), explicit_relation(Y, X, R).')
  lines.push('')
  lines.push('% Membership inheritance: member_of(X,A) + is_a(A,B) => member_of(X,B)')
  lines.push(`relation(X, B, 'member_of') :- explicit_relation(X, A, 'member_of'), relation(A, B, 'is_a'), X \\= B.`)
  lines.push('')
  lines.push('% Instance inheritance: instance_of(X,A) + is_a(A,B) => instance_of(X,B)')
  lines.push(`relation(X, B, 'instance_of') :- explicit_relation(X, A, 'instance_of'), relation(A, B, 'is_a'), X \\= B.`)

  return lines.join('\n')
}

/** Promise wrapper for session.consult(). */
function consultAsync(session: TauSession, program: string): Promise<void> {
  return new Promise((resolve, reject) => {
    session.consult(program, {
      success: () => resolve(),
      error: (err) => reject(err)
    })
  })
}

/** Promise wrapper for session.query(). */
function queryAsync(session: TauSession, goal: string): Promise<void> {
  return new Promise((resolve, reject) => {
    session.query(goal, {
      success: () => resolve(),
      error: (err) => reject(err)
    })
  })
}

/** Collect all answers from a query up to a limit. */
function collectAnswers(session: TauSession, limit: number): Promise<{ formatted: string[]; raw: TauAnswer[] }> {
  return new Promise((resolve) => {
    const formatted: string[] = []
    const raw: TauAnswer[] = []

    function nextAnswer(): void {
      if (formatted.length >= limit) {
        resolve({ formatted, raw })
        return
      }
      session.answer({
        success: (answer) => {
          if (answer === false) {
            resolve({ formatted, raw })
            return
          }
          formatted.push(session.format_answer(answer))
          raw.push(answer)
          nextAnswer()
        },
        error: () => resolve({ formatted, raw }),
        fail: () => resolve({ formatted, raw })
      })
    }

    nextAnswer()
  })
}

/**
 * Parse a formatted Prolog answer like "X = val, Y = val2 ;" into a QueryBindings object.
 * Tau Prolog format_answer returns strings like:
 * - "X = foo, Y = bar ;" (with substitutions)
 * - "true ;" (for ground queries)
 */
function parseFormattedAnswer(formatted: string): QueryBindings {
  const bindings: QueryBindings = {}
  // Remove trailing " ;" or " ."
  const cleaned = formatted.replace(/\s*[;.]\s*$/, '').trim()
  if (cleaned === 'true' || cleaned === '') return bindings

  // Split on ", " but be careful with nested terms
  const parts = cleaned.split(/,\s*(?=[A-Z_]\w*\s*=)/)
  for (const part of parts) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) continue
    const varName = part.slice(0, eqIdx).trim()
    const value = part.slice(eqIdx + 1).trim()
    bindings[varName] = value
  }
  return bindings
}

/**
 * Execute Prolog queries against the graph data.
 * End-to-end: generate program, consult, then run each query.
 */
export async function executePrologQueries(
  graphData: CnlGraphData,
  schemas: MergedSchemas,
  queries: CnlQuery[],
  limit = 50
): Promise<QueryResult[]> {
  const pl = await getTauProlog()
  if (!pl) throw new Error('Failed to load tau-prolog')

  const session = pl.create(limit * 1000) // inference limit
  const program = generatePrologProgram(graphData, schemas)

  await consultAsync(session, program)

  const results: QueryResult[] = []
  for (const query of queries) {
    try {
      // Ensure goal ends with a period
      const goal = query.goalString.endsWith('.') ? query.goalString : query.goalString + '.'
      await queryAsync(session, goal)
      const { formatted } = await collectAnswers(session, limit)

      const bindings = formatted.map(parseFormattedAnswer)
      results.push({
        queryId: query.id,
        goalString: query.goalString,
        displayString: query.displayString,
        bindings,
        error: null,
        timedOut: false
      })
    } catch (err) {
      const errMsg = String(err)
      results.push({
        queryId: query.id,
        goalString: query.goalString,
        displayString: query.displayString,
        bindings: [],
        error: errMsg,
        timedOut: errMsg.includes('limit')
      })
    }
  }

  return results
}

/**
 * Query all inferred relation(X, Y, R) from the Prolog engine.
 * Returns edges that are not in the explicit set.
 */
export async function queryInferredRelations(
  graphData: CnlGraphData,
  schemas: MergedSchemas,
  limit = 200
): Promise<Array<{ source: string; target: string; relation: string }>> {
  const pl = await getTauProlog()
  if (!pl) throw new Error('Failed to load tau-prolog')

  const session = pl.create(limit * 1000)
  const program = generatePrologProgram(graphData, schemas)
  await consultAsync(session, program)

  // Query all relation(X, Y, R) facts
  await queryAsync(session, 'relation(X, Y, R).')
  const { raw } = await collectAnswers(session, limit)

  // Build set of explicit edges for filtering
  const explicitKeys = new Set<string>()
  for (const edge of graphData.edges) {
    explicitKeys.add(`${edge.source_id}|${edge.target_id}|${edge.name}`)
  }

  const inferred: Array<{ source: string; target: string; relation: string }> = []
  for (const answer of raw) {
    const x = answer.links['X']?.toJavaScript?.()
    const y = answer.links['Y']?.toJavaScript?.()
    const r = answer.links['R']?.toJavaScript?.()
    if (typeof x === 'string' && typeof y === 'string' && typeof r === 'string') {
      const key = `${x}|${y}|${r}`
      if (!explicitKeys.has(key)) {
        inferred.push({ source: x, target: y, relation: r })
      }
    }
  }

  return inferred
}
