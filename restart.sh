#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Restarting app (using start.sh)..."

# Stop (best-effort)
bash "$DIR/stop.sh" || true

sleep 1

# Start in background with nohup so this script returns immediately
if command -v nohup >/dev/null 2>&1; then
  nohup bash "$DIR/start.sh" >/dev/null 2>&1 &
  echo "Launched start.sh (PID $!)."
else
  # Fallback: run start.sh in background
  bash "$DIR/start.sh" &
  echo "Launched start.sh (PID $!)."
fi

exit 0
