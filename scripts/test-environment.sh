#!/usr/bin/env bash
set -euo pipefail

# Simple test harness: build with Bun first, then (re)build and run the Docker container.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun is not installed or not on PATH." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not on PATH." >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "Installing dependencies with bun..."
bun install --frozen-lockfile

echo "Building the project with bun run build..."
bun run build

echo "Building and starting the Docker test environment (Ctrl+C to stop)..."
docker compose -f docker-compose.test.yml up --build "$@"
