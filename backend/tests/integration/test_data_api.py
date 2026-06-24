from datetime import date, datetime, timezone
from pathlib import Path

from wc_forecast.api.app import create_app
from wc_forecast.data.ingest import ingest_snapshots


def copy_sample_raw_files(raw_dir: Path) -> None:
    project_raw = Path(__file__).resolve().parents[3] / "data" / "raw"
    raw_dir.mkdir()
    for source_path in project_raw.glob("*_sample.csv"):
        (raw_dir / source_path.name).write_text(source_path.read_text(encoding="utf-8"), encoding="utf-8")


def test_should_expose_loaded_summary_and_team_match_data(monkeypatch, tmp_path):
    raw_dir = tmp_path / "raw"
    database_path = tmp_path / "worldcup_forecast.duckdb"
    copy_sample_raw_files(raw_dir)
    ingest_snapshots(
        database_path,
        raw_dir,
        date(2026, 6, 23),
        datetime(2026, 6, 23, 12, 0, tzinfo=timezone.utc),
    )
    monkeypatch.setenv("WC_FORECAST_DATABASE", str(database_path))
    monkeypatch.setenv("WC_FORECAST_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("WC_FORECAST_AS_OF_DATE", "2026-06-23")

    client = create_app().test_client()

    summary = client.get("/api/summary").get_json()
    teams = client.get("/api/teams").get_json()["teams"]
    usa_matches = client.get("/api/matches?team_id=usa").get_json()["matches"]
    standings = client.get("/api/standings").get_json()["standings"]

    assert summary["data_status"] == "loaded"
    assert summary["match_count"] == 72
    assert summary["team_count"] == 48
    assert summary["historical_result_count"] >= 12000
    assert any(team["team_id"] == "usa" for team in teams)
    assert [match["match_id"] for match in usa_matches] == [
        "2026-GD-001",
        "2026-GD-004",
        "2026-GD-005",
    ]
    assert any(team["team_id"] == "brazil" for team in teams)
    assert {row["group_name"] for row in standings} == set("ABCDEFGHIJKL")
