#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AS_OF_DATE="${1:-2026-06-22}"
FETCH_HISTORY="${FETCH_HISTORY:-1}"
FETCH_CURRENT_RESULTS="${FETCH_CURRENT_RESULTS:-1}"

cd "$ROOT_DIR/backend"
if [[ "$FETCH_CURRENT_RESULTS" == "1" ]]; then
  PYTHONPATH=src "$ROOT_DIR/.venv/bin/python" -m wc_forecast.data.fetch_current_results --as-of "$AS_OF_DATE"
fi
if [[ "$FETCH_HISTORY" == "1" ]]; then
  PYTHONPATH=src "$ROOT_DIR/.venv/bin/python" -m wc_forecast.data.fetch_historical --as-of "$AS_OF_DATE" --start-date "${HISTORY_START_DATE:-2000-01-01}"
fi
PYTHONPATH=src "$ROOT_DIR/.venv/bin/python" -m wc_forecast.data.ingest --as-of "$AS_OF_DATE"
