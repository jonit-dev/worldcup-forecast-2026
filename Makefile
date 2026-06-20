.PHONY: backend-test backend-run frontend-install frontend-dev ingest

VENV_BIN := $(CURDIR)/.venv/bin

backend-test:
	cd backend && PYTHONPATH=src $(VENV_BIN)/python -m pytest

backend-run:
	cd backend && PYTHONPATH=src $(VENV_BIN)/flask --app wc_forecast.api.app run --debug

ingest:
	cd backend && PYTHONPATH=src $(VENV_BIN)/python -m wc_forecast.data.ingest --as-of 2026-06-20

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev
