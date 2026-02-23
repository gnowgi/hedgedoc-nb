#!/bin/sh
# Seed entrypoint: waits for backend (ensuring DB migrations have run),
# then inserts seed user + notes directly via psql.
set -e

# postgres:15-alpine doesn't include curl; needed for health check
apk add --no-cache curl > /dev/null 2>&1

echo "[seed] Waiting for backend to be ready (ensures DB migrations have run)..."
until curl -sf -o /dev/null "http://backend:3000/api/v2/monitoring/health"; do
  sleep 2
done
echo "[seed] Backend is ready."

# --- Step 1: Seed user ---
echo "[seed] Ensuring seed user exists..."
psql -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO "user" (username, display_name, author_style, created_at)
VALUES ('seeder', 'Seed Bot', 0, NOW())
ON CONFLICT (username) DO NOTHING;
SQL

USER_ID=$(psql -t -A -c "SELECT id FROM \"user\" WHERE username = 'seeder';")
if [ -z "$USER_ID" ]; then
  echo "[seed] ERROR: Could not find seed user after insert."
  exit 1
fi
echo "[seed] Seed user id = ${USER_ID}"

# --- Step 2: Seed identity with password ---
# Pre-computed Argon2id hash for 'seed_password_local_dev'
# Generated via: @node-rs/argon2 hash('seed_password_local_dev', {memoryCost:19456, timeCost:2, parallelism:1})
SEED_HASH='$argon2id$v=19$m=19456,t=2,p=1$8T0GLBks17kZNBsLPYJLwQ$vJsYfHmodhGHzWzy1geSLaS4WD5HQaufACLoE59SqHw'

# Use printf to safely handle $ characters in the argon2 hash.
# WHERE NOT EXISTS handles idempotency (the unique constraint has a nullable column).
printf "INSERT INTO identity (user_id, provider_type, password_hash, created_at, updated_at) SELECT %d, 'local', '%s', NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM identity WHERE user_id = %d AND provider_type = 'local');\n" "$USER_ID" "$SEED_HASH" "$USER_ID" | psql -v ON_ERROR_STOP=1
echo "[seed] Identity ready."

# --- Step 3: Look up the _EVERYONE group id ---
EVERYONE_GID=$(psql -t -A -c "SELECT id FROM \"group\" WHERE name = '_EVERYONE';")
if [ -z "$EVERYONE_GID" ]; then
  echo "[seed] WARNING: _EVERYONE group not found, skipping group permissions."
fi

# --- Step 4: Seed notes from /seed-content/*.md ---
for file in /seed-content/*.md; do
  alias_name=$(basename "$file" .md)

  # Idempotency: skip if alias already exists
  EXISTING=$(psql -t -A -c "SELECT 1 FROM alias WHERE alias = '${alias_name}' LIMIT 1;")
  if [ "$EXISTING" = "1" ]; then
    echo "[seed] Note '${alias_name}' already exists, skipping."
    continue
  fi

  # Extract frontmatter fields
  title=$(sed -n '/^---$/,/^---$/{ /^title: */{ s/^title: *//; p; } }' "$file")
  description=$(sed -n '/^---$/,/^---$/{ /^description: */{ s/^description: *//; p; } }' "$file")
  [ -z "$title" ] && title="$alias_name"
  [ -z "$description" ] && description=""

  # Generate a revision UUID
  rev_uuid=$(cat /proc/sys/kernel/random/uuid)

  # Build SQL in a temp file to safely embed raw markdown content
  # (avoids shell expansion of $ in KaTeX math, template literals, etc.)
  sql=$(mktemp)

  # -- Open PL/pgSQL block (quoted heredoc: no shell expansion) --
  cat > "$sql" <<'HEREDOC'
DO $fn$
DECLARE
  v_note_id integer;
BEGIN
HEREDOC

  # -- Insert note (dynamic values via echo) --
  echo "  INSERT INTO note (owner_id, version, created_at, publicly_visible) VALUES (${USER_ID}, 2, NOW(), true);" >> "$sql"

  cat >> "$sql" <<'HEREDOC'
  SELECT currval(pg_get_serial_sequence('note', 'id')) INTO v_note_id;
HEREDOC

  # -- Insert alias --
  echo "  INSERT INTO alias (alias, note_id, is_primary) VALUES ('${alias_name}', v_note_id, true);" >> "$sql"

  # -- Insert revision --
  # Start the VALUES clause
  echo "  INSERT INTO revision (uuid, note_id, patch, content, title, description, note_type, created_at) VALUES (" >> "$sql"
  echo "    '${rev_uuid}'::uuid, v_note_id, ''," >> "$sql"

  # Content: use PostgreSQL dollar-quoting ($seed$...$seed$) with raw cat (no shell expansion)
  printf '    $seed$' >> "$sql"
  cat "$file" >> "$sql"
  printf '$seed$,\n' >> "$sql"

  # Title: dollar-quoted to handle any special characters
  printf '    $t$' >> "$sql"
  printf '%s' "$title" >> "$sql"
  printf '$t$,\n' >> "$sql"

  # Description: dollar-quoted
  printf '    $d$' >> "$sql"
  printf '%s' "$description" >> "$sql"
  printf '$d$,\n' >> "$sql"

  # Close VALUES
  cat >> "$sql" <<'HEREDOC'
    'document',
    NOW()
  );
HEREDOC

  # -- Insert tags --
  sed -n '/^---$/,/^---$/{
    /^tags:/,/^[^ ]/{
      /^  *- /{ s/^  *- *//; p; }
    }
  }' "$file" | while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    escaped_tag=$(printf '%s' "$tag" | sed "s/'/''/g")
    echo "  INSERT INTO revision_tag (revision_id, tag) VALUES ('${rev_uuid}'::uuid, '${escaped_tag}');" >> "$sql"
  done

  # -- Grant read access to _EVERYONE group --
  if [ -n "$EVERYONE_GID" ]; then
    echo "  INSERT INTO note_group_permission (note_id, group_id, can_edit) VALUES (v_note_id, ${EVERYONE_GID}, false);" >> "$sql"
  fi

  # -- Close PL/pgSQL block --
  cat >> "$sql" <<'HEREDOC'
END
$fn$;
HEREDOC

  # Execute and clean up
  psql -v ON_ERROR_STOP=1 -f "$sql"
  rm -f "$sql"

  echo "[seed] Created note: ${alias_name}"
done

echo "[seed] All notes seeded successfully."
