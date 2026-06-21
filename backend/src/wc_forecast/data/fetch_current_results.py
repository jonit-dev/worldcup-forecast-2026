from __future__ import annotations

import argparse
import csv
import json
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

from wc_forecast.config.settings import load_settings
from wc_forecast.data.fetch_historical import team_id_for_name
from wc_forecast.data.ingest import read_csv
from wc_forecast.data.sources import CURRENT_MATCHES_SOURCE, STANDINGS_SOURCE


ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"
TOURNAMENT_START_DATE = date(2026, 6, 11)


def fetch_scoreboard(start_date: date, end_date: date) -> list[dict]:
    query = urllib.parse.urlencode(
        {
            "limit": 250,
            "dates": f"{start_date:%Y%m%d}-{end_date:%Y%m%d}",
        }
    )
    with urllib.request.urlopen(f"{ESPN_SCOREBOARD_URL}?{query}", timeout=30) as response:
        return json.loads(response.read().decode("utf-8")).get("events", [])


def completed_results(events: list[dict]) -> dict[frozenset[str], list[tuple[int, int, str, str, date]]]:
    results: dict[frozenset[str], list[tuple[int, int, str, str, date]]] = defaultdict(list)
    for event in events:
        competitions = event.get("competitions") or []
        if not competitions:
            continue
        status = event.get("status", {}).get("type", {})
        if not status.get("completed"):
            continue

        competitors = competitions[0].get("competitors", [])
        if len(competitors) != 2:
            continue

        by_side = {competitor.get("homeAway"): competitor for competitor in competitors}
        home = by_side.get("home")
        away = by_side.get("away")
        if not home or not away:
            continue

        home_team_id = team_id_for_name(home["team"]["displayName"])
        away_team_id = team_id_for_name(away["team"]["displayName"])
        event_date = datetime.fromisoformat(event["date"].replace("Z", "+00:00")).date()
        results[frozenset({home_team_id, away_team_id})].append(
            (
                int(home["score"]),
                int(away["score"]),
                home_team_id,
                away_team_id,
                event_date,
            )
        )
    return results


def update_current_matches(
    raw_dir: Path,
    as_of_date: date,
    results: dict[frozenset[str], list[tuple[int, int, str, str, date]]],
) -> int:
    path = CURRENT_MATCHES_SOURCE.path(raw_dir)
    rows = read_csv(path)
    updated = 0
    for row in rows:
        match_date = date.fromisoformat(row["match_date"])
        if match_date > as_of_date and row["status"] == "complete":
            row["home_score"] = ""
            row["away_score"] = ""
            row["status"] = "scheduled"
            updated += 1
            continue

        key = frozenset({row["home_team_id"], row["away_team_id"]})
        result = next(
            (
                candidate
                for candidate in results.get(key, [])
                if abs((candidate[4] - match_date).days) <= 1
            ),
            None,
        )
        if not result:
            continue

        score_home, score_away, result_home_team_id, result_away_team_id, _event_date = result
        if row["home_team_id"] == result_home_team_id and row["away_team_id"] == result_away_team_id:
            home_score, away_score = score_home, score_away
        elif row["home_team_id"] == result_away_team_id and row["away_team_id"] == result_home_team_id:
            home_score, away_score = score_away, score_home
        else:
            continue

        if row["home_score"] != str(home_score) or row["away_score"] != str(away_score) or row["status"] != "complete":
            updated += 1
        row["home_score"] = str(home_score)
        row["away_score"] = str(away_score)
        row["status"] = "complete"

    write_csv(path, rows, list(rows[0].keys()))
    return updated


def recompute_standings(raw_dir: Path) -> None:
    current_matches = read_csv(CURRENT_MATCHES_SOURCE.path(raw_dir))
    team_groups = {
        row[team_key]: row["group_name"]
        for row in current_matches
        if row["stage"] == "group"
        for team_key in ("home_team_id", "away_team_id")
    }
    stats = {
        team_id: {
            "group_name": group_name,
            "team_id": team_id,
            "played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "goals_for": 0,
            "goals_against": 0,
            "points": 0,
        }
        for team_id, group_name in team_groups.items()
    }

    for row in current_matches:
        if row["stage"] != "group" or row["status"] != "complete":
            continue
        if row["home_score"] == "" or row["away_score"] == "":
            continue

        home = row["home_team_id"]
        away = row["away_team_id"]
        home_score = int(row["home_score"])
        away_score = int(row["away_score"])
        apply_result(stats[home], home_score, away_score)
        apply_result(stats[away], away_score, home_score)

    grouped = defaultdict(list)
    for row in stats.values():
        grouped[row["group_name"]].append(row)

    standings_rows = []
    for group_name in sorted(grouped):
        standings_rows.extend(
            sorted(
                grouped[group_name],
                key=lambda row: (
                    -row["points"],
                    -(row["goals_for"] - row["goals_against"]),
                    -row["goals_for"],
                    row["team_id"],
                ),
            )
        )

    fieldnames = [
        "group_name",
        "team_id",
        "played",
        "wins",
        "draws",
        "losses",
        "goals_for",
        "goals_against",
        "points",
    ]
    write_csv(STANDINGS_SOURCE.path(raw_dir), standings_rows, fieldnames)


def apply_result(team: dict, goals_for: int, goals_against: int) -> None:
    team["played"] += 1
    team["goals_for"] += goals_for
    team["goals_against"] += goals_against
    if goals_for > goals_against:
        team["wins"] += 1
        team["points"] += 3
    elif goals_for == goals_against:
        team["draws"] += 1
        team["points"] += 1
    else:
        team["losses"] += 1


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch current World Cup results from ESPN")
    parser.add_argument("--as-of", default=None, help="Cutoff date in YYYY-MM-DD format")
    args = parser.parse_args()

    settings = load_settings()
    as_of_date = date.fromisoformat(args.as_of) if args.as_of else settings.as_of_date
    raw_dir = settings.data_dir / "raw"
    events = fetch_scoreboard(TOURNAMENT_START_DATE, as_of_date + timedelta(days=1))
    updates = update_current_matches(raw_dir, as_of_date, completed_results(events))
    recompute_standings(raw_dir)
    print(f"updated {updates} current match results from ESPN and recomputed standings")


if __name__ == "__main__":
    main()
