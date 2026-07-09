#!/usr/bin/env bash
# Sync CI secrets to GitHub from local .env files (values never echoed).
set -euo pipefail

REPO="${GITHUB_REPO:-Hugoae/aniquizz}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

read_env() {
  local file="$1" key="$2"
  if [[ ! -f "$file" ]]; then return 1; fi
  local line
  line="$(grep -E "^${key}=" "$file" | tail -1 || true)"
  [[ -n "$line" ]] || return 1
  # Strip CR, surrounding whitespace, then surrounding quotes.
  printf '%s' "${line#*=}" \
    | tr -d '\r' \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
          -e 's/^"//' -e 's/"$//' \
          -e "s/^'//" -e "s/'$//"
}

set_secret() {
  local name="$1" value="$2"
  [[ -n "$value" ]] || return 0
  printf '%s' "$value" | gh secret set "$name" -R "$REPO"
  echo "Synced $name"
}

SERVER_ENV="$ROOT/apps/server/.env"
CLIENT_ENV="$ROOT/apps/client/.env"

set_secret DATABASE_URL "$(read_env "$SERVER_ENV" DATABASE_URL || true)"
set_secret SUPABASE_URL "$(read_env "$SERVER_ENV" SUPABASE_URL || true)"
set_secret SUPABASE_SERVICE_ROLE_KEY "$(read_env "$SERVER_ENV" SUPABASE_SERVICE_ROLE_KEY || true)"
set_secret SUPABASE_JWT_SECRET "$(read_env "$SERVER_ENV" SUPABASE_JWT_SECRET || true)"
set_secret TEST_ACCOUNTS_PASSWORD "$(read_env "$SERVER_ENV" TEST_ACCOUNTS_PASSWORD || true)"

set_secret VITE_SUPABASE_URL "$(read_env "$CLIENT_ENV" VITE_SUPABASE_URL || true)"
set_secret VITE_SUPABASE_ANON_KEY "$(read_env "$CLIENT_ENV" VITE_SUPABASE_ANON_KEY || true)"
set_secret VITE_SERVER_URL "$(read_env "$CLIENT_ENV" VITE_SERVER_URL || true)"
set_secret VITE_R2_PUBLIC_URL "$(read_env "$CLIENT_ENV" VITE_R2_PUBLIC_URL || true)"

set_secret E2E_EMAIL "admin@aniquizz.test"
set_secret E2E_PASSWORD "$(read_env "$SERVER_ENV" TEST_ACCOUNTS_PASSWORD || true)"

echo "Done. Run: gh secret list -R $REPO"
