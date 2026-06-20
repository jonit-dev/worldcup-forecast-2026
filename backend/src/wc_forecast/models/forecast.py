from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date
from typing import Iterable

from wc_forecast.models.poisson import outcome_probabilities, score_matrix, top_scorelines
from wc_forecast.models.ratings import TeamRating, calculate_ratings


MODEL_VERSION = "elo-poisson-baseline-2026-06-20"


@dataclass(frozen=True)
class ForecastInputs:
    ratings: dict[str, TeamRating]
    as_of_date: date


def config_hash(as_of_date: date) -> str:
    payload = f"{MODEL_VERSION}:{as_of_date.isoformat()}:max_goals=8:base_xg=1.35"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def expected_goals(home: TeamRating, away: TeamRating, neutral_site: bool) -> tuple[float, float]:
    rating_gap = home.rating - away.rating
    home_field = 0.0 if neutral_site else 0.16
    home_xg = 1.35 * home.attack / max(away.defense, 0.35) * 10 ** ((rating_gap + home_field * 400) / 1800)
    away_xg = 1.35 * away.attack / max(home.defense, 0.35) * 10 ** ((-rating_gap) / 1800)
    return round(max(0.15, min(4.5, home_xg)), 6), round(max(0.15, min(4.5, away_xg)), 6)


def build_inputs(
    rankings: Iterable[dict],
    historical_results: Iterable[dict],
    matches: Iterable[dict],
    as_of_date: date,
) -> ForecastInputs:
    match_rows = list(matches)
    return ForecastInputs(
        ratings=calculate_ratings(rankings, historical_results, match_rows, as_of_date),
        as_of_date=as_of_date,
    )


def forecast_match(match: dict, inputs: ForecastInputs) -> dict:
    home_rating = inputs.ratings.get(match["home_team_id"], TeamRating(match["home_team_id"], 1500, 1, 1, 0))
    away_rating = inputs.ratings.get(match["away_team_id"], TeamRating(match["away_team_id"], 1500, 1, 1, 0))
    home_xg, away_xg = expected_goals(home_rating, away_rating, bool(match["neutral_site"]))
    scorelines = score_matrix(home_xg, away_xg)
    probabilities = outcome_probabilities(scorelines)
    return {
        "match_id": match["match_id"],
        "match_date": match["match_date"],
        "stage": match["stage"],
        "group_name": match["group_name"],
        "home_team_id": match["home_team_id"],
        "away_team_id": match["away_team_id"],
        "home_team": match["home_team"],
        "away_team": match["away_team"],
        "status": match["status"],
        "home_score": match.get("home_score"),
        "away_score": match.get("away_score"),
        "expected_goals": {"home": home_xg, "away": away_xg},
        "probabilities": {
            "home_win": round(probabilities["home_win"], 6),
            "draw": round(probabilities["draw"], 6),
            "away_win": round(probabilities["away_win"], 6),
        },
        "top_scorelines": top_scorelines(scorelines),
        "model": {
            "version": MODEL_VERSION,
            "config_hash": config_hash(inputs.as_of_date),
            "as_of_date": inputs.as_of_date,
            "note": "Baseline estimate; do not interpret as a statistically significant claim.",
        },
        "model_inputs": {
            "home_rating": home_rating.rating,
            "away_rating": away_rating.rating,
            "home_attack": round(home_rating.attack, 6),
            "away_attack": round(away_rating.attack, 6),
            "home_defense": round(home_rating.defense, 6),
            "away_defense": round(away_rating.defense, 6),
            "home_matches_used": home_rating.matches_used,
            "away_matches_used": away_rating.matches_used,
        },
    }


def forecast_matches(matches: Iterable[dict], inputs: ForecastInputs) -> list[dict]:
    return [forecast_match(match, inputs) for match in matches]

