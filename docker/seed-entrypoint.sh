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

# --- Helper: extract frontmatter fields from a markdown file ---
extract_frontmatter() {
  local file="$1" field="$2"
  sed -n '/^---$/,/^---$/{ /^'"$field"': */{ s/^'"$field"': *//; p; } }' "$file"
}

# --- Helper: extract tags from frontmatter ---
extract_tags() {
  sed -n '/^---$/,/^---$/{
    /^tags:/,/^[^ ]/{
      /^  *- /{ s/^  *- *//; p; }
    }
  }' "$1"
}

# --- Helper: build revision + tag INSERT SQL ---
# Appends to the file at $sql. Expects v_note_id to be set in the PL/pgSQL scope.
build_revision_sql() {
  local file="$1" rev_uuid="$2" title="$3" description="$4"

  echo "  INSERT INTO revision (uuid, note_id, patch, content, title, description, note_type, created_at) VALUES (" >> "$sql"
  echo "    '${rev_uuid}'::uuid, v_note_id, ''," >> "$sql"

  # Content: PostgreSQL dollar-quoting ($seed$...$seed$) with raw cat (no shell expansion)
  printf '    $seed$' >> "$sql"
  cat "$file" >> "$sql"
  printf '$seed$,\n' >> "$sql"

  # Title: dollar-quoted
  printf '    $t$' >> "$sql"
  printf '%s' "$title" >> "$sql"
  printf '$t$,\n' >> "$sql"

  # Description: dollar-quoted
  printf '    $d$' >> "$sql"
  printf '%s' "$description" >> "$sql"
  printf '$d$,\n' >> "$sql"

  cat >> "$sql" <<'HEREDOC'
    'document',
    NOW()
  );
HEREDOC

  # Tags
  extract_tags "$file" | while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    escaped_tag=$(printf '%s' "$tag" | sed "s/'/''/g")
    echo "  INSERT INTO revision_tag (revision_id, tag) VALUES ('${rev_uuid}'::uuid, '${escaped_tag}');" >> "$sql"
  done
}

# --- Step 4: Seed notes from /seed-content/*.md (upsert) ---
for file in /seed-content/*.md; do
  alias_name=$(basename "$file" .md)

  title=$(extract_frontmatter "$file" "title")
  description=$(extract_frontmatter "$file" "description")
  [ -z "$title" ] && title="$alias_name"
  [ -z "$description" ] && description=""

  rev_uuid=$(cat /proc/sys/kernel/random/uuid)

  # Check if note already exists
  NOTE_ID=$(psql -t -A -c "SELECT note_id FROM alias WHERE alias = '${alias_name}' LIMIT 1;")

  if [ -n "$NOTE_ID" ]; then
    # --- UPSERT path: note exists, check if content changed ---
    # Compare MD5 of file vs latest revision content
    file_md5=$(md5sum "$file" | awk '{print $1}')
    db_md5=$(psql -t -A -c "SELECT md5(content) FROM revision WHERE note_id = ${NOTE_ID} ORDER BY created_at DESC LIMIT 1;")

    if [ "$file_md5" = "$db_md5" ]; then
      echo "[seed] Note '${alias_name}' is up to date, skipping."
      continue
    fi

    echo "[seed] Note '${alias_name}' has changed, updating..."

    sql=$(mktemp)

    cat > "$sql" <<HEREDOC
DO \$fn\$
DECLARE
  v_note_id integer := ${NOTE_ID};
BEGIN
HEREDOC

    build_revision_sql "$file" "$rev_uuid" "$title" "$description"

    cat >> "$sql" <<'HEREDOC'
END
$fn$;
HEREDOC

    psql -v ON_ERROR_STOP=1 -f "$sql"
    rm -f "$sql"

    echo "[seed] Updated note: ${alias_name}"

  else
    # --- INSERT path: new note ---
    sql=$(mktemp)

    cat > "$sql" <<'HEREDOC'
DO $fn$
DECLARE
  v_note_id integer;
BEGIN
HEREDOC

    echo "  INSERT INTO note (owner_id, version, created_at, publicly_visible) VALUES (${USER_ID}, 2, NOW(), true);" >> "$sql"

    cat >> "$sql" <<'HEREDOC'
  SELECT currval(pg_get_serial_sequence('note', 'id')) INTO v_note_id;
HEREDOC

    echo "  INSERT INTO alias (alias, note_id, is_primary) VALUES ('${alias_name}', v_note_id, true);" >> "$sql"

    build_revision_sql "$file" "$rev_uuid" "$title" "$description"

    if [ -n "$EVERYONE_GID" ]; then
      echo "  INSERT INTO note_group_permission (note_id, group_id, can_edit) VALUES (v_note_id, ${EVERYONE_GID}, false);" >> "$sql"
    fi

    cat >> "$sql" <<'HEREDOC'
END
$fn$;
HEREDOC

    psql -v ON_ERROR_STOP=1 -f "$sql"
    rm -f "$sql"

    echo "[seed] Created note: ${alias_name}"
  fi
done

echo "[seed] All notes seeded successfully."
