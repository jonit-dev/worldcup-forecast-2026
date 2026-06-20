from wc_forecast.models.simulate import simulate_group_paths


def sample_forecasts() -> list[dict]:
    return [
        {
            "stage": "group",
            "status": "scheduled",
            "home_team_id": "a",
            "away_team_id": "b",
            "probabilities": {"home_win": 0.5, "draw": 0.25, "away_win": 0.25},
        },
        {
            "stage": "group",
            "status": "scheduled",
            "home_team_id": "c",
            "away_team_id": "d",
            "probabilities": {"home_win": 0.4, "draw": 0.3, "away_win": 0.3},
        },
    ]


def sample_standings() -> list[dict]:
    return [
        {"team_id": "a", "group_name": "A", "points": 0, "goals_for": 0, "goals_against": 0},
        {"team_id": "b", "group_name": "A", "points": 0, "goals_for": 0, "goals_against": 0},
        {"team_id": "c", "group_name": "A", "points": 0, "goals_for": 0, "goals_against": 0},
        {"team_id": "d", "group_name": "A", "points": 0, "goals_for": 0, "goals_against": 0},
    ]


def test_should_produce_stable_probabilities_when_seeded():
    first = simulate_group_paths(sample_forecasts(), sample_standings(), iterations=50, seed=7)
    second = simulate_group_paths(sample_forecasts(), sample_standings(), iterations=50, seed=7)

    assert first == second


def test_should_conserve_two_advancers_per_group_simulation():
    result = simulate_group_paths(sample_forecasts(), sample_standings(), iterations=100, seed=9)

    total_advancement_probability = sum(team["advance_probability"] for team in result.teams)

    assert total_advancement_probability == 2.0

