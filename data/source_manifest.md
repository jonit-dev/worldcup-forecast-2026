# Data Source Manifest

As-of date for initial planning: 2026-06-20.

## Current World Cup 2026 Data

- FIFA official fixtures/results: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums
- FIFA official standings: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/standings
- FIFA scores/fixtures page: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
- ESPN schedule/results fallback: https://www.espn.com/soccer/story/_/id/48939282/2026-fifa-world-cup-fixtures-results-match-schedule-group-stage-knockout-rounds-bracket
- Yahoo Sports schedule/results fallback: https://sports.yahoo.com/soccer/article/2026-world-cup-results-standings-and-schedule-live-scores-group-stage-updates-and-how-to-watch-050724193.html

## Historical Data Candidates

- Kaggle / Mart Jürisoo international football results dataset for match results since 1872.
- GitHub mirror for Mart Jürisoo international football results: https://github.com/martj42/international_results
- football-data.co.uk international results, if current licensing fits project use.
- FIFA/Coca-Cola rankings snapshots for pre-tournament and tournament-period ratings.
- Club Elo-style national team rating mirrors only if terms permit local derived use.

## Freshness Policy

- Every ingested row must retain `source_name`, `source_url`, `source_fetched_at`, and `as_of_date`.
- Current tournament results must be refreshed before each forecast run.
- Future fixtures may be stored, but scores and post-match stats must be null until the match is complete.
- Model training cannot use any match result after the forecast `as_of_date`.

## Initial June 20, 2026 Notes

Search verification on June 20, 2026 found current sources reporting that the World Cup began June 11, 2026 and listing ongoing group-stage results and fixtures. These notes are planning inputs only; the ingestion phase must replace them with source snapshots.
