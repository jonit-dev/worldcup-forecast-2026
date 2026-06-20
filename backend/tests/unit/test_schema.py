from datetime import date

import pytest

from wc_forecast.data.ingest import DataValidationError, validate_current_matches


def test_should_reject_future_results_when_as_of_date_is_earlier():
    rows = [
        {
            "match_id": "future-1",
            "match_date": "2026-06-21",
            "home_score": "1",
            "away_score": "0",
        }
    ]

    with pytest.raises(DataValidationError, match="leaks a result"):
        validate_current_matches(rows, date(2026, 6, 20))


def test_should_reject_duplicate_match_ids():
    rows = [
        {"match_id": "dup", "match_date": "2026-06-20", "home_score": "", "away_score": ""},
        {"match_id": "dup", "match_date": "2026-06-20", "home_score": "", "away_score": ""},
    ]

    with pytest.raises(DataValidationError, match="Duplicate current match IDs"):
        validate_current_matches(rows, date(2026, 6, 20))


def test_should_reject_impossible_negative_scores():
    rows = [
        {"match_id": "bad", "match_date": "2026-06-20", "home_score": "-1", "away_score": "0"}
    ]

    with pytest.raises(DataValidationError, match="negative score"):
        validate_current_matches(rows, date(2026, 6, 20))

