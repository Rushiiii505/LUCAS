#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -d "backend/venv" ]; then
    echo "Virtual environment not found. Please run ./scripts/setup.sh first."
    exit 1
fi

export PYTHONPATH="$PROJECT_ROOT/backend"

# Ensure data directories exist
mkdir -p data/uploads data/vectors

echo "Starting Lucas AI Server on 0.0.0.0:8000..."
exec backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
