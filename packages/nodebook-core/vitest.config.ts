/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Specs import the public API via the package name; resolve it to the
      // local source so tests run without a prior build.
      '@nodebook/core': fileURLToPath(new URL('./src/index.ts', import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts']
  }
})
