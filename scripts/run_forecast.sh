#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AS_OF_DATE="${1:-2026-06-20}"

"$ROOT_DIR/scripts/refresh_data.sh" "$AS_OF_DATE"
cd "$ROOT_DIR/backend"
PYTHONPATH=src "$ROOT_DIR/.venv/bin/python" - <<'PY'
from wc_forecast.config.settings import load_settings
from wc_forecast.services.forecast_service import load_forecasts, load_simulation

settings = load_settings()
forecasts = load_forecasts(settings.database_path, settings.as_of_date)
simulation = load_simulation(settings.database_path, settings.as_of_date, iterations=1000, seed=20260620)
print(f"generated {len(forecasts)} match forecasts")
print(f"simulated {len(simulation['teams'])} team group paths")
PY
