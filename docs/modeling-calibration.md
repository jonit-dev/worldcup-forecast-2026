# Modeling Calibration Notes

As-of baseline: 2026-06-20.

## Current Model

- Rating layer: Elo-style update seeded from ranking points.
- Form layer: last-12-match goal-difference adjustment, `15` Elo points per goal-difference-per-match.
- Goal layer: independent Poisson score matrix using rating gap plus recent attack/defense terms.
- Attack/defense layer: last-40-match goal rates, shrunk toward `1.35` goals per team with `20`
  pseudo-matches.
- Rating-to-goal scale: `1400`, selected after leak-free historical validation improved versus the
  previous `1800` scale.
- Probability layer: temperature `1.3`, `25%` shrinkage toward uniform outcome probabilities, and a
  public probability cap of `65%`.
- Simulation layer: seeded Monte Carlo over remaining group matches.
- Model version: `elo-form-calibrated-2026-06-20-recent40`.

## Pre-Tournament Holdout Check

The API endpoint `/api/model/evaluation` evaluates the current model as if the tournament had not
started:

- Training cutoff: `2026-06-10`.
- Tournament start: `2026-06-11`.
- Completed current World Cup matches used for training: `0`.
- Holdout: completed World Cup matches through the configured `as_of_date`.

As of `2026-06-20`, the holdout comparison against actual results returns:

- Holdout matches: `30`.
- Correct match outcomes: `21`.
- Outcome accuracy: `70.0%`.
- Log loss: `0.8589`.
- Brier score: `0.4925`.
- 95% Wilson accuracy interval: `52.1%` to `83.3%`.

The holdout clears the current quality gate, but it is still too small to tune model parameters
against directly.

## Iteration Notes

Competing model checks were run before choosing the current default:

- Exponential recency weighting was rejected as the default because leak-free rolling validation
  degraded versus unweighted history.
- Pure probability calibration improved rolling historical validation by reducing overconfidence.
- A rating-to-goal scale of `1400` improved a larger 2010-2026 pre-tournament rolling validation
  check from `49.6%` to `50.3%` accuracy, log loss from `1.0292` to `1.0223`, and Brier score from
  `0.6176` to `0.6129`. On the World Cup holdout it improved from `19/30` to `21/30`.
- Recent goal-rate shrinkage plus a smaller form adjustment improved the 2018-2025 rolling block
  validation from `47.6%` to `48.9%` accuracy, log loss from `1.0404` to `1.0334`, and Brier score
  from `0.6254` to `0.6205`. It did not improve the World Cup holdout beyond `21/30`, so this is
  kept for broader validation quality rather than holdout tuning.

No tested model reached an evidence-backed `80%` World Cup holdout accuracy. Reaching that mark on
the current `30` completed matches would require `24/30` correct outcomes, and repeated parameter
searches at this sample size are highly exposed to overfit. The World Cup-so-far holdout is used as
a final sanity check, not as the tuning target.

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
