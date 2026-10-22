.PHONY: all install build start stop status logs test dev clean help

SHELL := /bin/bash
PROJECT_ROOT := $(shell pwd)
PYTHON := $(PROJECT_ROOT)/backend/venv/bin/python3
PYTEST := $(PROJECT_ROOT)/backend/venv/bin/pytest
UVICORN := $(PROJECT_ROOT)/backend/venv/bin/uvicorn

all: build

help:
	@echo "Lucas AI Platform — Makefile Commands:"
	@echo "  make install  - Setup virtualenv, install Python and Node dependencies"
	@echo "  make build    - Build production frontend bundle into frontend/dist"
	@echo "  make start    - Run Lucas production server on 0.0.0.0:8000"
	@echo "  make dev      - Start backend and frontend simultaneously for development"
	@echo "  make stop     - Stop background Lucas server"
	@echo "  make status   - Check server health and Ollama connection status"
	@echo "  make logs     - View application logs"
	@echo "  make test     - Run automated test suite"
	@echo "  make clean    - Remove build artifacts, pycache, and temp files"

install:
	./scripts/setup.sh

build:
	cd frontend && npm run build

start:
	./scripts/run.sh

stop:
	@pkill -f "uvicorn app.main:app" || echo "No running Lucas instance found."

status:
	@curl -s http://127.0.0.1:8000/api/health | python3 -m json.tool || echo "Lucas server is not responding at http://127.0.0.1:8000"

test:
	cd backend && ./venv/bin/pytest -v

dev:
	@echo "Starting development mode..."
	@echo "Backend starting on http://127.0.0.1:8000, Vite frontend on http://localhost:5173"
	trap 'kill 0' EXIT; \
	(cd backend && PYTHONPATH=. ./venv/bin/uvicorn app.main:app --reload --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

clean:
	rm -rf frontend/dist frontend/node_modules/.vite
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf backend/.pytest_cache
