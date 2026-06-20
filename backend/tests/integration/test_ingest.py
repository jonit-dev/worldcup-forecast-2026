from datetime import date, datetime, timezone

import duckdb

from wc_forecast.data.ingest import ingest_snapshots


def test_should_load_sample_matches_when_source_files_exist(tmp_path):
    database_path = tmp_path / "worldcup_forecast.duckdb"
    raw_dir = tmp_path / "raw"
    raw_dir.mkdir()
    project_raw = __import__("pathlib").Path(__file__).resolve().parents[3] / "data" / "raw"
    for source_path in project_raw.glob("*_sample.csv"):
        (raw_dir / source_path.name).write_text(source_path.read_text(encoding="utf-8"), encoding="utf-8")

    result = ingest_snapshots(
        database_path,
        raw_dir,
        date(2026, 6, 20),
        datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc),
    )

    assert result.match_count == 72
    assert result.historical_result_count >= 12000
    assert result.team_count == 48
    connection = duckdb.connect(str(database_path))
    try:
        assert connection.execute("select count(*) from matches").fetchone()[0] == 72
        assert connection.execute("select count(distinct group_name) from matches").fetchone()[0] == 12
        assert connection.execute("select count(*) from teams").fetchone()[0] == 48
        assert connection.execute("select count(*) from source_snapshots").fetchone()[0] == 4
    finally:
        connection.close()


def test_should_be_idempotent_for_same_source_snapshot(tmp_path):
    database_path = tmp_path / "worldcup_forecast.duckdb"
    raw_dir = tmp_path / "raw"
    raw_dir.mkdir()
    project_raw = __import__("pathlib").Path(__file__).resolve().parents[3] / "data" / "raw"
    for source_path in project_raw.glob("*_sample.csv"):
        (raw_dir / source_path.name).write_text(source_path.read_text(encoding="utf-8"), encoding="utf-8")

    kwargs = {
        "database_path": database_path,
        "raw_dir": raw_dir,
        "as_of_date": date(2026, 6, 20),
        "fetched_at": datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc),
    }
    ingest_snapshots(**kwargs)
    ingest_snapshots(**kwargs)

    connection = duckdb.connect(str(database_path))
    try:
        assert connection.execute("select count(*) from matches").fetchone()[0] == 72
        assert connection.execute("select count(*) from ingestion_runs").fetchone()[0] == 1
    finally:
        connection.close()
