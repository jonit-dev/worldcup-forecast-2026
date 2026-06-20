from __future__ import annotations

import argparse
import csv
import hashlib
import urllib.request
from datetime import date
from pathlib import Path

from wc_forecast.config.settings import load_settings
from wc_forecast.data.ingest import read_csv
from wc_forecast.data.sources import HISTORICAL_RESULTS_SOURCE, RANKINGS_SOURCE


RAW_RESULTS_URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
DEFAULT_START_DATE = date(2020, 1, 1)

TEAM_NAME_TO_ID = {
    "Algeria": "algeria",
    "Argentina": "argentina",
    "Australia": "australia",
    "Austria": "austria",
    "Belgium": "belgium",
    "Bosnia and Herzegovina": "bosnia-herzegovina",
    "Brazil": "brazil",
    "Cabo Verde": "cabo-verde",
    "Canada": "canada",
    "Colombia": "colombia",
    "Congo DR": "congo-dr",
    "Croatia": "croatia",
    "Curaçao": "curacao",
    "Curacao": "curacao",
    "Czech Republic": "czechia",
    "Czechia": "czechia",
    "Ecuador": "ecuador",
    "Egypt": "egypt",
    "England": "england",
    "France": "france",
    "Germany": "germany",
    "Ghana": "ghana",
    "Haiti": "haiti",
    "Iran": "iran",
    "Iraq": "iraq",
    "Ivory Coast": "ivory-coast",
    "Japan": "japan",
    "Jordan": "jordan",
    "Mexico": "mexico",
    "Morocco": "morocco",
    "Netherlands": "netherlands",
    "New Zealand": "new-zealand",
    "Norway": "norway",
    "Panama": "panama",
    "Paraguay": "paraguay",
    "Portugal": "portugal",
    "Qatar": "qatar",
    "Saudi Arabia": "saudi-arabia",
    "Scotland": "scotland",
    "Senegal": "senegal",
    "South Africa": "south-africa",
    "South Korea": "south-korea",
    "Korea Republic": "south-korea",
    "Spain": "spain",
    "Sweden": "sweden",
    "Switzerland": "switzerland",
    "Tunisia": "tunisia",
    "Turkey": "turkiye",
    "Türkiye": "turkiye",
    "Turkiye": "turkiye",
    "United States": "usa",
    "USA": "usa",
    "Uruguay": "uruguay",
    "Uzbekistan": "uzbekistan",
}


def tournament_team_ids(raw_dir: Path) -> set[str]:
    return {row["team_id"] for row in read_csv(RANKINGS_SOURCE.path(raw_dir))}


def stable_result_id(row: dict[str, str], home_team_id: str, away_team_id: str) -> str:
    payload = "|".join(
        [
            row["date"],
            home_team_id,
            away_team_id,
            row["home_score"],
            row["away_score"],
            row["tournament"],
        ]
    )
    return f"hist-{hashlib.sha1(payload.encode('utf-8')).hexdigest()[:12]}"


def fetch_rows(url: str) -> list[dict[str, str]]:
    with urllib.request.urlopen(url, timeout=30) as response:
        content = response.read().decode("utf-8")
    return list(csv.DictReader(content.splitlines()))


def transform_results(
    rows: list[dict[str, str]],
    team_ids: set[str],
    start_date: date,
    as_of_date: date,
) -> list[dict[str, str]]:
    transformed: list[dict[str, str]] = []
    for row in rows:
        match_date = date.fromisoformat(row["date"])
        if match_date < start_date or match_date > as_of_date:
            continue
        if not row["home_score"].isdigit() or not row["away_score"].isdigit():
            continue
        home_team_id = TEAM_NAME_TO_ID.get(row["home_team"])
        away_team_id = TEAM_NAME_TO_ID.get(row["away_team"])
        if home_team_id not in team_ids or away_team_id not in team_ids:
            continue
        transformed.append(
            {
                "result_id": stable_result_id(row, home_team_id, away_team_id),
                "match_date": row["date"],
                "home_team_id": home_team_id,
                "away_team_id": away_team_id,
                "home_score": row["home_score"],
                "away_score": row["away_score"],
                "tournament": row["tournament"],
                "neutral_site": row["neutral"].lower(),
            }
        )
    return sorted(transformed, key=lambda item: (item["match_date"], item["result_id"]))


def write_historical_snapshot(raw_dir: Path, rows: list[dict[str, str]]) -> Path:
    output_path = HISTORICAL_RESULTS_SOURCE.path(raw_dir)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "result_id",
        "match_date",
        "home_team_id",
        "away_team_id",
        "home_score",
        "away_score",
        "tournament",
        "neutral_site",
    ]
    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch recent international results for tournament teams")
    parser.add_argument("--as-of", default=None, help="Cutoff date in YYYY-MM-DD format")
    parser.add_argument("--start-date", default=DEFAULT_START_DATE.isoformat())
    args = parser.parse_args()

    settings = load_settings()
    as_of_date = date.fromisoformat(args.as_of) if args.as_of else settings.as_of_date
    start_date = date.fromisoformat(args.start_date)
    raw_dir = settings.data_dir / "raw"
    rows = transform_results(
        fetch_rows(RAW_RESULTS_URL),
        tournament_team_ids(raw_dir),
        start_date,
        as_of_date,
    )
    output_path = write_historical_snapshot(raw_dir, rows)
    print(f"wrote {len(rows)} historical results to {output_path}")


if __name__ == "__main__":
    main()
