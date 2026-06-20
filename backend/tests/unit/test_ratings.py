from datetime import date, timedelta

from wc_forecast.models.ratings import calculate_recent_goal_rates


def result(day: int, home: str, away: str, home_score: int, away_score: int) -> dict:
    return {
        "match_date": date(2026, 1, 1) + timedelta(days=day - 1),
        "home_team_id": home,
        "away_team_id": away,
        "home_score": home_score,
        "away_score": away_score,
    }


def test_recent_goal_rates_use_recent_matches_with_shrinkage():
    old_high_scoring = [result(day, "team-a", "team-b", 5, 0) for day in range(1, 6)]
    recent_low_scoring = [result(day, "team-a", "team-b", 1, 1) for day in range(6, 46)]

    attack, defense = calculate_recent_goal_rates(
        old_high_scoring + recent_low_scoring,
        "team-a",
        date(2026, 2, 28),
    )

    assert attack < 1.0
    assert defense < 1.0
    assert round(attack, 3) == 0.827
    assert round(defense, 3) == 0.827
