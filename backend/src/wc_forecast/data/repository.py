from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

import duckdb

from wc_forecast.data.schema import connect


def table_exists(connection: duckdb.DuckDBPyConnection, table_name: str) -> bool:
    return (
        connection.execute(
            "select count(*) from information_schema.tables where table_name = ?", [table_name]
        ).fetchone()[0]
        > 0
    )


def load_summary(database_path: Path, as_of_date: date) -> dict[str, Any]:
    if not database_path.exists():
        return {
            "data_status": "not_loaded",
            "last_refresh_at": None,
            "source_count": 0,
            "team_count": 0,
            "match_count": 0,
            "historical_result_count": 0,
        }
    connection = connect(database_path, read_only=True)
    try:
        run = connection.execute(
            """
            select source_fetched_at, match_count, historical_result_count, team_count
            from ingestion_runs
            where as_of_date = ?
            order by created_at desc
            limit 1
            """,
            [as_of_date],
        ).fetchone()
        source_count = connection.execute(
            "select count(*) from source_snapshots where as_of_date = ?", [as_of_date]
        ).fetchone()[0]
        if run is None:
            return {
                "data_status": "not_loaded",
                "last_refresh_at": None,
                "source_count": source_count,
                "team_count": 0,
                "match_count": 0,
                "historical_result_count": 0,
            }
        return {
            "data_status": "loaded",
            "last_refresh_at": run[0].isoformat(),
            "source_count": source_count,
            "match_count": run[1],
            "historical_result_count": run[2],
            "team_count": run[3],
        }
    finally:
        connection.close()


def query_rows(database_path: Path, query: str, parameters: list[Any]) -> list[dict[str, Any]]:
    if not database_path.exists():
        return []
    connection = connect(database_path, read_only=True)
    try:
        result = connection.execute(query, parameters)
        columns = [column[0] for column in result.description]
        return [dict(zip(columns, row, strict=True)) for row in result.fetchall()]
    finally:
        connection.close()


def list_teams(database_path: Path, as_of_date: date) -> list[dict[str, Any]]:
    return query_rows(
        database_path,
        """
        select t.team_id, t.team_name, t.confederation, t.source_name, t.source_fetched_at, t.as_of_date
        from teams t
        join rankings r on r.team_id = t.team_id and r.as_of_date = t.as_of_date
        where t.as_of_date = ?
        order by t.team_name
        """,
        [as_of_date],
    )


def list_matches(database_path: Path, as_of_date: date) -> list[dict[str, Any]]:
    return query_rows(
        database_path,
        """
        select
            m.match_id,
            m.match_date,
            m.stage,
            m.group_name,
            home.team_name as home_team,
            away.team_name as away_team,
            m.home_team_id,
            m.away_team_id,
            m.home_score,
            m.away_score,
            m.status,
            m.neutral_site,
            m.source_name,
            m.source_fetched_at,
            m.as_of_date
        from matches m
        join teams home on home.team_id = m.home_team_id and home.as_of_date = m.as_of_date
        join teams away on away.team_id = m.away_team_id and away.as_of_date = m.as_of_date
        where m.as_of_date = ?
        order by m.match_date, m.match_id
        """,
        [as_of_date],
    )


def list_standings(database_path: Path, as_of_date: date) -> list[dict[str, Any]]:
    return query_rows(
        database_path,
        """
        select
            s.group_name,
            s.team_id,
            t.team_name,
            s.played,
            s.wins,
            s.draws,
            s.losses,
            s.goals_for,
            s.goals_against,
            s.points,
            s.source_fetched_at,
            s.as_of_date
        from standings s
        join teams t on t.team_id = s.team_id and t.as_of_date = s.as_of_date
        where s.as_of_date = ?
        order by s.group_name, s.points desc, (s.goals_for - s.goals_against) desc, s.goals_for desc
        """,
        [as_of_date],
    )


def list_team_history(database_path: Path, as_of_date: date, team_id: str) -> list[dict[str, Any]]:
    return query_rows(
        database_path,
        """
        select *
        from historical_results
        where as_of_date = ?
          and (home_team_id = ? or away_team_id = ?)
        order by match_date desc
        """,
        [as_of_date, team_id, team_id],
    )


def list_historical_results(database_path: Path, as_of_date: date) -> list[dict[str, Any]]:
    return query_rows(
        database_path,
        """
        select *
        from historical_results
        where as_of_date = ?
          and match_date <= ?
        order by match_date
        """,
        [as_of_date, as_of_date],
    )


def list_rankings(database_path: Path, as_of_date: date) -> list[dict[str, Any]]:
    return query_rows(
        database_path,
        """
        select *
        from rankings
        where as_of_date = ?
          and ranking_date <= ?
        order by ranking_date desc, rank
        """,
        [as_of_date, as_of_date],
    )
