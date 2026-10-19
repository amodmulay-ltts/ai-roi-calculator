#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required. Install Node.js, then run this script again." >&2
  exit 1
fi

if ! node -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(1)'; then
  echo "Node.js 20 or newer is required." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm 10 or newer is required. Install npm, then run this script again." >&2
  exit 1
fi

NPM_VERSION="$(npm --version)"
if ! node -e 'if (Number(process.argv[1].split(".")[0]) < 10) process.exit(1)' "$NPM_VERSION"; then
  echo "npm 10 or newer is required (found $NPM_VERSION)." >&2
  exit 1
fi

if [[ ! -f node_modules/concurrently/package.json ||
      ! -f node_modules/tsx/package.json ||
      ! -f node_modules/vite/package.json ||
      ! -f node_modules/@ai-roi-calc/engine/package.json ]]; then
  echo "Installing project dependencies..."
  npm install
fi

npm run dev
