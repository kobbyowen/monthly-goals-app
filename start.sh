#!/usr/bin/env bash
set -euo pipefail

echo "Starting deploy script for sprint-app"

# Ensure node/npm available
if ! command -v node >/dev/null 2>&1; then
  echo "node not found in PATH. Install Node.js first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found in PATH. Install Node.js/npm first." >&2
  exit 1
fi

# Do not set NODE_ENV=production yet — devDependencies are required for build
echo "Installing dependencies..."
echo "Cleaning previous build artifacts and local caches..."

# remove Next.js build output and some common cache directories
rm -rf .next .next/cache .next/static out dist
rm -rf node_modules/.cache .cache .parcel-cache .vercel .turbo

# attempt to clean npm cache (non-fatal)
npm cache clean --force || true

npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Apply DB migrations (run with production config)
echo "Applying SQL migrations..."
NODE_ENV=production node server/migrate.js

# Build Next.js app (use production config)
echo "Building Next.js app..."
NODE_ENV=production npm run build

echo "Starting app (production)..."

export NODE_ENV=production
PORT=${SPRINT_APP_PORT:-2200}

echo "Starting app (production) on port $PORT..."

# 🔥 OPTION B — replace shell with Next.js process
exec PORT="$PORT" NODE_ENV=production npm run start
