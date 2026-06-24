from __future__ import annotations

import json
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from wc_forecast.config.settings import load_settings
from wc_forecast.data.repository import list_matches, list_standings, list_team_history, list_teams, load_summary
from wc_forecast.services.evaluation_service import evaluate_pre_tournament_model
from wc_forecast.services.forecast_service import (
    load_forecasts,
    load_next_team_forecasts,
    load_potential_team_opponents,
    load_simulation,
    load_tournament_overview,
    model_diagnostics,
)


def json_ready(value: Any) -> Any:
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [json_ready(item) for item in value]
    if isinstance(value, dict):
        return {key: json_ready(item) for key, item in value.items()}
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def build_snapshot() -> dict[str, Any]:
    settings = load_settings()
    as_of_date = settings.as_of_date
    teams = list_teams(settings.database_path, as_of_date)

    return json_ready(
        {
            "generated_at": datetime.now(UTC).isoformat(),
            "summary": {
                "as_of_date": as_of_date.isoformat(),
                "database_path": "cloudflare:snapshot",
                "model_status": "snapshot",
                **load_summary(settings.database_path, as_of_date),
                "next_steps": [
                    "review current group forecasts",
                    "inspect team pages for probable next matches",
                    "refresh source snapshots as new results finish",
                ],
            },
            "teams": teams,
            "matches": list_matches(settings.database_path, as_of_date),
            "standings": list_standings(settings.database_path, as_of_date),
            "forecasts": load_forecasts(settings.database_path, as_of_date),
            "tournament_overview": load_tournament_overview(settings.database_path, as_of_date),
            "simulation": load_simulation(settings.database_path, as_of_date, iterations=1000, seed=20260620),
            "diagnostics": model_diagnostics(settings.database_path, as_of_date),
            "evaluation": evaluate_pre_tournament_model(settings.database_path, as_of_date),
            "team_history": {
                team["team_id"]: list_team_history(settings.database_path, as_of_date, team["team_id"])
                for team in teams
            },
            "next_forecasts": {
                team["team_id"]: load_next_team_forecasts(
                    settings.database_path,
                    as_of_date,
                    team["team_id"],
                    limit=4,
                )
                for team in teams
            },
            "potential_opponents": {
                team["team_id"]: load_potential_team_opponents(
                    settings.database_path,
                    as_of_date,
                    team["team_id"],
                    limit=6,
                )
                for team in teams
            },
        }
    )


def main() -> None:
    output_path = Path("frontend/public/api-snapshot.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(build_snapshot(), separators=(",", ":")), encoding="utf-8")
    print(f"wrote {output_path}")


if __name__ == "__main__":
    main()
