# World Cup Forecast 2026

Forecasting workspace for FIFA World Cup 2026 match results and tournament outcomes.

Current project date assumption: June 20, 2026, with the group stage in progress. The first milestone is a React + Flask application backed by Python data science tooling.

## Stack

- Backend/API: Python, Flask, Pydantic, Pandas, NumPy, SciPy, scikit-learn, DuckDB
- Modeling: Elo/SPI-style team ratings, Poisson goal model, Monte Carlo tournament simulation
- Frontend: React, TypeScript, Vite, TanStack Query, Recharts
- Testing: pytest for backend, Vitest and Playwright for frontend

## Project Layout

```text
backend/      Flask API, ingestion, feature engineering, forecasting services
frontend/     React dashboard and API client
data/         Local raw/processed/external datasets, ignored except manifests
docs/prds/    Ticket-sliced PRDs
scripts/      Utility commands for local workflows
```

## First Commands

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
flask --app wc_forecast.api.app run --debug
```

```bash
cd frontend
npm install
npm run dev
```

See `ROADMAP.md` for the planned vertical slices.

## Forecast Workflow

```bash
./scripts/refresh_data.sh 2026-06-20
./scripts/run_forecast.sh 2026-06-20
make backend-test
cd frontend && npm test && npm run lint && npm run build && npm run test:e2e
```

The dashboard includes all 48 World Cup teams, lets you select a team, and explains its next
forecast matches with win/draw/loss probabilities, expected goals, likely scorelines, and the sample
size behind the forecast. Historical team form is refreshed from the Mart Jürisoo international
results dataset before ingestion when network access is available. The current baseline ingests
12,112 historical results since 2000, with every World Cup team represented by at least 152
historical/current matches. These are broad-sample model estimates, not statistically significant
claims.
