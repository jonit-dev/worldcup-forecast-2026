from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class ScorelineProbability:
    home_score: int
    away_score: int
    probability: float


def poisson_probability(goals: int, expected_goals: float) -> float:
    return math.exp(-expected_goals) * expected_goals**goals / math.factorial(goals)


def score_matrix(
    home_expected_goals: float,
    away_expected_goals: float,
    max_goals: int = 8,
) -> list[ScorelineProbability]:
    raw: list[ScorelineProbability] = []
    for home_score in range(max_goals + 1):
        for away_score in range(max_goals + 1):
            raw.append(
                ScorelineProbability(
                    home_score=home_score,
                    away_score=away_score,
                    probability=poisson_probability(home_score, home_expected_goals)
                    * poisson_probability(away_score, away_expected_goals),
                )
            )
    total = sum(item.probability for item in raw)
    return [
        ScorelineProbability(item.home_score, item.away_score, item.probability / total)
        for item in raw
    ]


def outcome_probabilities(scorelines: list[ScorelineProbability]) -> dict[str, float]:
    home = sum(item.probability for item in scorelines if item.home_score > item.away_score)
    draw = sum(item.probability for item in scorelines if item.home_score == item.away_score)
    away = sum(item.probability for item in scorelines if item.home_score < item.away_score)
    total = home + draw + away
    return {
        "home_win": home / total,
        "draw": draw / total,
        "away_win": away / total,
    }


def top_scorelines(
    scorelines: list[ScorelineProbability],
    limit: int = 5,
) -> list[dict[str, float | int]]:
    return [
        {
            "home_score": item.home_score,
            "away_score": item.away_score,
            "probability": round(item.probability, 6),
        }
        for item in sorted(scorelines, key=lambda scoreline: scoreline.probability, reverse=True)[
            :limit
        ]
    ]

