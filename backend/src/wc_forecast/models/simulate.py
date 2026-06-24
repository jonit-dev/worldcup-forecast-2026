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


@dataclass(frozen=True)
class OpponentPathResult:
    iterations: int
    seed: int
    opponents: list[dict[str, float | int | str]]


ROUND_OF_32_PAIRINGS: tuple[tuple[str, str], ...] = (
    ("2A", "2B"),
    ("1C", "2F"),
    ("1E", "3A/B/C/D/F"),
    ("1F", "2C"),
    ("2E", "2I"),
    ("1I", "3C/D/F/G/H"),
    ("1A", "3C/E/F/H/I"),
    ("1L", "3E/H/I/J/K"),
    ("1G", "3A/E/H/I/J"),
    ("1D", "3B/E/F/I/J"),
    ("1H", "2J"),
    ("2K", "2L"),
    ("1B", "3E/F/G/I/J"),
    ("2D", "2G"),
    ("1J", "2H"),
    ("1K", "3D/E/I/J/L"),
)


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


def simulate_first_knockout_opponents(
    forecasts: Iterable[dict],
    standings: Iterable[dict],
    selected_team_id: str,
    iterations: int = 1000,
    seed: int = 20260620,
) -> OpponentPathResult:
    """Estimate first knockout opponent probabilities from simulated group positions.

    This uses the published 2026 Round-of-32 slot template. Where a match slot is
    allocated to one of several best-third groups, we use the highest-ranked
    advancing third-place team among that match's eligible groups for the current
    simulation. That is still an approximation, but it is bracket-position based;
    it is not the old co-advancement proxy that made every certain qualifier look
    equally likely.
    """

    rng = random.Random(seed)
    forecast_rows = [row for row in forecasts if row["stage"] == "group"]
    standings_rows = list(standings)
    team_groups = {row["team_id"]: row["group_name"] for row in standings_rows}
    base_points = {row["team_id"]: int(row["points"]) for row in standings_rows}
    base_goal_diff = {
        row["team_id"]: int(row["goals_for"]) - int(row["goals_against"]) for row in standings_rows
    }
    base_goals_for = {row["team_id"]: int(row["goals_for"]) for row in standings_rows}
    opponent_counts: Counter[str] = Counter()
    qualified_iterations = 0

    by_group: dict[str, list[str]] = defaultdict(list)
    for team_id, group_name in team_groups.items():
        by_group[group_name].append(team_id)

    for _ in range(iterations):
        points = defaultdict(int, base_points)
        goal_diff = defaultdict(int, base_goal_diff)
        goals_for = defaultdict(int, base_goals_for)
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
                goals_for[home] += 1
            elif outcome == "away_win":
                points[away] += 3
                goal_diff[away] += 1
                goal_diff[home] -= 1
                goals_for[away] += 1
            else:
                points[home] += 1
                points[away] += 1
                goals_for[home] += 1
                goals_for[away] += 1

        slot_to_team: dict[str, str] = {}
        third_candidates: list[str] = []
        for group_name, teams in by_group.items():
            ordered = sorted(
                teams,
                key=lambda team: (points[team], goal_diff[team], goals_for[team], team),
                reverse=True,
            )
            if len(ordered) >= 1:
                slot_to_team[f"1{group_name}"] = ordered[0]
            if len(ordered) >= 2:
                slot_to_team[f"2{group_name}"] = ordered[1]
            if len(ordered) >= 3:
                third_candidates.append(ordered[2])

        advancing_thirds = set(
            sorted(
                third_candidates,
                key=lambda team: (points[team], goal_diff[team], goals_for[team], team),
                reverse=True,
            )[:8]
        )
        third_by_group = {team_groups[team]: team for team in advancing_thirds}

        selected_slot = None
        for slot, team in slot_to_team.items():
            if team == selected_team_id:
                selected_slot = slot
                break
        if selected_slot is None and selected_team_id in advancing_thirds:
            selected_slot = f"3{team_groups[selected_team_id]}"
        if selected_slot is None:
            continue

        qualified_iterations += 1
        opponent_id = _first_knockout_opponent(selected_slot, slot_to_team, third_by_group)
        if opponent_id:
            opponent_counts[opponent_id] += 1

    return OpponentPathResult(
        iterations=iterations,
        seed=seed,
        opponents=[
            {
                "team_id": team_id,
                "estimated_match_probability": round(count / iterations, 6),
                "conditional_match_probability": round(
                    count / qualified_iterations if qualified_iterations else 0,
                    6,
                ),
            }
            for team_id, count in opponent_counts.most_common()
        ],
    )


def _first_knockout_opponent(
    selected_slot: str,
    slot_to_team: dict[str, str],
    third_by_group: dict[str, str],
) -> str | None:
    for left, right in ROUND_OF_32_PAIRINGS:
        if _slot_matches(selected_slot, left):
            return _resolve_opponent_slot(right, slot_to_team, third_by_group)
        if _slot_matches(selected_slot, right):
            return _resolve_opponent_slot(left, slot_to_team, third_by_group)
    return None


def _slot_matches(selected_slot: str, pairing_slot: str) -> bool:
    if not pairing_slot.startswith("3"):
        return selected_slot == pairing_slot
    return selected_slot.startswith("3") and selected_slot[1:] in pairing_slot[1:].split("/")


def _resolve_opponent_slot(
    pairing_slot: str,
    slot_to_team: dict[str, str],
    third_by_group: dict[str, str],
) -> str | None:
    if not pairing_slot.startswith("3"):
        return slot_to_team.get(pairing_slot)
    for group_name in pairing_slot[1:].split("/"):
        if group_name in third_by_group:
            return third_by_group[group_name]
    return None
