#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-2200}
echo "Stopping app on port $PORT..."

# Prefer lsof to find processes listening on the port
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti tcp:"$PORT" || true)
  if [ -n "$PIDS" ]; then
    echo "Found processes: $PIDS"
    kill $PIDS || true
    sleep 1
    STILL=$(lsof -ti tcp:"$PORT" || true)
    if [ -n "$STILL" ]; then
      echo "Processes still running, forcing kill: $STILL"
      kill -9 $STILL || true
    fi
    echo "Stopped."
    exit 0
  fi
fi

# Fallback: try to kill by process name (next start / node)
if command -v pgrep >/dev/null 2>&1; then
  if pgrep -f "next start" >/dev/null 2>&1; then
    echo "Killing processes matching 'next start'..."
    pkill -f "next start" || true
    echo "Stopped."
    exit 0
  fi
fi

echo "No running process found for port $PORT or matching 'next start'."
exit 0
