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

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Apply DB migrations (server/migrate.js will run all migrations)
echo "Applying SQL migrations..."
node server/migrate.js

# Build Next.js app
echo "Building Next.js app..."
npm run build

# Start in production mode
echo "Starting app (production)..."
NODE_ENV=production npm run start
