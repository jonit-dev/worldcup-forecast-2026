# PRD: API and Frontend Dashboard

Complexity: 8 -> HIGH mode

## Problem

Users need a visual forecasting workbench to inspect odds, standings, model inputs, and source freshness.

## API Endpoints

- `GET /health`
- `GET /api/summary`
- `GET /api/matches`
- `GET /api/forecasts`
- `GET /api/standings`
- `GET /api/simulations`

The initial scaffold exposes `/health` and `/api/summary`. Versioned `/api/v1/*`
routes can be introduced once the response contracts are stable; until then the
frontend client is intentionally small and points at the unversioned MVP routes.

## UI Tickets

1. Build dashboard shell with API health state.
2. Add forecast table with date, group, team, probability, expected goals, and top scoreline.
3. Add group standings table next to simulated qualification odds.
4. Add match detail panel with model input explanation.
5. Add tournament odds chart.
6. Add source freshness and warning states.
7. Add cross-page navigation once more than one top-level view exists.

## Acceptance Criteria

- Dashboard works against local Flask API.
- Loading and error states are visible and non-blocking.
- Match detail updates when a user selects a match.
- Playwright smoke test covers dashboard loading and match selection.
