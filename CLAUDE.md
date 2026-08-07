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

### HedgeDoc Monorepo (11 Yarn workspaces)

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
| `packages/nodebook-core` | Pure TypeScript | CNL parser, graph engine, inference, schemas (publishable as `@nodebook/core`) |
| `packages/nodebook-react` | React 18, Cytoscape.js | nodeBook UI components + CodeMirror/hljs language (publishable as `@nodebook/react`) |
| `apps/nodebook-app` | Vite, Tauri, PWA | Standalone nodeBook editor built on the two packages |

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

### nodeBook Packages & Extension

The nodeBook engine and UI are standalone workspace packages; the HedgeDoc frontend only carries thin extension glue.

- **`packages/nodebook-core`** (`@nodebook/core`): CNL parser (`cnl-parser.ts`, FNV-1a hash for IDs), graph builder (`operations-to-graph.ts`, 3-pass: nodes→morphs→neighborhood), `morph-registry.ts`, `validate-operations.ts`, inference engines (transitive closure + tau-prolog), attribute inheritance, schema system, math evaluator, text analyzer. Pure TS, no DOM/React. Unit tests (vitest) are colocated in `src/*.spec.ts`. Build: tsup → `dist/` (ESM+CJS+d.ts).
- **`packages/nodebook-react`** (`@nodebook/react`): `nodebook-graph.tsx` (Cytoscape.js with morph switching + transition simulation), schema display, text analyzer, CodeMirror 6 language + completions, hljs language. Build: Vite lib mode → `dist/` incl. compiled `styles.css`.
- **HedgeDoc glue** (`frontend/src/extensions/external-lib-app-extensions/nodebook/`): `nodebook-markdown-extension.ts`, `nodebook-app-extension.ts` (cheatsheet + autocompletion), sidebar stats; registered in `external-lib-app-extensions.ts`. The frontend consumes package **sources** via `transpilePackages` in `next.config.js`.

Both packages carry `publishConfig` overrides: in the monorepo `main` points at `src/index.ts`; the published npm tarball points at `dist/`. Publishing: `.github/workflows/publish-nodebook-packages.yml` (manual dispatch, needs `NPM_TOKEN` secret).

The code fence prefix is **`nodeBook`** (not `cnl`). CNL is parsed entirely client-side with no backend needed. Full syntax: `docs/nodebook-cnl-spec.md`.

## CNL Syntax Quick Reference

```
# Node Name [Type]              → Creates a node
# **adjective** Node [Type]     → Node with adjective
<relation name> Target;         → Directed edge
attribute: value;               → Node property ("has" prefix optional)
attr: value *unit*;             → Attribute with unit
## morph name                   → Polymorphic state (under a # node)
    attr: value;                → Morph-specific attribute
    <relation> Target;          → Morph-specific relation
```

Graph modes: `markdown`, `mindmap`, `richgraph`, `strictgraph`.

## Deployment

Development happens on a **remote VPS** accessible at **https://nodebook.co.in**.

- **Docker Compose** config: `docker/docker-compose.yml` (backend, frontend, postgres, caddy proxy)
- **Env file**: `docker/.env` (DB creds, base URL, auth config)
- **Caddyfile**: `docker/Caddyfile` (reverse proxy: `/api/*`, `/realtime` → backend:3000; `/*` → frontend:3001)
- **Seed data**: `docker/seed-content/*.md` + `docker/seed-notes.sh <base-url> <api-token>`
- Caddy auto-provisions TLS via Let's Encrypt for `nodebook.co.in`
- Rebuild & deploy: `cd docker && docker compose up --build -d`

### Backend API routes

- **Private API** (session + CSRF): `/api/private/...` (auth, explore, notes CRUD, etc.)
- **Public API** (token-based): `/api/v2/...` (used by seed script)
- CSRF token: `GET /api/private/csrf/token`
- Register: `POST /api/private/auth/local` (body: `{username, displayName, password}`)
- Login: `POST /api/private/auth/local/login` (body: `{username, password}`)

## Environment Notes

- Each code fence extension uses dynamic `import()` with `webpackChunkName` for code splitting, `useAsync` from `react-use` for async loading, and `AsyncLoadingBoundary` for loading states.
- Docker builds use Node 24.12.0-alpine internally.
