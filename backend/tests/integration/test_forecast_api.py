from datetime import date, datetime, timezone
from pathlib import Path

from wc_forecast.api.app import create_app
from wc_forecast.data.ingest import ingest_snapshots


def ingest_test_database(tmp_path: Path) -> Path:
    raw_dir = tmp_path / "raw"
    raw_dir.mkdir()
    project_raw = Path(__file__).resolve().parents[3] / "data" / "raw"
    for source_path in project_raw.glob("*_sample.csv"):
        (raw_dir / source_path.name).write_text(source_path.read_text(encoding="utf-8"), encoding="utf-8")
    database_path = tmp_path / "worldcup_forecast.duckdb"
    ingest_snapshots(
        database_path,
        raw_dir,
        date(2026, 6, 23),
        datetime(2026, 6, 23, 12, 0, tzinfo=timezone.utc),
    )
    return database_path


def test_should_return_forecasts_from_generated_artifacts(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    response = create_app().test_client().get("/api/forecasts")
    forecasts = response.get_json()["forecasts"]

    assert response.status_code == 200
    assert forecasts
    assert forecasts[0]["model"]["version"].startswith("elo-form-calibrated")
    assert sum(forecasts[0]["probabilities"].values()) == 1.0
    assert "home_form_adjustment" in forecasts[0]["model_inputs"]


def test_should_return_next_match_predictions_for_selected_team(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    response = create_app().test_client().get("/api/teams/usa/next-forecasts?limit=2")
    forecasts = response.get_json()["forecasts"]

    assert response.status_code == 200
    assert [forecast["match_id"] for forecast in forecasts] == ["2026-GD-005"]
    assert forecasts[0]["expected_goals"]["home"] > 0
    assert "top_scorelines" in forecasts[0]


def test_should_return_probable_future_opponents_for_selected_team(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    response = create_app().test_client().get("/api/teams/usa/potential-opponents?limit=4")
    body = response.get_json()

    assert response.status_code == 200
    assert body["team_id"] == "usa"
    assert body["opponents"]
    assert len(body["opponents"]) <= 4
    assert all(opponent["team_id"] != "usa" for opponent in body["opponents"])
    assert all(opponent["estimated_match_probability"] > 0 for opponent in body["opponents"])
    assert body["opponents"] == sorted(
        body["opponents"],
        key=lambda opponent: opponent["estimated_match_probability"],
        reverse=True,
    )
    rounded_path_chances = {
        round(opponent["estimated_match_probability"], 4) for opponent in body["opponents"]
    }
    assert len(rounded_path_chances) > 1
    assert {
        "team_id",
        "team_name",
        "group_name",
        "estimated_match_probability",
        "advance_probability",
        "selected_team_win_probability",
        "draw_probability",
        "opponent_win_probability",
        "expected_goals",
        "top_scoreline",
    } <= set(body["opponents"][0])


def test_should_return_next_match_predictions_for_brazil(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    response = create_app().test_client().get("/api/teams/brazil/next-forecasts?limit=2")
    forecasts = response.get_json()["forecasts"]

    assert response.status_code == 200
    assert forecasts
    assert all(
        forecast["home_team_id"] == "brazil" or forecast["away_team_id"] == "brazil"
        for forecast in forecasts
    )


def test_should_return_seeded_simulation(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    response = create_app().test_client().get("/api/simulations?iterations=25&seed=3")
    body = response.get_json()

    assert response.status_code == 200
    assert body["iterations"] == 25
    assert body["seed"] == 3
    assert body["teams"]


def test_should_return_tournament_overview_for_dedicated_pages(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    response = create_app().test_client().get("/api/tournament/overview")
    body = response.get_json()

    assert response.status_code == 200
    assert body["match_counts"]["upcoming"] > 0
    assert body["team_count"] == 48
    assert body["title_leader"]["team_id"]
    assert body["champion_odds"]
    assert body["featured_matches"]
    assert body["group_leaders"]


def test_should_report_broad_historical_coverage(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    response = create_app().test_client().get("/api/model/diagnostics")
    body = response.get_json()

    assert response.status_code == 200
    assert body["team_coverage"]["team_count"] == 48
    assert body["team_coverage"]["min_matches"] >= body["coverage_threshold"]
    assert body["team_coverage"]["teams_below_threshold"] == []


def test_should_backtest_as_if_tournament_had_not_started(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    response = create_app().test_client().get("/api/model/evaluation")
    body = response.get_json()

    assert response.status_code == 200
    assert body["training_cutoff"] == "2026-06-10"
    assert body["completed_current_matches_used_for_training"] == 0
    assert body["holdout_match_count"] >= 40
    assert body["correct_outcomes"] >= 15
    assert body["outcome_accuracy"] >= body["quality_gate"]["accuracy_threshold"]
    assert body["quality_gate"]["clears_gate"] is True
    assert body["statistical_relevance"]["accuracy_confidence_interval_95"]["low"] < body["outcome_accuracy"]
