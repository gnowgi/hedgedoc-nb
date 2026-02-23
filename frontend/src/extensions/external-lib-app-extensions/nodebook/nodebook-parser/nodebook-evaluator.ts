/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

let mathjsInstance: { evaluate: (expr: string, scope: Record<string, number>) => number; parse: (expr: string) => unknown } | null = null

/**
 * Lazily load and cache a sandboxed math.js instance.
 * Uses dynamic import with webpackChunkName for code splitting.
 */
async function getMathjsInstance(): Promise<typeof mathjsInstance> {
  if (mathjsInstance) return mathjsInstance
  const math = await import(/* webpackChunkName: "mathjs" */ 'mathjs')
  mathjsInstance = math.create(math.all, {}) as unknown as typeof mathjsInstance
  return mathjsInstance
}

/**
 * Evaluate a mathematical expression against a scope of named numeric values.
 * Uses math.js in a sandboxed instance with dynamic import for code splitting.
 *
 * @param expression - The math expression string (e.g., "protons + neutrons")
 * @param scope - A map of variable names to numeric values
 * @returns The computed numeric result, or an error message
 */
export async function evaluateExpression(
  expression: string,
  scope: Record<string, number>
): Promise<{ value: number | null; error: string | null }> {
  try {
    const math = await getMathjsInstance()
    if (!math) return { value: null, error: 'Failed to load math.js' }
    const result = math.evaluate(expression, { ...scope })
    if (typeof result === 'number') {
      return { value: result, error: null }
    }
    if (typeof result === 'object' && result !== null && 'toNumber' in result) {
      return { value: (result as { toNumber: () => number }).toNumber(), error: null }
    }
    return { value: Number(result), error: null }
  } catch (err) {
    return { value: null, error: String(err) }
  }
}

/**
 * Parse a math expression into an AST (for equation-to-PN decomposition).
 */
export async function parseExpression(expression: string): Promise<{ ast: unknown | null; error: string | null }> {
  try {
    const math = await getMathjsInstance()
    if (!math) return { ast: null, error: 'Failed to load math.js' }
    const ast = math.parse(expression)
    return { ast, error: null }
  } catch (err) {
    return { ast: null, error: String(err) }
  }
}
