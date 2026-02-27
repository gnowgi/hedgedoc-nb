/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

declare module 'tau-prolog' {
  interface Answer {
    id: string
    substitution: Record<string, { id: string; toJavaScript: () => unknown }>
    links: Record<string, { id: string; toJavaScript: () => unknown }>
  }

  interface Session {
    consult(program: string, options?: { success?: () => void; error?: (err: unknown) => void }): void
    query(goal: string, options?: { success?: (goal: unknown) => void; error?: (err: unknown) => void }): void
    answer(options: {
      success?: (answer: Answer | false) => void
      error?: (err: unknown) => void
      fail?: () => void
      limit?: number
    }): void
    format_answer(answer: Answer): string
  }

  interface PrologModule {
    create(limit?: number): Session
  }

  const pl: PrologModule
  export default pl
}
