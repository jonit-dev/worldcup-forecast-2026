from __future__ import annotations

import math
from datetime import date, timedelta
from pathlib import Path

from wc_forecast.data.repository import list_historical_results, list_matches, list_rankings
from wc_forecast.models.forecast import MODEL_VERSION, build_inputs, config_hash, forecast_matches

TOURNAMENT_START_DATE = date(2026, 6, 11)
DECENT_ACCURACY_THRESHOLD = 0.55
DECENT_LOG_LOSS_THRESHOLD = 1.05


def actual_outcome(match: dict) -> str:
    if match["home_score"] > match["away_score"]:
        return "home_win"
    if match["home_score"] < match["away_score"]:
        return "away_win"
    return "draw"


def wilson_interval(successes: int, total: int, z_value: float = 1.96) -> dict[str, float] | None:
    if total == 0:
        return None
    proportion = successes / total
    denominator = 1 + z_value**2 / total
    center = (proportion + z_value**2 / (2 * total)) / denominator
    margin = (
        z_value
        * math.sqrt((proportion * (1 - proportion) + z_value**2 / (4 * total)) / total)
        / denominator
    )
    return {"low": round(max(0.0, center - margin), 6), "high": round(min(1.0, center + margin), 6)}


def binomial_tail_probability(successes: int, total: int, null_probability: float) -> float | None:
    if total == 0:
        return None
    probability = sum(
        math.comb(total, count)
        * null_probability**count
        * (1 - null_probability) ** (total - count)
        for count in range(successes, total + 1)
    )
    return round(probability, 8)


def evaluate_pre_tournament_model(database_path: Path, as_of_date: date) -> dict:
    training_cutoff = TOURNAMENT_START_DATE - timedelta(days=1)
    matches = list_matches(database_path, as_of_date)
    rankings = list_rankings(database_path, as_of_date)
    historical_results = [
        row
        for row in list_historical_results(database_path, as_of_date)
        if row["match_date"] <= training_cutoff
    ]
    holdout_matches = [
        match
        for match in matches
        if match["status"] == "complete"
        and match["match_date"] >= TOURNAMENT_START_DATE
        and match["match_date"] <= as_of_date
        and match["home_score"] is not None
        and match["away_score"] is not None
    ]

    inputs = build_inputs(rankings, historical_results, [], training_cutoff)
    forecasts = forecast_matches(holdout_matches, inputs)
    rows = [_score_forecast(forecast) for forecast in forecasts]
    count = len(rows)
    correct = sum(1 for row in rows if row["correct_outcome"])
    log_loss = sum(row["actual_log_loss"] for row in rows) / count if count else None
    brier = sum(row["brier_score"] for row in rows) / count if count else None
    exact_scoreline = sum(1 for row in rows if row["top_scoreline_correct"])
    average_actual_probability = (
        sum(row["actual_outcome_probability"] for row in rows) / count if count else None
    )
    outcome_accuracy = correct / count if count else None
    clears_gate = (
        outcome_accuracy is not None
        and log_loss is not None
        and outcome_accuracy >= DECENT_ACCURACY_THRESHOLD
        and log_loss <= DECENT_LOG_LOSS_THRESHOLD
    )

    return {
        "model_version": MODEL_VERSION,
        "config_hash": config_hash(training_cutoff),
        "as_of_date": as_of_date,
        "tournament_start_date": TOURNAMENT_START_DATE,
        "training_cutoff": training_cutoff,
        "completed_current_matches_used_for_training": 0,
        "historical_result_rows_used_for_training": len(historical_results),
        "holdout_match_count": count,
        "correct_outcomes": correct,
        "outcome_accuracy": outcome_accuracy,
        "log_loss": log_loss,
        "brier_score": brier,
        "exact_top_scoreline_accuracy": exact_scoreline / count if count else None,
        "average_actual_outcome_probability": average_actual_probability,
        "quality_gate": {
            "label": "decent_holdout_check" if clears_gate else "needs_iteration",
            "accuracy_threshold": DECENT_ACCURACY_THRESHOLD,
            "log_loss_threshold": DECENT_LOG_LOSS_THRESHOLD,
            "clears_gate": clears_gate,
        },
        "statistical_relevance": {
            "accuracy_confidence_interval_95": wilson_interval(correct, count),
            "chance_baseline_accuracy": 1 / 3,
            "chance_baseline_p_value": binomial_tail_probability(correct, count, 1 / 3),
            "warning": (
                "This World Cup holdout is useful for leakage checks, but it is too small to tune "
                "model parameters without overfitting."
            ),
        },
        "rows": rows,
        "note": (
            "Backtest trains on rankings and historical matches available before the tournament, "
            "then scores completed World Cup matches through the selected as-of date."
        ),
    }


def _score_forecast(forecast: dict) -> dict:
    actual = actual_outcome(forecast)
    probabilities = forecast["probabilities"]
    predicted = max(probabilities, key=probabilities.get)
    actual_probability = max(probabilities[actual], 1e-12)
    top_scoreline = forecast["top_scorelines"][0]
    scoreline_correct = (
        top_scoreline["home_score"] == forecast["home_score"]
        and top_scoreline["away_score"] == forecast["away_score"]
    )
    return {
        "match_id": forecast["match_id"],
        "match_date": forecast["match_date"],
        "home_team_id": forecast["home_team_id"],
        "away_team_id": forecast["away_team_id"],
        "home_team": forecast["home_team"],
        "away_team": forecast["away_team"],
        "actual_score": {"home": forecast["home_score"], "away": forecast["away_score"]},
        "actual_outcome": actual,
        "predicted_outcome": predicted,
        "correct_outcome": predicted == actual,
        "actual_outcome_probability": round(actual_probability, 6),
        "actual_log_loss": round(-math.log(actual_probability), 6),
        "brier_score": round(
            sum(
                (probabilities[outcome] - (1.0 if outcome == actual else 0.0)) ** 2
                for outcome in ("home_win", "draw", "away_win")
            ),
            6,
        ),
        "probabilities": probabilities,
        "expected_goals": forecast["expected_goals"],
        "top_scoreline": top_scoreline,
        "top_scoreline_correct": scoreline_correct,
    }
