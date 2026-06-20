# Modeling Calibration Notes

As-of baseline: 2026-06-20.

## Current Model

- Rating layer: Elo-style update seeded from ranking points.
- Goal layer: independent Poisson score matrix using rating gap plus attack/defense terms.
- Simulation layer: seeded Monte Carlo over remaining group matches.
- Model version: `elo-poisson-baseline-2026-06-20`.

## Precision Policy

Probabilities are normalized to sum to exactly `1.0` after scoreline truncation. API
responses round display probabilities to six decimals. Internal expected-goals values are
bounded to avoid impossible values in sparse sample data.

## Statistical Significance Policy

This project does not claim that current probability differences are statistically
significant. The checked-in sample data is intentionally small so local verification is
reproducible. Public-facing forecasts require refreshed source snapshots, a larger
historical dataset, calibration on held-out tournament windows, and uncertainty intervals.

## Leakage Controls

- Historical results are queried with `match_date <= as_of_date`.
- Current tournament completed results are used only when `match_date <= as_of_date`.
- Future fixtures may be forecast, but future scores are rejected by ingestion validation.

## Current Limitations

- No player availability, injuries, travel, rest, lineup, or weather adjustments.
- Group tiebreak simulation uses points, goal difference, goals for, then team ID as a
  deterministic final fallback.
- Knockout bracket simulation is deferred until full live bracket pairing data is ingested.
