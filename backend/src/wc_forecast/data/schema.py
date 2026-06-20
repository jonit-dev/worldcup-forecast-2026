from __future__ import annotations

from pathlib import Path

import duckdb


def connect(database_path: Path) -> duckdb.DuckDBPyConnection:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(database_path))


def initialize_schema(connection: duckdb.DuckDBPyConnection) -> None:
    connection.execute(
        """
        create table if not exists source_snapshots (
            snapshot_id varchar primary key,
            source_name varchar not null,
            source_url varchar not null,
            source_fetched_at timestamp not null,
            as_of_date date not null,
            raw_path varchar not null
        )
        """
    )
    connection.execute(
        """
        create table if not exists teams (
            team_id varchar primary key,
            team_name varchar not null,
            confederation varchar not null,
            source_name varchar not null,
            source_url varchar not null,
            source_fetched_at timestamp not null,
            as_of_date date not null
        )
        """
    )
    connection.execute(
        """
        create table if not exists matches (
            match_id varchar primary key,
            match_date date not null,
            stage varchar not null,
            group_name varchar,
            home_team_id varchar not null,
            away_team_id varchar not null,
            home_score integer,
            away_score integer,
            status varchar not null,
            neutral_site boolean not null,
            source_name varchar not null,
            source_url varchar not null,
            source_fetched_at timestamp not null,
            as_of_date date not null
        )
        """
    )
    connection.execute(
        """
        create table if not exists standings (
            standing_id varchar primary key,
            group_name varchar not null,
            team_id varchar not null,
            played integer not null,
            wins integer not null,
            draws integer not null,
            losses integer not null,
            goals_for integer not null,
            goals_against integer not null,
            points integer not null,
            source_name varchar not null,
            source_url varchar not null,
            source_fetched_at timestamp not null,
            as_of_date date not null
        )
        """
    )
    connection.execute(
        """
        create table if not exists rankings (
            ranking_id varchar primary key,
            ranking_date date not null,
            team_id varchar not null,
            rank integer not null,
            rating_points double not null,
            source_name varchar not null,
            source_url varchar not null,
            source_fetched_at timestamp not null,
            as_of_date date not null
        )
        """
    )
    connection.execute(
        """
        create table if not exists historical_results (
            result_id varchar primary key,
            match_date date not null,
            home_team_id varchar not null,
            away_team_id varchar not null,
            home_score integer not null,
            away_score integer not null,
            tournament varchar not null,
            neutral_site boolean not null,
            source_name varchar not null,
            source_url varchar not null,
            source_fetched_at timestamp not null,
            as_of_date date not null
        )
        """
    )
    connection.execute(
        """
        create table if not exists ingestion_runs (
            run_id varchar primary key,
            as_of_date date not null,
            source_fetched_at timestamp not null,
            match_count integer not null,
            historical_result_count integer not null,
            team_count integer not null,
            created_at timestamp default current_timestamp
        )
        """
    )

