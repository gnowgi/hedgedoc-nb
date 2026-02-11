# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **HedgeDoc 2.0** (alpha), a real-time collaborative markdown editor, with a custom **nodeBook** extension that renders Controlled Natural Language (CNL) knowledge graphs inline via ` ```nodeBook ` code fences.

## Build & Development Commands

Requires **Node 24** (see `.nvmrc`) and **Yarn 4.12.0** (via `.yarn/releases/yarn-4.12.0.cjs`).

```bash
yarn install              # Install all workspace dependencies
yarn build                # Production build (all workspaces via Turbo)
yarn start:dev            # Start all services in dev mode
yarn test                 # Run all unit tests (Turbo, concurrency: 1)
yarn test:ci              # Tests with coverage
yarn lint                 # oxlint static analysis (not eslint)
yarn lint:fix             # Auto-fix lint issues
yarn format               # oxfmt formatting check (not prettier)
yarn format:fix           # Auto-format
yarn test:e2e:ci          # Cypress E2E tests (headless Chrome)
yarn test:e2e:open        # Cypress interactive mode
```

Frontend dev server: port **3001**. Backend: NestJS with Fastify.

## Architecture

### HedgeDoc Monorepo (8 Yarn workspaces)

| Workspace | Stack | Purpose |
|-----------|-------|---------|
| `frontend` | Next.js 14, React 18, CodeMirror 6 | Editor UI, markdown rendering |
| `backend` | NestJS 10, Fastify | REST API, auth, realtime |
| `commons` | TypeScript (ESM/CJS dual) | Shared types between front/back |
| `database` | Knex.js | Database migrations |
| `markdown-it-plugins` | markdown-it | Custom plugins (image-size, task-lists, toc) |
| `html-to-react` | domhandler | HTML→React component conversion |
| `dev-reverse-proxy` | — | Local dev proxy |
| `docs` | MkDocs | Documentation site |

Linting uses **oxlint/oxfmt** (Rust-based), not eslint/prettier. Task orchestration via **Turbo**.

### HedgeDoc Extension System

The nodeBook integration uses HedgeDoc's extension architecture. The rendering pipeline is:

**Markdown text → markdown-it → HTML → React components (via replacers)**

Key base classes in `frontend/src/`:

1. **`AppExtension`** (`extensions/_base-classes/app-extension.ts`) — Top-level extension that provides markdown renderer extensions, CodeMirror linters, cheatsheet entries, and autocompletions.

2. **`MarkdownRendererExtension`** (`components/markdown-renderer/extensions/_base-classes/`) — Hooks into markdown-it config, node processing, and component replacement.

3. **`CodeBlockMarkdownRendererExtension`** — Specialized for code fence blocks. Subclass this + return a `CodeBlockComponentReplacer(Component, 'langName')` to handle ` ```langName ` blocks.

4. **`ComponentReplacer`** (`components/markdown-renderer/replace-components/component-replacer.ts`) — Base class for HTML→React replacement. `CodeBlockComponentReplacer` detects `<code data-highlight-language="X">` and passes code to a React component receiving `CodeProps = { code: string }`.

**Registration flow**: Extensions listed in `all-app-extensions.ts` (essential + external) → loaded via `useMarkdownExtensions()` → dynamic imports with webpack code splitting.

### nodeBook Extension (12 files)

All files use the `nodebook-*` prefix, located in `frontend/src/`:

- **Parser** (`extensions/external-lib-app-extensions/nodebook-parser/`): `types.ts`, `schemas.ts`, `cnl-parser.ts` (FNV-1a hash for IDs), `operations-to-graph.ts` (3-pass: nodes→morphs→neighborhood), `morph-registry.ts`, `validate-operations.ts`
- **UI** (`components/markdown-renderer/extensions/nodebook/`): `nodebook-graph.tsx` (Cytoscape.js component with morph switching + transition simulation), `nodebook-graph.module.scss`
- **Extension glue**: `nodebook-markdown-extension.ts`, `nodebook-app-extension.ts` (cheatsheet + autocompletion)
- **Registration**: `external-lib-app-extensions.ts` (modified to include NodeBookAppExtension)
- **Dependencies**: cytoscape, cytoscape-dagre, cytoscape-svg added to `frontend/package.json`

The code fence prefix is **`nodeBook`** (not `cnl`). CNL is parsed entirely client-side with no backend needed.

## CNL Syntax Quick Reference

```
# Node Name [Type]              → Creates a node
# **adjective** Node [Type]     → Node with adjective
<relation name> Target;         → Directed edge
has attribute: value;           → Node property
has attr: value *unit*;         → Attribute with unit
## morph name                   → Polymorphic state (under a # node)
    has attr: value;            → Morph-specific attribute
    <relation> Target;          → Morph-specific relation
```

Graph modes: `markdown`, `mindmap`, `richgraph`, `strictgraph`.

## Environment Notes

- The nodeBook extension build has not been tested yet — build errors are expected, most likely in the parser files (ported from JS to TS).
- Each code fence extension uses dynamic `import()` with `webpackChunkName` for code splitting, `useAsync` from `react-use` for async loading, and `AsyncLoadingBoundary` for loading states.
- Docker builds use Node 24.12.0-alpine internally.
