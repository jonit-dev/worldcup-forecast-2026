#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AS_OF_DATE="${1:-2026-06-20}"

cd "$ROOT_DIR/backend"
PYTHONPATH=src "$ROOT_DIR/.venv/bin/python" -m wc_forecast.data.ingest --as-of "$AS_OF_DATE"
