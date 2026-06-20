# Modeling Calibration Notes

As-of baseline: 2026-06-20.

## Current Model

- Rating layer: Elo-style update seeded from ranking points.
- Form layer: last-12-match goal-difference adjustment, `35` Elo points per goal-difference-per-match.
- Goal layer: independent Poisson score matrix using rating gap plus attack/defense terms.
- Probability layer: temperature `1.3`, `25%` shrinkage toward uniform outcome probabilities, and a
  public probability cap of `65%`.
- Simulation layer: seeded Monte Carlo over remaining group matches.
- Model version: `elo-form-calibrated-2026-06-20`.

## Pre-Tournament Holdout Check

The API endpoint `/api/model/evaluation` evaluates the current model as if the tournament had not
started:

- Training cutoff: `2026-06-10`.
- Tournament start: `2026-06-11`.
- Completed current World Cup matches used for training: `0`.
- Holdout: completed World Cup matches through the configured `as_of_date`.

As of `2026-06-20`, the holdout comparison against actual results returns:

- Holdout matches: `30`.
- Correct match outcomes: `20`.
- Outcome accuracy: `66.7%`.
- Log loss: `0.8741`.
- Brier score: `0.5023`.
- 95% Wilson accuracy interval: `48.8%` to `80.8%`.

The holdout clears the current quality gate, but it is still too small to tune model parameters
against directly.

## Iteration Notes

Competing model checks were run before choosing the current default:

- Exponential recency weighting was rejected as the default because leak-free rolling validation
  degraded versus unweighted history.
- Pure probability calibration improved rolling historical validation by reducing overconfidence.
- The last-12 goal-difference form adjustment improved larger historical rolling validation and did
  not reduce the World Cup holdout outcome accuracy.

The World Cup-so-far holdout is used as a final sanity check, not as the tuning target.

## Precision Policy

Probabilities are normalized to sum to exactly `1.0` after scoreline truncation. API
responses round display probabilities to six decimals. Internal expected-goals values are
bounded to avoid impossible values in sparse sample data.

## Statistical Significance Policy

This project does not claim that individual match probability differences are statistically
significant. The model now reports an explicit holdout sample size and confidence interval so the
frontend does not imply more certainty than the data supports. Public-facing forecasts still require
refreshed source snapshots, point-in-time rating snapshots, larger historical validation windows,
and continued calibration checks.

## Leakage Controls

- Historical results are queried with `match_date <= as_of_date`.
- Current tournament completed results are used only when `match_date <= as_of_date`.
- Future fixtures may be forecast, but future scores are rejected by ingestion validation.

## Current Limitations

- No player availability, injuries, travel, rest, lineup, or weather adjustments.
- Group tiebreak simulation uses points, goal difference, goals for, then team ID as a
  deterministic final fallback.
- Knockout bracket simulation is deferred until full live bracket pairing data is ingested.
