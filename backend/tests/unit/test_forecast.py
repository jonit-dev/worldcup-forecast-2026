from datetime import date

from wc_forecast.models.forecast import ForecastInputs, expected_goals, forecast_match
from wc_forecast.models.ratings import TeamRating


def match_row() -> dict:
    return {
        "match_id": "test-1",
        "match_date": date(2026, 6, 20),
        "stage": "group",
        "group_name": "A",
        "home_team_id": "favorite",
        "away_team_id": "underdog",
        "home_team": "Favorite",
        "away_team": "Underdog",
        "status": "scheduled",
        "home_score": None,
        "away_score": None,
        "neutral_site": True,
    }


def test_should_produce_probabilities_summing_to_one_when_match_is_valid():
    inputs = ForecastInputs(
        ratings={
            "favorite": TeamRating("favorite", 1700, 1.2, 0.9, 10),
            "underdog": TeamRating("underdog", 1500, 1.0, 1.1, 10),
        },
        as_of_date=date(2026, 6, 20),
    )

    forecast = forecast_match(match_row(), inputs)
    probabilities = forecast["probabilities"]

    assert sum(probabilities.values()) == 1.0


def test_should_increase_favorite_odds_when_rating_gap_increases():
    close_inputs = ForecastInputs(
        ratings={
            "favorite": TeamRating("favorite", 1550, 1.0, 1.0, 10),
            "underdog": TeamRating("underdog", 1500, 1.0, 1.0, 10),
        },
        as_of_date=date(2026, 6, 20),
    )
    wide_inputs = ForecastInputs(
        ratings={
            "favorite": TeamRating("favorite", 1800, 1.0, 1.0, 10),
            "underdog": TeamRating("underdog", 1400, 1.0, 1.0, 10),
        },
        as_of_date=date(2026, 6, 20),
    )

    close = forecast_match(match_row(), close_inputs)
    wide = forecast_match(match_row(), wide_inputs)

    assert wide["probabilities"]["home_win"] > close["probabilities"]["home_win"]


def test_should_cap_public_forecast_probability():
    inputs = ForecastInputs(
        ratings={
            "favorite": TeamRating("favorite", 2300, 2.2, 0.5, 10, 2.0, 70.0),
            "underdog": TeamRating("underdog", 1100, 0.6, 2.2, 10, -2.0, -70.0),
        },
        as_of_date=date(2026, 6, 20),
    )

    forecast = forecast_match(match_row(), inputs)

    assert max(forecast["probabilities"].values()) <= 0.65
    assert max(forecast["raw_probabilities"].values()) > max(forecast["probabilities"].values())


def test_should_return_precise_expected_goals_within_bounds():
    home = TeamRating("home", 1800, 1.6, 0.8, 12)
    away = TeamRating("away", 1400, 0.8, 1.3, 12)

    home_xg, away_xg = expected_goals(home, away, neutral_site=True)

    assert isinstance(home_xg, float)
    assert isinstance(away_xg, float)
    assert 0.15 <= home_xg <= 4.5
    assert 0.15 <= away_xg <= 4.5
