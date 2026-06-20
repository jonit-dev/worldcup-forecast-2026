from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date
from typing import Iterable

from wc_forecast.models.poisson import outcome_probabilities, score_matrix, top_scorelines
from wc_forecast.models.ratings import TeamRating, calculate_ratings


MODEL_VERSION = "elo-form-calibrated-2026-06-20"
PROBABILITY_TEMPERATURE = 1.3
UNIFORM_SHRINKAGE = 0.25
MAX_PUBLIC_PROBABILITY = 0.65


@dataclass(frozen=True)
class ForecastInputs:
    ratings: dict[str, TeamRating]
    as_of_date: date


def config_hash(as_of_date: date) -> str:
    payload = (
        f"{MODEL_VERSION}:{as_of_date.isoformat()}:max_goals=8:base_xg=1.35:"
        "recent_goal_difference_matches=12:recent_goal_difference_elo=35:"
        f"temperature={PROBABILITY_TEMPERATURE}:shrink={UNIFORM_SHRINKAGE}:"
        f"max_public_probability={MAX_PUBLIC_PROBABILITY}"
    )
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


def calibrate_probabilities(probabilities: dict[str, float]) -> dict[str, float]:
    tempered = {
        outcome: probability ** (1.0 / PROBABILITY_TEMPERATURE)
        for outcome, probability in probabilities.items()
    }
    tempered_total = sum(tempered.values())
    shrunk = {
        outcome: (1.0 - UNIFORM_SHRINKAGE) * (probability / tempered_total)
        + UNIFORM_SHRINKAGE / len(tempered)
        for outcome, probability in tempered.items()
    }
    top_outcome = max(shrunk, key=shrunk.get)
    if shrunk[top_outcome] <= MAX_PUBLIC_PROBABILITY:
        return shrunk

    remaining_outcomes = [outcome for outcome in shrunk if outcome != top_outcome]
    remaining_total = sum(shrunk[outcome] for outcome in remaining_outcomes)
    capped = {top_outcome: MAX_PUBLIC_PROBABILITY}
    for outcome in remaining_outcomes:
        capped[outcome] = (1.0 - MAX_PUBLIC_PROBABILITY) * shrunk[outcome] / remaining_total
    return capped


def forecast_match(match: dict, inputs: ForecastInputs) -> dict:
    home_rating = inputs.ratings.get(match["home_team_id"], TeamRating(match["home_team_id"], 1500, 1, 1, 0))
    away_rating = inputs.ratings.get(match["away_team_id"], TeamRating(match["away_team_id"], 1500, 1, 1, 0))
    home_xg, away_xg = expected_goals(home_rating, away_rating, bool(match["neutral_site"]))
    scorelines = score_matrix(home_xg, away_xg)
    raw_probabilities = outcome_probabilities(scorelines)
    probabilities = calibrate_probabilities(raw_probabilities)
    rounded_home = round(probabilities["home_win"], 6)
    rounded_draw = round(probabilities["draw"], 6)
    rounded_away = round(1.0 - rounded_home - rounded_draw, 6)
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
            "home_win": rounded_home,
            "draw": rounded_draw,
            "away_win": rounded_away,
        },
        "raw_probabilities": {
            "home_win": round(raw_probabilities["home_win"], 6),
            "draw": round(raw_probabilities["draw"], 6),
            "away_win": round(raw_probabilities["away_win"], 6),
        },
        "top_scorelines": top_scorelines(scorelines),
        "model": {
            "version": MODEL_VERSION,
            "config_hash": config_hash(inputs.as_of_date),
            "as_of_date": inputs.as_of_date,
            "note": (
                "Calibrated estimate from historical validation; football outcomes remain noisy "
                "and should not be treated as certain."
            ),
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
            "home_recent_goal_difference": round(home_rating.recent_goal_difference, 6),
            "away_recent_goal_difference": round(away_rating.recent_goal_difference, 6),
            "home_form_adjustment": round(home_rating.form_adjustment, 6),
            "away_form_adjustment": round(away_rating.form_adjustment, 6),
        },
    }


def forecast_matches(matches: Iterable[dict], inputs: ForecastInputs) -> list[dict]:
    return [forecast_match(match, inputs) for match in matches]
