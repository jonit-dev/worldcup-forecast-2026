from __future__ import annotations

from collections import Counter
from datetime import date
from pathlib import Path

from wc_forecast.data.repository import (
    list_historical_results,
    list_matches,
    list_rankings,
    list_standings,
    list_teams,
)
from wc_forecast.models.forecast import MODEL_VERSION, build_inputs, config_hash, forecast_matches
from wc_forecast.models.simulate import simulate_group_paths


def _champion_odds_from_forecasts(forecasts: list[dict], team_names: dict[str, str]) -> list[dict]:
    ratings: dict[str, float] = {}
    for forecast in forecasts:
        ratings[forecast["home_team_id"]] = max(
            ratings.get(forecast["home_team_id"], 0),
            forecast["model_inputs"]["home_rating"],
        )
        ratings[forecast["away_team_id"]] = max(
            ratings.get(forecast["away_team_id"], 0),
            forecast["model_inputs"]["away_rating"],
        )

    weighted = []
    for team_id, rating in ratings.items():
        title_weight = 10 ** (((rating - 1500) / 400) * 1.8)
        weighted.append(
            {
                "team_id": team_id,
                "team_name": team_names.get(team_id, team_id),
                "rating": rating,
                "title_weight": title_weight,
            }
        )

    total_weight = sum(team["title_weight"] for team in weighted)
    return sorted(
        [
            {
                "team_id": team["team_id"],
                "team_name": team["team_name"],
                "rating": team["rating"],
                "probability": 0 if total_weight == 0 else team["title_weight"] / total_weight,
            }
            for team in weighted
        ],
        key=lambda team: team["probability"],
        reverse=True,
    )


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


def load_tournament_overview(database_path: Path, as_of_date: date) -> dict:
    rankings = list_rankings(database_path, as_of_date)
    teams = list_teams(database_path, as_of_date)
    standings = list_standings(database_path, as_of_date)
    forecasts = load_forecasts(database_path, as_of_date)
    upcoming = [
        forecast
        for forecast in forecasts
        if forecast["status"] != "complete" and forecast["match_date"] >= as_of_date
    ]
    completed = [forecast for forecast in forecasts if forecast["status"] == "complete"]
    rankings_by_team = {team["team_id"]: team for team in rankings}
    team_names = {team["team_id"]: team["team_name"] for team in teams}
    champion_odds = _champion_odds_from_forecasts(forecasts, team_names)
    simulation = load_simulation(database_path, as_of_date, iterations=1000, seed=20260620)
    simulation_by_team = {team["team_id"]: team for team in simulation["teams"]}

    strongest_attack = max(
        (
            {
                "team_id": forecast["home_team_id"],
                "team_name": forecast["home_team"],
                "value": forecast["model_inputs"]["home_attack"],
            }
            for forecast in forecasts
        ),
        key=lambda row: row["value"],
        default=None,
    )
    strongest_defense = min(
        (
            {
                "team_id": forecast["home_team_id"],
                "team_name": forecast["home_team"],
                "value": forecast["model_inputs"]["home_defense"],
            }
            for forecast in forecasts
        ),
        key=lambda row: row["value"],
        default=None,
    )

    title_leader = champion_odds[0] if champion_odds else None
    group_leaders = sorted(
        [
            {
                **team,
                "team_name": team_names.get(team["team_id"], team["team_id"]),
            }
            for team in simulation["teams"]
        ],
        key=lambda team: team["group_win_probability"],
        reverse=True,
    )[:8]

    return {
        "model_version": MODEL_VERSION,
        "config_hash": config_hash(as_of_date),
        "as_of_date": as_of_date,
        "match_counts": {
            "upcoming": len(upcoming),
            "completed": len(completed),
            "total": len(forecasts),
        },
        "team_count": len(teams),
        "group_count": len({standing["group_name"] for standing in standings}),
        "title_leader": title_leader,
        "strongest_attack": strongest_attack,
        "strongest_defense": strongest_defense,
        "featured_matches": sorted(
            upcoming,
            key=lambda forecast: (
                forecast["match_date"],
                -max(
                    forecast["probabilities"]["home_win"],
                    forecast["probabilities"]["away_win"],
                ),
            ),
        )[:6],
        "champion_odds": champion_odds[:16],
        "group_leaders": group_leaders,
        "teams": [
            {
                "team_id": team["team_id"],
                "team_name": team["team_name"],
                "confederation": team["confederation"],
                "rating": rankings_by_team.get(team["team_id"], {}).get("rating"),
                "group_name": simulation_by_team.get(team["team_id"], {}).get("group_name"),
                "advance_probability": simulation_by_team.get(team["team_id"], {}).get(
                    "advance_probability"
                ),
                "group_win_probability": simulation_by_team.get(team["team_id"], {}).get(
                    "group_win_probability"
                ),
            }
            for team in teams
        ],
        "note": "Tournament overview combines current match forecasts, ranking-derived title weights, and group path simulation.",
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
