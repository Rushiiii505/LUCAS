#!/usr/bin/env bash
set -e

echo "========================================="
echo "   Lucas AI Platform — Setup Script"
echo "   Target: Raspberry Pi 5 / macOS / Linux"
echo "========================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check Python 3
if command -v python3.11 &>/dev/null; then
    PYTHON_CMD=python3.11
elif command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
else
    echo "Error: python3 is required but not installed." >&2
    exit 1
fi

echo "[1/4] Using Python: $($PYTHON_CMD --version)"

# Check Node & npm
if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
    echo "Error: Node.js and npm are required to build frontend assets." >&2
    exit 1
fi
echo "[2/4] Using Node: $(node --version), npm: $(npm --version)"

# Setup Python venv
echo "[3/4] Setting up Python virtual environment..."
if [ ! -d "backend/venv" ]; then
    $PYTHON_CMD -m venv backend/venv
fi
backend/venv/bin/pip install --upgrade pip
backend/venv/bin/pip install -r backend/requirements.txt

# Setup Frontend & Build Production Assets
echo "[4/4] Installing frontend dependencies & building production bundle..."
cd frontend
npm install
npm run build
cd "$PROJECT_ROOT"

# Create directories and default .env if not exists
mkdir -p data/uploads data/vectors
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
fi

echo "========================================="
echo " Lucas setup complete!"
echo " Run 'make start' or './scripts/run.sh' to start Lucas."
echo " Access locally at http://localhost:8000"
echo " Or across LAN at http://<your-pi-ip>:8000"
echo "========================================="
