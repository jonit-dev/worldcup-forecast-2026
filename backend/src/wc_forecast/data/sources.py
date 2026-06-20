from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SourceFile:
    name: str
    url: str
    filename: str

    def path(self, raw_dir: Path) -> Path:
        return raw_dir / self.filename


CURRENT_MATCHES_SOURCE = SourceFile(
    name="manual_current_worldcup_snapshot",
    url="local:data/raw/current_matches_sample.csv",
    filename="current_matches_sample.csv",
)

HISTORICAL_RESULTS_SOURCE = SourceFile(
    name="manual_historical_results_snapshot",
    url="local:data/raw/historical_results_sample.csv",
    filename="historical_results_sample.csv",
)

RANKINGS_SOURCE = SourceFile(
    name="manual_rankings_snapshot",
    url="local:data/raw/rankings_sample.csv",
    filename="rankings_sample.csv",
)

STANDINGS_SOURCE = SourceFile(
    name="manual_standings_snapshot",
    url="local:data/raw/standings_sample.csv",
    filename="standings_sample.csv",
)

ALL_SOURCES = (
    CURRENT_MATCHES_SOURCE,
    HISTORICAL_RESULTS_SOURCE,
    RANKINGS_SOURCE,
    STANDINGS_SOURCE,
)

