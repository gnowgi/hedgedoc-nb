/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { build, context } from 'esbuild'
import { cpSync, mkdirSync , readFileSync, writeFileSync } from 'node:fs'

const watch = process.argv.includes('--watch')

// The vendor bundle runs in the HOST page (loaded via
// logseq.Experiments.loadScripts), so Cytoscape sees the host window/document
// natively. tau-prolog's dependency chain references node builtins behind
// runtime guards; leaving them external is safe in the browser.
// Note: loadScripts resolves relative to the plugin ROOT (not dist/), so the
// vendor bundle lives in ./vendors/ like the fenced-code-plus reference.
const vendorConfig = {
  entryPoints: ['src/vendor-entry.ts'],
  bundle: true,
  format: 'iife',
  outfile: 'vendors/nodebook-dom.js',
  external: ['fs', 'path', 'os', 'crypto', 'child_process'],
  logLevel: 'info'
}

// The plugin bundle runs in Logseq's sandbox iframe. React comes from the
// host at runtime (logseq.Experiments.React), so nothing React-y is bundled.
const mainConfig = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/main.js',
  logLevel: 'info'
}

mkdirSync('dist', { recursive: true })
cpSync('index.html', 'dist/index.html')

if (watch) {
  const [vendorCtx, mainCtx] = await Promise.all([context(vendorConfig), context(mainConfig)])
  await Promise.all([vendorCtx.watch(), mainCtx.watch()])
  console.log('watching…')
} else {
  await Promise.all([build(vendorConfig), build(mainConfig)])
  stripStrict('vendors/nodebook-dom.js')
}

// tau-prolog (bundled via @nodebook/dom) relies on sloppy-mode implicit
// globals; the workspace tsconfig's alwaysStrict makes esbuild hoist
// "use strict" to the bundle top, which would turn those assignments into
// ReferenceErrors. Strip the top-level directive after building.
function stripStrict(file) {
  let code = readFileSync(file, 'utf8')
  if (code.startsWith('"use strict";')) {
    writeFileSync(file, code.slice('"use strict";'.length))
  }
}
