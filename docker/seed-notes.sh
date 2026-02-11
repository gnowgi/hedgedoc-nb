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
