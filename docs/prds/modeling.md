# PRD: Forecasting and Simulation

Complexity: 8 -> HIGH mode

## Problem

Users need calibrated match probabilities and tournament outcome probabilities, not just raw standings or deterministic picks.

## Methodology

- Recency-weighted Elo/SPI-style strength rating.
- Attack and defense terms for expected goals.
- Poisson scoreline matrix for win/draw/loss and top scorelines.
- Monte Carlo simulation for group advancement and tournament outcomes.
- Calibration measured on held-out historical international windows.

## Tickets

1. Implement rating calculation from historical and current results.
2. Implement expected-goals estimation with neutral-site and host effects.
3. Implement scoreline probability matrix.
4. Implement forecast API service with model metadata.
5. Implement seeded Monte Carlo simulator.
6. Add calibration/evaluation report.
7. Add model run registry with config hash, cutoff date, data snapshot ID, and code version.
8. Add model diagnostics endpoint and UI panel.

## Acceptance Criteria

- Forecast probabilities sum to one.
- Increasing a team rating increases its win probability all else equal.
- Simulation is reproducible with a fixed seed.
- Model docs disclose assumptions and limitations.
- Forecasts never train on results after the selected `as_of_date`.
