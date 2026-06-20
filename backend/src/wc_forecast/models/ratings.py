from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Iterable

RECENT_GOAL_MATCHES = 40
RECENT_FORM_MATCHES = 12
GOAL_RATE_SHRINK_MATCHES = 20
AVERAGE_GOALS_PER_TEAM = 1.35
FORM_ADJUSTMENT_PER_GOAL = 15.0


@dataclass(frozen=True)
class TeamRating:
    team_id: str
    rating: float
    attack: float
    defense: float
    matches_used: int
    recent_goal_difference: float = 0.0
    form_adjustment: float = 0.0


def expected_result(rating_a: float, rating_b: float) -> float:
    return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))


def result_score(home_score: int, away_score: int) -> tuple[float, float]:
    if home_score > away_score:
        return 1.0, 0.0
    if home_score < away_score:
        return 0.0, 1.0
    return 0.5, 0.5


def margin_multiplier(home_score: int, away_score: int) -> float:
    margin = abs(home_score - away_score)
    if margin <= 1:
        return 1.0
    return math.log(margin + 1.0) * 1.35


def base_ratings(rankings: Iterable[dict]) -> dict[str, float]:
    ratings: dict[str, float] = {}
    for row in rankings:
        ratings.setdefault(row["team_id"], float(row["rating_points"]))
    return ratings


def calculate_ratings(
    rankings: Iterable[dict],
    historical_results: Iterable[dict],
    current_matches: Iterable[dict],
    as_of_date: date,
) -> dict[str, TeamRating]:
    ratings = base_ratings(rankings)
    goals_for: dict[str, float] = {}
    goals_against: dict[str, float] = {}
    matches_used: dict[str, int] = {}

    completed_current = [
        row
        for row in current_matches
        if row.get("status") == "complete"
        and row.get("home_score") is not None
        and row.get("away_score") is not None
        and row["match_date"] <= as_of_date
    ]
    all_results = list(historical_results) + completed_current
    sorted_results = sorted(all_results, key=lambda item: item["match_date"])

    for row in sorted_results:
        home = row["home_team_id"]
        away = row["away_team_id"]
        home_score = int(row["home_score"])
        away_score = int(row["away_score"])
        ratings.setdefault(home, 1500.0)
        ratings.setdefault(away, 1500.0)

        home_expected = expected_result(ratings[home], ratings[away])
        away_expected = 1.0 - home_expected
        home_actual, away_actual = result_score(home_score, away_score)
        k_factor = 18.0 * margin_multiplier(home_score, away_score)
        ratings[home] += k_factor * (home_actual - home_expected)
        ratings[away] += k_factor * (away_actual - away_expected)

        goals_for[home] = goals_for.get(home, 0.0) + home_score
        goals_for[away] = goals_for.get(away, 0.0) + away_score
        goals_against[home] = goals_against.get(home, 0.0) + away_score
        goals_against[away] = goals_against.get(away, 0.0) + home_score
        matches_used[home] = matches_used.get(home, 0) + 1
        matches_used[away] = matches_used.get(away, 0) + 1

    output: dict[str, TeamRating] = {}
    for team_id, rating in ratings.items():
        attack, defense = calculate_recent_goal_rates(sorted_results, team_id, as_of_date)
        recent_goal_difference = calculate_recent_goal_difference(sorted_results, team_id, as_of_date)
        form_adjustment = FORM_ADJUSTMENT_PER_GOAL * recent_goal_difference
        output[team_id] = TeamRating(
            team_id=team_id,
            rating=round(rating + form_adjustment, 6),
            attack=max(0.35, min(2.75, attack)),
            defense=max(0.35, min(2.75, defense)),
            matches_used=matches_used.get(team_id, 0),
            recent_goal_difference=round(recent_goal_difference, 6),
            form_adjustment=round(form_adjustment, 6),
        )
    return output


def calculate_recent_goal_difference(results: list[dict], team_id: str, as_of_date: date) -> float:
    recent: list[int] = []
    for row in reversed(results):
        if row["match_date"] > as_of_date:
            continue
        if row["home_team_id"] == team_id:
            recent.append(int(row["home_score"]) - int(row["away_score"]))
        elif row["away_team_id"] == team_id:
            recent.append(int(row["away_score"]) - int(row["home_score"]))
        if len(recent) == RECENT_FORM_MATCHES:
            break
    if not recent:
        return 0.0
    return sum(recent) / len(recent)


def calculate_recent_goal_rates(results: list[dict], team_id: str, as_of_date: date) -> tuple[float, float]:
    goals_for: list[int] = []
    goals_against: list[int] = []
    for row in reversed(results):
        if row["match_date"] > as_of_date:
            continue
        if row["home_team_id"] == team_id:
            goals_for.append(int(row["home_score"]))
            goals_against.append(int(row["away_score"]))
        elif row["away_team_id"] == team_id:
            goals_for.append(int(row["away_score"]))
            goals_against.append(int(row["home_score"]))
        if len(goals_for) == RECENT_GOAL_MATCHES:
            break

    if not goals_for:
        return 1.0, 1.0

    denominator = len(goals_for) + GOAL_RATE_SHRINK_MATCHES
    shrunk_for = (sum(goals_for) + AVERAGE_GOALS_PER_TEAM * GOAL_RATE_SHRINK_MATCHES) / denominator
    shrunk_against = (
        sum(goals_against) + AVERAGE_GOALS_PER_TEAM * GOAL_RATE_SHRINK_MATCHES
    ) / denominator
    return shrunk_for / AVERAGE_GOALS_PER_TEAM, shrunk_against / AVERAGE_GOALS_PER_TEAM
