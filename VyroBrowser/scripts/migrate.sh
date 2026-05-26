#!/usr/bin/env bash
set -euo pipefail

echo "=== Running Drizzle Migrations ==="

# Load .env if it exists
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL environment variable is required"
  exit 1
fi

pnpm --filter @vyro/api db:migrate

echo "Migrations complete!"
