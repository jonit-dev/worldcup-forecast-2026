from __future__ import annotations

from flask import Flask, jsonify
from flask_cors import CORS

from wc_forecast import __version__
from wc_forecast.config.settings import load_settings


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
        return jsonify(
            {
                "as_of_date": settings.as_of_date.isoformat(),
                "database_path": str(settings.database_path),
                "model_status": "not_trained",
                "data_status": "not_loaded",
                "next_steps": [
                    "ingest current tournament sources",
                    "load historical international results",
                    "train baseline forecast model",
                ],
            }
        )

    return app


app = create_app()
