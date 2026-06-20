from __future__ import annotations

import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class SimulationResult:
    iterations: int
    seed: int
    teams: list[dict[str, float | int | str]]


def weighted_choice(rng: random.Random, probabilities: dict[str, float]) -> str:
    draw = rng.random()
    cumulative = 0.0
    for outcome in ("home_win", "draw", "away_win"):
        cumulative += probabilities[outcome]
        if draw <= cumulative:
            return outcome
    return "away_win"


def simulate_group_paths(
    forecasts: Iterable[dict],
    standings: Iterable[dict],
    iterations: int = 1000,
    seed: int = 20260620,
) -> SimulationResult:
    rng = random.Random(seed)
    forecast_rows = [row for row in forecasts if row["stage"] == "group"]
    standings_rows = list(standings)
    team_groups = {row["team_id"]: row["group_name"] for row in standings_rows}
    base_points = {row["team_id"]: int(row["points"]) for row in standings_rows}
    base_goal_diff = {
        row["team_id"]: int(row["goals_for"]) - int(row["goals_against"]) for row in standings_rows
    }
    advance_counts: Counter[str] = Counter()
    group_win_counts: Counter[str] = Counter()

    for _ in range(iterations):
        points = defaultdict(int, base_points)
        goal_diff = defaultdict(int, base_goal_diff)
        for forecast in forecast_rows:
            if forecast["status"] == "complete":
                continue
            outcome = weighted_choice(rng, forecast["probabilities"])
            home = forecast["home_team_id"]
            away = forecast["away_team_id"]
            if outcome == "home_win":
                points[home] += 3
                goal_diff[home] += 1
                goal_diff[away] -= 1
            elif outcome == "away_win":
                points[away] += 3
                goal_diff[away] += 1
                goal_diff[home] -= 1
            else:
                points[home] += 1
                points[away] += 1

        by_group: dict[str, list[str]] = defaultdict(list)
        for team_id, group_name in team_groups.items():
            by_group[group_name].append(team_id)
        for teams in by_group.values():
            ordered = sorted(teams, key=lambda team: (points[team], goal_diff[team], team), reverse=True)
            if ordered:
                group_win_counts[ordered[0]] += 1
            for team in ordered[:2]:
                advance_counts[team] += 1

    teams_output = []
    for team_id in sorted(team_groups):
        teams_output.append(
            {
                "team_id": team_id,
                "group_name": team_groups[team_id],
                "group_win_probability": round(group_win_counts[team_id] / iterations, 6),
                "advance_probability": round(advance_counts[team_id] / iterations, 6),
            }
        )
    return SimulationResult(iterations=iterations, seed=seed, teams=teams_output)

