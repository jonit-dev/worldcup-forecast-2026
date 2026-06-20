from __future__ import annotations

import argparse
import csv
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterable

from wc_forecast.config.settings import load_settings
from wc_forecast.data.schema import connect, initialize_schema
from wc_forecast.data.sources import (
    ALL_SOURCES,
    CURRENT_MATCHES_SOURCE,
    HISTORICAL_RESULTS_SOURCE,
    RANKINGS_SOURCE,
    STANDINGS_SOURCE,
    SourceFile,
)


class DataValidationError(ValueError):
    pass


@dataclass(frozen=True)
class IngestResult:
    database_path: Path
    as_of_date: date
    team_count: int
    match_count: int
    historical_result_count: int
    run_id: str


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Missing source snapshot: {path}")
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def parse_optional_int(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "y"}


def validate_score_pair(home_score: int | None, away_score: int | None, context: str) -> None:
    scores = (home_score, away_score)
    if any(score is not None and score < 0 for score in scores):
        raise DataValidationError(f"{context} has an impossible negative score")
    if (home_score is None) != (away_score is None):
        raise DataValidationError(f"{context} has only one score populated")


def validate_current_matches(rows: Iterable[dict[str, str]], as_of_date: date) -> None:
    materialized = list(rows)
    match_ids = [row["match_id"] for row in materialized]
    duplicates = [match_id for match_id, count in Counter(match_ids).items() if count > 1]
    if duplicates:
        raise DataValidationError(f"Duplicate current match IDs: {', '.join(sorted(duplicates))}")

    for row in materialized:
        match_date = date.fromisoformat(row["match_date"])
        home_score = parse_optional_int(row.get("home_score"))
        away_score = parse_optional_int(row.get("away_score"))
        context = f"match {row['match_id']}"
        validate_score_pair(home_score, away_score, context)
        if match_date > as_of_date and home_score is not None:
            raise DataValidationError(f"{context} leaks a result after as_of_date {as_of_date}")


def validate_historical_results(rows: Iterable[dict[str, str]], as_of_date: date) -> None:
    materialized = list(rows)
    result_ids = [row["result_id"] for row in materialized]
    duplicates = [result_id for result_id, count in Counter(result_ids).items() if count > 1]
    if duplicates:
        raise DataValidationError(f"Duplicate historical result IDs: {', '.join(sorted(duplicates))}")

    for row in materialized:
        match_date = date.fromisoformat(row["match_date"])
        home_score = int(row["home_score"])
        away_score = int(row["away_score"])
        context = f"historical result {row['result_id']}"
        validate_score_pair(home_score, away_score, context)
        if match_date > as_of_date:
            raise DataValidationError(f"{context} leaks a result after as_of_date {as_of_date}")


def source_metadata(source: SourceFile, raw_dir: Path, as_of_date: date, fetched_at: datetime) -> tuple:
    return (
        f"{source.name}:{as_of_date.isoformat()}",
        source.name,
        source.url,
        fetched_at,
        as_of_date,
        str(source.path(raw_dir)),
    )


def ingest_snapshots(
    database_path: Path,
    raw_dir: Path,
    as_of_date: date,
    fetched_at: datetime | None = None,
) -> IngestResult:
    fetched_at = fetched_at or datetime.now(timezone.utc)
    current_matches = read_csv(CURRENT_MATCHES_SOURCE.path(raw_dir))
    historical_results = read_csv(HISTORICAL_RESULTS_SOURCE.path(raw_dir))
    rankings = read_csv(RANKINGS_SOURCE.path(raw_dir))
    standings = read_csv(STANDINGS_SOURCE.path(raw_dir))

    validate_current_matches(current_matches, as_of_date)
    validate_historical_results(historical_results, as_of_date)

    ranking_team_ids = {row["team_id"] for row in rankings}
    standing_team_ids = {row["team_id"] for row in standings}
    if len(ranking_team_ids) != 48:
        raise DataValidationError(f"Expected 48 ranking teams, found {len(ranking_team_ids)}")
    if standing_team_ids != ranking_team_ids:
        missing = ranking_team_ids - standing_team_ids
        extra = standing_team_ids - ranking_team_ids
        raise DataValidationError(
            f"Standings/rankings team mismatch. Missing: {sorted(missing)} Extra: {sorted(extra)}"
        )

    team_ids = {
        row["home_team_id"] for row in current_matches + historical_results
    } | {row["away_team_id"] for row in current_matches + historical_results}
    team_ids |= {row["team_id"] for row in rankings + standings}

    missing_team_ids = {
        team_id for row in current_matches + historical_results for team_id in (
            row["home_team_id"],
            row["away_team_id"],
        )
        if team_id not in team_ids
    }
    if missing_team_ids:
        raise DataValidationError(f"Missing team IDs: {', '.join(sorted(missing_team_ids))}")

    connection = connect(database_path)
    try:
        initialize_schema(connection)
        for table in (
            "source_snapshots",
            "teams",
            "matches",
            "standings",
            "rankings",
            "historical_results",
            "ingestion_runs",
        ):
            connection.execute(f"delete from {table} where as_of_date = ?", [as_of_date])

        connection.executemany(
            "insert into source_snapshots values (?, ?, ?, ?, ?, ?)",
            [source_metadata(source, raw_dir, as_of_date, fetched_at) for source in ALL_SOURCES],
        )

        team_rows = []
        team_names = {row["home_team_id"]: row["home_team"] for row in current_matches}
        team_names.update({row["away_team_id"]: row["away_team"] for row in current_matches})
        team_names.update({row["team_id"]: row["team_name"] for row in rankings})
        for team_id in sorted(team_ids):
            team_rows.append(
                (
                    team_id,
                    team_names.get(team_id, team_id.replace("-", " ").title()),
                    "unknown",
                    CURRENT_MATCHES_SOURCE.name,
                    CURRENT_MATCHES_SOURCE.url,
                    fetched_at,
                    as_of_date,
                )
            )
        connection.executemany("insert into teams values (?, ?, ?, ?, ?, ?, ?)", team_rows)

        match_rows = [
            (
                row["match_id"],
                date.fromisoformat(row["match_date"]),
                row["stage"],
                row["group_name"] or None,
                row["home_team_id"],
                row["away_team_id"],
                parse_optional_int(row.get("home_score")),
                parse_optional_int(row.get("away_score")),
                row["status"],
                parse_bool(row["neutral_site"]),
                CURRENT_MATCHES_SOURCE.name,
                CURRENT_MATCHES_SOURCE.url,
                fetched_at,
                as_of_date,
            )
            for row in current_matches
        ]
        connection.executemany(
            "insert into matches values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            match_rows,
        )

        standing_rows = [
            (
                f"{as_of_date.isoformat()}:{row['group_name']}:{row['team_id']}",
                row["group_name"],
                row["team_id"],
                int(row["played"]),
                int(row["wins"]),
                int(row["draws"]),
                int(row["losses"]),
                int(row["goals_for"]),
                int(row["goals_against"]),
                int(row["points"]),
                STANDINGS_SOURCE.name,
                STANDINGS_SOURCE.url,
                fetched_at,
                as_of_date,
            )
            for row in standings
        ]
        connection.executemany(
            "insert into standings values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            standing_rows,
        )

        ranking_rows = [
            (
                f"{row['ranking_date']}:{row['team_id']}",
                date.fromisoformat(row["ranking_date"]),
                row["team_id"],
                int(row["rank"]),
                float(row["rating_points"]),
                RANKINGS_SOURCE.name,
                RANKINGS_SOURCE.url,
                fetched_at,
                as_of_date,
            )
            for row in rankings
        ]
        connection.executemany(
            "insert into rankings values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ranking_rows,
        )

        historical_rows = [
            (
                row["result_id"],
                date.fromisoformat(row["match_date"]),
                row["home_team_id"],
                row["away_team_id"],
                int(row["home_score"]),
                int(row["away_score"]),
                row["tournament"],
                parse_bool(row["neutral_site"]),
                HISTORICAL_RESULTS_SOURCE.name,
                HISTORICAL_RESULTS_SOURCE.url,
                fetched_at,
                as_of_date,
            )
            for row in historical_results
        ]
        connection.executemany(
            "insert into historical_results values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            historical_rows,
        )

        run_id = f"manual:{as_of_date.isoformat()}"
        connection.execute(
            "insert into ingestion_runs values (?, ?, ?, ?, ?, ?, current_timestamp)",
            [run_id, as_of_date, fetched_at, len(match_rows), len(historical_rows), len(team_rows)],
        )
        return IngestResult(
            database_path=database_path,
            as_of_date=as_of_date,
            team_count=len(team_rows),
            match_count=len(match_rows),
            historical_result_count=len(historical_rows),
            run_id=run_id,
        )
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest local World Cup forecast snapshots")
    parser.add_argument("--as-of", dest="as_of", help="Forecast cutoff date in YYYY-MM-DD format")
    args = parser.parse_args()
    settings = load_settings()
    as_of_date = date.fromisoformat(args.as_of) if args.as_of else settings.as_of_date
    result = ingest_snapshots(settings.database_path, settings.data_dir / "raw", as_of_date)
    print(
        f"ingested {result.match_count} matches, {result.historical_result_count} historical "
        f"results, {result.team_count} teams into {result.database_path}"
    )


if __name__ == "__main__":
    main()
