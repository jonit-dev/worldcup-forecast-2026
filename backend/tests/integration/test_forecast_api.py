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
        date(2026, 6, 20),
        datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc),
    )
    return database_path


def test_should_return_forecasts_from_generated_artifacts(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-20")

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
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-20")

    response = create_app().test_client().get("/api/teams/usa/next-forecasts?limit=2")
    forecasts = response.get_json()["forecasts"]

    assert response.status_code == 200
    assert [forecast["match_id"] for forecast in forecasts] == ["2026-GD-005"]
    assert forecasts[0]["expected_goals"]["home"] > 0
    assert "top_scorelines" in forecasts[0]


def test_should_return_next_match_predictions_for_brazil(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-20")

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
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-20")

    response = create_app().test_client().get("/api/simulations?iterations=25&seed=3")
    body = response.get_json()

    assert response.status_code == 200
    assert body["iterations"] == 25
    assert body["seed"] == 3
    assert body["teams"]


def test_should_report_broad_historical_coverage(monkeypatch, tmp_path):
    database_path = ingest_test_database(tmp_path)
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-20")

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
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-20")

    response = create_app().test_client().get("/api/model/evaluation")
    body = response.get_json()

    assert response.status_code == 200
    assert body["training_cutoff"] == "2026-06-10"
    assert body["completed_current_matches_used_for_training"] == 0
    assert body["holdout_match_count"] == 30
    assert body["correct_outcomes"] >= 15
    assert body["outcome_accuracy"] >= body["quality_gate"]["accuracy_threshold"]
    assert body["quality_gate"]["clears_gate"] is True
    assert body["statistical_relevance"]["accuracy_confidence_interval_95"]["low"] < body["outcome_accuracy"]
