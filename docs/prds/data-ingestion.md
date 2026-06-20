# PRD: Data Ingestion and Storage

Complexity: 8 -> HIGH mode

## Problem

The forecasting system needs reproducible current-tournament and historical-match datasets without leaking future results into forecasts.

## Scope

- Canonicalize teams, matches, standings, rankings, and historical results.
- Store raw snapshots and processed tables with source metadata.
- Support `as_of_date=2026-06-20` as the first project baseline.

## Tickets

1. Define DuckDB schema for teams, matches, standings, rankings, and source snapshots.
2. Add CSV/manual snapshot loader for current World Cup fixtures/results.
3. Add historical international results loader.
4. Add data quality checks for duplicate matches, missing team IDs, impossible scores, and future leakage.
5. Expose source freshness through Flask `/api/summary`.
6. Add read-only endpoints for data status, teams, matches, match detail, and team history.
7. Add a frontend data status panel once ingestion run metadata exists.

## Acceptance Criteria

- Running ingestion creates `data/processed/worldcup_forecast.duckdb`.
- Every row has source and as-of metadata.
- Tests prove future results are excluded for an earlier forecast date.
- API summary shows last successful data refresh.
- Ingestion is idempotent for repeat runs of the same source snapshot.
