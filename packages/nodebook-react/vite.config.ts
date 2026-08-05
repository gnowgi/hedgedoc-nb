/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// Library build for npm publishing. Monorepo consumers (HedgeDoc frontend,
// nodebook-app) import the raw TS sources directly and never use this build.
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      exclude: ['**/*.spec.ts', '**/*.spec.tsx']
    })
  ],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'styles'
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@nodebook/core',
        'cytoscape',
        'cytoscape-elk',
        'cytoscape-svg',
        'react-bootstrap-icons',
        'react-use',
        /^@codemirror\//,
        /^@lezer\//
      ]
    }
  }
})
