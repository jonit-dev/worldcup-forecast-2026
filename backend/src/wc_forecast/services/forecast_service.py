from __future__ import annotations

from collections import Counter
from datetime import date
from pathlib import Path

from wc_forecast.data.repository import (
    list_historical_results,
    list_matches,
    list_rankings,
    list_standings,
)
from wc_forecast.models.forecast import MODEL_VERSION, build_inputs, config_hash, forecast_matches
from wc_forecast.models.simulate import simulate_group_paths


def load_forecasts(database_path: Path, as_of_date: date, team_id: str | None = None) -> list[dict]:
    matches = list_matches(database_path, as_of_date)
    rankings = list_rankings(database_path, as_of_date)
    historical_results = list_historical_results(database_path, as_of_date)
    inputs = build_inputs(rankings, historical_results, matches, as_of_date)
    forecasts = forecast_matches(matches, inputs)
    if team_id:
        forecasts = [
            forecast
            for forecast in forecasts
            if forecast["home_team_id"] == team_id or forecast["away_team_id"] == team_id
        ]
    return forecasts


def load_next_team_forecasts(
    database_path: Path,
    as_of_date: date,
    team_id: str,
    limit: int = 3,
) -> list[dict]:
    forecasts = [
        forecast
        for forecast in load_forecasts(database_path, as_of_date, team_id)
        if forecast["status"] != "complete" and forecast["match_date"] >= as_of_date
    ]
    return sorted(forecasts, key=lambda forecast: (forecast["match_date"], forecast["match_id"]))[:limit]


def load_simulation(database_path: Path, as_of_date: date, iterations: int, seed: int) -> dict:
    forecasts = load_forecasts(database_path, as_of_date)
    standings = list_standings(database_path, as_of_date)
    result = simulate_group_paths(forecasts, standings, iterations=iterations, seed=seed)
    return {
        "model_version": MODEL_VERSION,
        "config_hash": config_hash(as_of_date),
        "as_of_date": as_of_date,
        "iterations": result.iterations,
        "seed": result.seed,
        "teams": result.teams,
        "note": "Simulation uses current sample group data and is not a statistically significant claim.",
    }


def model_diagnostics(database_path: Path, as_of_date: date) -> dict:
    matches = list_matches(database_path, as_of_date)
    rankings = list_rankings(database_path, as_of_date)
    historical_results = list_historical_results(database_path, as_of_date)
    completed_matches = [match for match in matches if match["status"] == "complete"]
    tournament_team_ids = {row["team_id"] for row in rankings}
    coverage = Counter()
    for row in historical_results:
        if row["home_team_id"] in tournament_team_ids:
            coverage[row["home_team_id"]] += 1
        if row["away_team_id"] in tournament_team_ids:
            coverage[row["away_team_id"]] += 1
    for row in completed_matches:
        if row["home_team_id"] in tournament_team_ids:
            coverage[row["home_team_id"]] += 1
        if row["away_team_id"] in tournament_team_ids:
            coverage[row["away_team_id"]] += 1
    counts = sorted(coverage[team_id] for team_id in tournament_team_ids)
    median_index = len(counts) // 2
    median_count = (
        int((counts[median_index - 1] + counts[median_index]) / 2)
        if len(counts) % 2 == 0
        else counts[median_index]
    )
    return {
        "model_version": MODEL_VERSION,
        "config_hash": config_hash(as_of_date),
        "as_of_date": as_of_date,
        "ranking_rows": len(rankings),
        "historical_result_rows": len(historical_results),
        "current_completed_matches": len(completed_matches),
        "coverage_threshold": 150,
        "team_coverage": {
            "team_count": len(tournament_team_ids),
            "min_matches": counts[0] if counts else 0,
            "median_matches": median_count if counts else 0,
            "max_matches": counts[-1] if counts else 0,
            "teams_below_threshold": [
                team_id for team_id in sorted(tournament_team_ids) if coverage[team_id] < 150
            ],
        },
        "limitations": [
            "Historical coverage is broad, but football outcomes remain noisy and forecasts are not statistical proof.",
            "Probabilities are calibrated point estimates and should not be described as statistically significant.",
            "Knockout paths are deferred until full bracket pairing rules and live data are ingested.",
        ],
    }
