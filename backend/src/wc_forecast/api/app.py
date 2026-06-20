from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS

from wc_forecast import __version__
from wc_forecast.config.settings import load_settings
from wc_forecast.data.repository import list_matches, list_standings, list_team_history, list_teams, load_summary
from wc_forecast.services.evaluation_service import evaluate_pre_tournament_model
from wc_forecast.services.forecast_service import (
    load_forecasts,
    load_next_team_forecasts,
    load_simulation,
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


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    @app.get("/health")
    def health():
        settings = load_settings()
        return jsonify(
            {
                "status": "ok",
                "version": __version__,
                "as_of_date": settings.as_of_date.isoformat(),
            }
        )

    @app.get("/api/summary")
    def summary():
        settings = load_settings()
        data_summary = load_summary(settings.database_path, settings.as_of_date)
        return jsonify(
            {
                "as_of_date": settings.as_of_date.isoformat(),
                "database_path": str(settings.database_path),
                "model_status": "not_trained",
                **data_summary,
                "next_steps": [
                    "train baseline forecast model",
                    "simulate tournament outcomes",
                    "select a team to inspect its upcoming forecast path",
                ],
            }
        )

    @app.get("/api/teams")
    def teams():
        settings = load_settings()
        return jsonify({"teams": json_ready(list_teams(settings.database_path, settings.as_of_date))})

    @app.get("/api/matches")
    def matches():
        settings = load_settings()
        team_id = request.args.get("team_id")
        rows = list_matches(settings.database_path, settings.as_of_date)
        if team_id:
            rows = [
                row
                for row in rows
                if row["home_team_id"] == team_id or row["away_team_id"] == team_id
            ]
        return jsonify({"matches": json_ready(rows)})

    @app.get("/api/standings")
    def standings():
        settings = load_settings()
        return jsonify(
            {"standings": json_ready(list_standings(settings.database_path, settings.as_of_date))}
        )

    @app.get("/api/teams/<team_id>/history")
    def team_history(team_id: str):
        settings = load_settings()
        return jsonify(
            {
                "team_id": team_id,
                "history": json_ready(
                    list_team_history(settings.database_path, settings.as_of_date, team_id)
                ),
            }
        )

    @app.get("/api/forecasts")
    def forecasts():
        settings = load_settings()
        team_id = request.args.get("team_id")
        return jsonify(
            {
                "forecasts": json_ready(
                    load_forecasts(settings.database_path, settings.as_of_date, team_id)
                )
            }
        )

    @app.get("/api/teams/<team_id>/next-forecasts")
    def team_next_forecasts(team_id: str):
        settings = load_settings()
        limit = int(request.args.get("limit", "3"))
        return jsonify(
            {
                "team_id": team_id,
                "forecasts": json_ready(
                    load_next_team_forecasts(
                        settings.database_path,
                        settings.as_of_date,
                        team_id,
                        limit=limit,
                    )
                ),
            }
        )

    @app.get("/api/simulations")
    def simulations():
        settings = load_settings()
        iterations = int(request.args.get("iterations", "1000"))
        seed = int(request.args.get("seed", "20260620"))
        return jsonify(
            json_ready(load_simulation(settings.database_path, settings.as_of_date, iterations, seed))
        )

    @app.get("/api/model/diagnostics")
    def diagnostics():
        settings = load_settings()
        return jsonify(json_ready(model_diagnostics(settings.database_path, settings.as_of_date)))

    @app.get("/api/model/evaluation")
    def evaluation():
        settings = load_settings()
        return jsonify(
            json_ready(evaluate_pre_tournament_model(settings.database_path, settings.as_of_date))
        )

    return app


app = create_app()
