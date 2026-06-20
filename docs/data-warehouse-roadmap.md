# Data Warehouse Roadmap

This project should not depend on model-output datasets as ground truth. The durable path is a
canonical football data warehouse with source snapshots, model features, forecasts, and simulation
outputs versioned by time.

## Current Coverage

- Tournament spine: local fixture/result/standings snapshots with canonical app match IDs.
- Historical results: Mart Jürisoo international results refresh from 2000 onward.
- Team strength: one ranking snapshot for all 48 teams.
- Forecast snapshots: generated on request from the current DuckDB state.

## Priority Source Stack

1. FIFA official schedule, fixtures, results, teams, stadiums, standings, and tie-breakers.
2. OpenFootball World Cup JSON as local development and test fallback.
3. Mart Jürisoo international results for historical team performance.
4. World Football Elo plus FIFA ranking snapshots for point-in-time team strength.
5. Market odds snapshots from a licensed odds provider and prediction markets.
6. Venue and weather context from FIFA venues plus Open-Meteo or Meteostat.
7. A live football API for lineups, cards, injuries, player stats, and event/xG data.

## Schema Gaps To Add Next

```text
venues
  venue_id, city, country, stadium, latitude, longitude, altitude_m, timezone

team_ratings_snapshot
  team_id, snapshot_time, fifa_rank, fifa_points, elo_rating, source_name, source_url

odds_snapshot
  match_id, market, provider, outcome, decimal_odds,
  implied_prob_raw, implied_prob_devigged, snapshot_time

weather_snapshot
  match_id, snapshot_time, temp_c, humidity, wind_kph,
  precipitation_prob, heat_index

team_match_stats
  match_id, team_id, expected_goals, shots, shots_on_target,
  possession, cards, fouls, corners

forecast_snapshot
  model_version, config_hash, match_id, snapshot_time,
  home_win_prob, draw_prob, away_win_prob,
  expected_home_goals, expected_away_goals

simulation_run
  run_id, model_version, config_hash, snapshot_time, num_sims

simulation_team_result
  run_id, team_id, group_win_prob, advance_r32_prob,
  qf_prob, sf_prob, final_prob, champion_prob
```

## Modeling Implications

- Keep the current Mart historical result model as the no-cost baseline.
- Do not ship short-half-life recency weighting by default; rolling validation showed worse log loss.
- Keep the last-12 goal-difference form adjustment as the current validation-backed form signal.
- Add market-implied probabilities as a separate feature and report model-vs-market deltas.
- Add weather, rest, travel, and venue context after the canonical venue table exists.
- Treat event-level xG as an advanced feature; keep the frontend label as "Expected goals".

## Implementation Order

1. Add schema migrations for `venues`, `team_ratings_snapshot`, `odds_snapshot`, and
   `forecast_snapshot`.
2. Add fixture source adapters with source snapshots instead of hand-maintained CSV-only data.
3. Add official venue IDs and kickoff times to the match spine.
4. Add point-in-time rating snapshots so historical validation does not reuse future rankings.
5. Add odds ingestion and a model-vs-market panel.
6. Add weather snapshots keyed by match and venue.
7. Add deterministic 2026 group ranking and best-third-place logic before knockout simulation.

## Guardrails

- Every source row must retain `source_name`, `source_url`, `source_fetched_at`, and `as_of_date`
  or `snapshot_time`.
- Forecast evaluation must use point-in-time data only.
- The World Cup-so-far holdout is a final sanity check, not a tuning target.
- Any paid or scraped source needs license review before becoming canonical.
