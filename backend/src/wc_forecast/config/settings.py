from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    database_path: Path
    as_of_date: date


def load_settings() -> Settings:
    data_dir = Path(os.getenv("WC_FORECAST_DATA_DIR", "../data")).resolve()
    database_path = Path(
        os.getenv("WC_FORECAST_DATABASE", str(data_dir / "processed" / "worldcup_forecast.duckdb"))
    ).resolve()
    as_of_date = date.fromisoformat(os.getenv("WC_FORECAST_AS_OF_DATE", "2026-06-20"))
    return Settings(data_dir=data_dir, database_path=database_path, as_of_date=as_of_date)
