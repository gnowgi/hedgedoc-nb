#!/bin/sh
# Seed entrypoint: waits for backend, registers a user, creates an API token, then seeds notes.
set -e

BACKEND_URL="http://backend:3000"
SEED_USER="seeder"
SEED_DISPLAY="Seed Bot"
SEED_PASSWORD="seed_password_local_dev"
COOKIE_JAR="/tmp/cookies.txt"

echo "[seed] Waiting for backend to be ready..."
until curl -sf -o /dev/null "${BACKEND_URL}/api/v2/monitoring/health"; do
  sleep 2
done
echo "[seed] Backend is ready."

# 1. Get CSRF token (strip JSON quotes and extract token value)
CSRF=$(curl -s -c "$COOKIE_JAR" "${BACKEND_URL}/api/private/csrf/token" | sed 's/.*"token":"\([^"]*\)".*/\1/')
echo "[seed] Got CSRF token."

# 2. Register a seed user (ignore 409 if user already exists)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "${BACKEND_URL}/api/private/auth/local" \
  -H "Content-Type: application/json" \
  -H "csrf-token: ${CSRF}" \
  -d "{\"username\":\"${SEED_USER}\",\"displayName\":\"${SEED_DISPLAY}\",\"password\":\"${SEED_PASSWORD}\"}")
if [ "$HTTP_CODE" = "201" ]; then
  echo "[seed] Registered seed user."
elif [ "$HTTP_CODE" = "409" ]; then
  echo "[seed] Seed user already exists, logging in."
else
  echo "[seed] Registration returned HTTP ${HTTP_CODE}, attempting login anyway."
fi

# 3. Login to get session cookie
# Re-fetch CSRF since registration may have changed the session
CSRF=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "${BACKEND_URL}/api/private/csrf/token" | sed 's/.*"token":"\([^"]*\)".*/\1/')
LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "${BACKEND_URL}/api/private/auth/local/login" \
  -H "Content-Type: application/json" \
  -H "csrf-token: ${CSRF}" \
  -d "{\"username\":\"${SEED_USER}\",\"password\":\"${SEED_PASSWORD}\"}")
if [ "$LOGIN_CODE" != "201" ] && [ "$LOGIN_CODE" != "200" ]; then
  echo "[seed] Login failed with HTTP ${LOGIN_CODE}, aborting."
  exit 1
fi
echo "[seed] Logged in."

# 4. Create an API token
CSRF=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "${BACKEND_URL}/api/private/csrf/token" | sed 's/.*"token":"\([^"]*\)".*/\1/')
TOKEN_RESPONSE=$(curl -s \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "${BACKEND_URL}/api/private/tokens" \
  -H "Content-Type: application/json" \
  -H "csrf-token: ${CSRF}" \
  -d '{"label":"seed-script"}')

# Extract the secret field (format: hd2.<keyId>.<secret>)
API_TOKEN=$(echo "$TOKEN_RESPONSE" | sed -n 's/.*"secret":"\([^"]*\)".*/\1/p')
if [ -z "$API_TOKEN" ]; then
  echo "[seed] Failed to create API token. Response: ${TOKEN_RESPONSE}"
  exit 1
fi
echo "[seed] Created API token."

# 5. Seed notes using the public API (through backend directly)
API="${BACKEND_URL}/api/v2/notes"

for file in /seed-content/*.md; do
  alias=$(basename "$file" .md)
  echo "[seed] Creating note: ${alias}"

  # Create the note with alias
  curl -s -o /dev/null -X POST "${API}/${alias}" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: text/markdown" \
    --data-binary "@${file}"

  # Make it publicly visible
  curl -s -o /dev/null -X PUT "${API}/${alias}/metadata/permissions/visibility" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"newPubliclyVisible": true}'

  # Grant read access to everyone (group: _EVERYONE)
  curl -s -o /dev/null -X PUT "${API}/${alias}/metadata/permissions/groups/_EVERYONE" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"canEdit": false}'

  echo "[seed]   -> done"
done

echo "[seed] All notes seeded successfully."
