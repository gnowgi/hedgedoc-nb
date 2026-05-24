/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class Logger {
  constructor(private readonly scope: string) {}

  info(...args: unknown[]): void {
    console.info(`[${this.scope}]`, ...args)
  }

  warn(...args: unknown[]): void {
    console.warn(`[${this.scope}]`, ...args)
  }

  error(...args: unknown[]): void {
    console.error(`[${this.scope}]`, ...args)
  }

  debug(...args: unknown[]): void {
    console.debug(`[${this.scope}]`, ...args)
  }
}
