# Deploy HedgeDoc with nodeBook Extension

This guide is meant to be executed by Claude Code on the VPS. Run: `Read DEPLOY.md and execute the plan`

## Prerequisites

- VPS with Docker and Docker Compose installed
- Node 24 available (for local build testing; Docker uses Node 24.12.0-alpine internally)
- Domain pointed to the VPS IP (or use IP directly for testing)

---

## Step 1: Clone and Verify Build

```bash
git clone https://github.com/gnowgi/hedgedoc-nb.git
cd hedgedoc-nb
```

Run `yarn install && yarn build` to verify TypeScript compilation. Fix any build errors in the nodeBook extension files (parser files ported from JS→TS are the most likely source of issues).

---

## Step 2: Landing Page Redirect

**File:** `frontend/next.config.js` (lines 88-95)

Change the root redirect from `/login` to `/n/nodeBook`:

```js
// Current:
redirects: () => {
    return Promise.resolve([
      {
        source: '/',
        destination: '/login',
        permanent: true
      }
    ])
  },

// Change to:
redirects: () => {
    return Promise.resolve([
      {
        source: '/',
        destination: '/n/nodeBook',
        permanent: false
      }
    ])
  },
```

Using `permanent: false` (302) so it can be changed later without browser cache issues.

---

## Step 3: Create Seed Note Content Files

These are markdown files that will be seeded into the database as demo notes.

### Create: `backend/src/database/seeds/notes/features.md`

A HedgeDoc markdown features demo page with:
- Headings, bold/italic, lists, tables, code blocks, blockquotes
- A link to the nodeBook demo: `[nodeBook Knowledge Graphs](/n/nodeBook)`
- Math blocks, task lists, and other HedgeDoc-supported features

### Create: `backend/src/database/seeds/notes/nodebook_demo.md`

A working nodeBook CNL demo with a ` ```nodeBook ` code fence. Example content:

````markdown
# nodeBook Knowledge Graph Demo

This note demonstrates the **nodeBook** extension for HedgeDoc. The code fence below defines a knowledge graph using Controlled Natural Language (CNL).

```nodeBook
# Hydrogen [Element]
has number of protons: 1;
has number of electrons: 1;
has number of neutrons: 0;

## Hydrogen ion
has number of protons: 1;
has number of neutrons: 0;
has number of electrons: 0;
<part of> Water;

# Oxygen [Element]
has number of protons: 8;
has number of electrons: 8;

## Oxide ion
has number of protons: 8;
has number of electrons: 10;
<part of> Water;

# Water [Molecule]
has chemical formula: H2O;

# Combustion [Transition]
<has prior_state> Hydrogen;
<has prior_state> Oxygen;
<has post_state> Water;
```

## How to use

- **Click** a node to see its details, attributes, and morph states
- **Switch morphs** using the radio buttons in the detail panel
- **Simulate transitions** by clicking a Transition node and pressing "Simulate"
- **Pan/zoom** with mouse wheel, **drag** nodes to rearrange
- **Export** the graph as PNG or SVG using the buttons above the graph
````

---

## Step 4: Modify Seed Script to Include New Notes

**File:** `backend/src/database/seeds/03_note.ts`

Add two new notes (features + nodeBook) following the existing pattern:
- Add UUIDs for the new revisions
- Read the new markdown files with `readFileSync`
- Insert notes with `publiclyVisible: true`
- Insert aliases: `features` and `nodeBook` (both `isPrimary: true`)
- Insert revisions, authorship, tags
- Insert group permissions: `_EVERYONE` group (groupId: 1) with `canEdit: false`

---

## Step 5: Production Seed Script (API-based)

Seeds only run in development mode. For production Docker deployment, create an API-based seed script.

### Create: `docker/seed-notes.sh`

```bash
#!/bin/bash
# Usage: ./seed-notes.sh <base-url> <api-token>
# Example: ./seed-notes.sh https://hedgedoc.example.com abc123

BASE_URL="$1"
TOKEN="$2"
API="${BASE_URL}/api/v2/notes"

if [ -z "$BASE_URL" ] || [ -z "$TOKEN" ]; then
  echo "Usage: $0 <base-url> <api-token>"
  exit 1
fi

for file in seed-content/*.md; do
  alias=$(basename "$file" .md)
  echo "Creating note: $alias"

  # Create the note with alias
  curl -s -X POST "${API}/${alias}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: text/markdown" \
    --data-binary "@${file}"

  # Make it publicly visible
  curl -s -X PUT "${API}/${alias}/metadata/permissions/visibility" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"newPubliclyVisible": true}'

  # Grant read access to everyone (group: _EVERYONE)
  curl -s -X PUT "${API}/${alias}/metadata/permissions/groups/_EVERYONE" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"canEdit": false}'

  echo " -> done"
done
```

### Create: `docker/seed-content/features.md` and `docker/seed-content/nodebook_demo.md`

Same content as the dev seed files from Step 3, but named to match the desired URL aliases:
- `features.md` → creates note at `/n/features`
- `nodeBook.md` → creates note at `/n/nodeBook`

Note: the seed script uses the filename (minus `.md`) as the alias, so the nodeBook file must be named `nodeBook.md`.

---

## Step 6: Docker Configuration

### Modify: `docker/docker-compose.yml`

Replace `image:` directives with `build:` for backend and frontend:

```yaml
services:
  backend:
    build:
      context: ..
      dockerfile: backend/docker/Dockerfile
    volumes:
      - ./.env:/usr/src/app/backend/.env
      - hedgedoc_uploads:/usr/src/app/backend/uploads

  frontend:
    build:
      context: ..
      dockerfile: frontend/docker/Dockerfile
    environment:
      HD_BASE_URL: "${HD_BASE_URL}"

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: "${HD_DATABASE_USERNAME}"
      POSTGRES_PASSWORD: "${HD_DATABASE_PASSWORD}"
      POSTGRES_DB: "${HD_DATABASE_NAME}"

  proxy:
    image: caddy:latest
    restart: unless-stopped
    environment:
      HD_BASE_URL: "${HD_BASE_URL}"
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  hedgedoc_uploads:
  caddy_data:
```

### Modify: `docker/.env`

Update for production:
- `HD_BASE_URL` → actual domain (e.g., `https://hedgedoc.yourdomain.com`)
- `HD_SESSION_SECRET` → generate with `openssl rand -hex 32`
- `HD_DATABASE_PASSWORD` → generate with `openssl rand -hex 16`
- Add `HD_AUTH_LOCAL_ENABLE_LOGIN="true"`
- Add `HD_AUTH_LOCAL_ENABLE_REGISTER="true"`

### Modify Docker labels

**`backend/docker/Dockerfile`** and **`frontend/docker/Dockerfile`**:
- Change `image.source` label → `https://github.com/gnowgi/hedgedoc-nb`
- Change `image.title` label → `HedgeDoc-NB production backend/frontend image`

---

## Step 7: Build and Deploy

```bash
cd docker/
docker compose up -d --build
```

Fix any Docker build errors that surface. The Docker build uses Node 24.12.0-alpine internally, so Node version won't be an issue.

---

## Step 8: Post-Deploy Setup

1. Register an admin user via the UI at `https://domain/register`
2. Generate an API token from the profile page (Profile → Access Tokens)
3. Run the seed script:
   ```bash
   cd docker/
   chmod +x seed-notes.sh
   ./seed-notes.sh https://domain <api-token>
   ```
4. Verify:
   - Landing page (`/`) redirects to `/n/nodeBook` with rendered graph
   - `/n/features` shows the markdown features demo
   - nodeBook code fence renders a Cytoscape.js graph with interactive nodes

---

## Step 9: Commit and Push

```bash
git add -A
git commit -m "feat: configure deployment with nodeBook landing page and seed notes"
git push origin main
```

---

## Files Summary

| File | Action |
|------|--------|
| `frontend/next.config.js` | MODIFY — redirect `/` → `/n/nodeBook` |
| `backend/src/database/seeds/03_note.ts` | MODIFY — add features + nodeBook seed notes |
| `backend/src/database/seeds/notes/features.md` | CREATE — features demo content |
| `backend/src/database/seeds/notes/nodebook_demo.md` | CREATE — CNL demo content |
| `docker/seed-notes.sh` | CREATE — production API seed script |
| `docker/seed-content/features.md` | CREATE — production seed content |
| `docker/seed-content/nodeBook.md` | CREATE — production seed content |
| `docker/docker-compose.yml` | MODIFY — build from source |
| `docker/.env` | MODIFY — production config |
| `backend/docker/Dockerfile` | MODIFY — update labels |
| `frontend/docker/Dockerfile` | MODIFY — update labels |

## Verification Checklist

- [ ] `yarn build` — TypeScript compilation passes
- [ ] `docker compose up --build` — full Docker build succeeds
- [ ] Visit `/` → redirects to `/n/nodeBook`
- [ ] nodeBook code fence renders a Cytoscape.js graph
- [ ] Visit `/n/features` → markdown features demo with link to nodeBook
- [ ] Repo accessible at `https://github.com/gnowgi/hedgedoc-nb`
