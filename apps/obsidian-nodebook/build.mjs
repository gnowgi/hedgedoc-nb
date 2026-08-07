/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { build, context } from 'esbuild'
import { copyFileSync, mkdirSync } from 'node:fs'

const watch = process.argv.includes('--watch')

// Obsidian plugins are CommonJS bundles with 'obsidian' provided by the app.
// tau-prolog's dependency chain references node builtins behind runtime
// guards; leaving them external is safe (they resolve on desktop and are
// never called during rendering).
const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  outfile: 'dist/main.js',
  external: ['obsidian', 'electron', 'fs', 'path', 'os', 'crypto', 'child_process'],
  logLevel: 'info'
}

mkdirSync('dist', { recursive: true })
copyFileSync('manifest.json', 'dist/manifest.json')

if (watch) {
  const ctx = await context(config)
  await ctx.watch()
  console.log('watching…')
} else {
  await build(config)
}
