import { expect, test } from '@playwright/test';

const forecast = {
  match_id: '2026-GB-003',
  match_date: '2026-06-21',
  stage: 'group',
  group_name: 'B',
  home_team_id: 'usa',
  away_team_id: 'australia',
  home_team: 'United States',
  away_team: 'Australia',
  status: 'scheduled',
  home_score: null,
  away_score: null,
  expected_goals: { home: 1.42, away: 1.03 },
  probabilities: { home_win: 0.51, draw: 0.24, away_win: 0.25 },
  top_scorelines: [{ home_score: 1, away_score: 0, probability: 0.12 }],
  model: {
    version: 'elo-poisson-baseline-2026-06-20',
    config_hash: 'abc123',
    as_of_date: '2026-06-20',
    note: 'Baseline estimate; do not interpret as a statistically significant claim.',
  },
  model_inputs: {
    home_rating: 1700,
    away_rating: 1600,
    home_attack: 1.1,
    away_attack: 1,
    home_defense: 0.9,
    away_defense: 1,
    home_matches_used: 425,
    away_matches_used: 298,
  },
};

const completedForecast = {
  ...forecast,
  match_id: '2026-GD-004',
  match_date: '2026-06-19',
  home_team_id: 'usa',
  away_team_id: 'australia',
  home_team: 'United States',
  away_team: 'Australia',
  status: 'complete',
  home_score: 2,
  away_score: 0,
};

const evaluationRow = {
  match_id: '2026-GD-004',
  match_date: '2026-06-19',
  home_team_id: 'usa',
  away_team_id: 'australia',
  home_team: 'United States',
  away_team: 'Australia',
  actual_score: { home: 2, away: 0 },
  actual_outcome: 'home_win',
  predicted_outcome: 'away_win',
  correct_outcome: false,
  actual_outcome_probability: 0.31,
  actual_log_loss: 1.17,
  brier_score: 0.82,
  probabilities: { home_win: 0.31, draw: 0.21, away_win: 0.48 },
  expected_goals: { home: 1.2, away: 1.6 },
  top_scoreline: { home_score: 1, away_score: 2, probability: 0.1 },
  top_scoreline_correct: false,
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/summary', async (route) => {
    await route.fulfill({
      json: {
        as_of_date: '2026-06-20',
        database_path: '/tmp/worldcup.duckdb',
        model_status: 'not_trained',
        data_status: 'loaded',
        last_refresh_at: '2026-06-20T12:00:00',
        source_count: 4,
        team_count: 2,
        match_count: 1,
        historical_result_count: 12112,
        next_steps: [],
      },
    });
  });
  await page.route('**/api/teams', async (route) => {
    await route.fulfill({
      json: {
        teams: [
          { team_id: 'usa', team_name: 'United States', confederation: 'unknown' },
          { team_id: 'australia', team_name: 'Australia', confederation: 'unknown' },
        ],
      },
    });
  });
  await page.route('**/api/forecasts', async (route) => {
    await route.fulfill({ json: { forecasts: [forecast, completedForecast] } });
  });
  await page.route('**/api/tournament/overview', async (route) => {
    await route.fulfill({
      json: {
        model_version: 'elo-form-calibrated-2026-06-20-recent40',
        config_hash: 'abc123',
        as_of_date: '2026-06-20',
        match_counts: { upcoming: 1, completed: 1, total: 2 },
        team_count: 2,
        group_count: 1,
        title_leader: { team_id: 'usa', team_name: 'United States', rating: 1700, probability: 0.62 },
        strongest_attack: { team_id: 'usa', team_name: 'United States', value: 1.1 },
        strongest_defense: { team_id: 'australia', team_name: 'Australia', value: 1 },
        featured_matches: [forecast],
        champion_odds: [
          { team_id: 'usa', team_name: 'United States', rating: 1700, probability: 0.62 },
          { team_id: 'australia', team_name: 'Australia', rating: 1600, probability: 0.38 },
        ],
        group_leaders: [
          {
            team_id: 'usa',
            team_name: 'United States',
            group_name: 'B',
            group_win_probability: 0.6,
            advance_probability: 0.8,
          },
        ],
        teams: [],
        note: 'sample',
      },
    });
  });
  await page.route('**/api/teams/*/history', async (route) => {
    await route.fulfill({ json: { history: [] } });
  });
  await page.route('**/api/teams/*/next-forecasts?*', async (route) => {
    await route.fulfill({ json: { forecasts: [forecast] } });
  });
  await page.route('**/api/standings', async (route) => {
    await route.fulfill({
      json: {
        standings: [
          {
            group_name: 'B',
            team_id: 'usa',
            team_name: 'United States',
            played: 1,
            wins: 1,
            draws: 0,
            losses: 0,
            goals_for: 4,
            goals_against: 1,
            points: 3,
          },
        ],
      },
    });
  });
  await page.route('**/api/simulations?*', async (route) => {
    await route.fulfill({
      json: {
        model_version: 'elo-form-calibrated-2026-06-20-recent40',
        config_hash: 'abc123',
        as_of_date: '2026-06-20',
        iterations: 1000,
        seed: 20260620,
        note: 'sample',
        teams: [
          {
            team_id: 'usa',
            group_name: 'B',
            group_win_probability: 0.6,
            advance_probability: 0.8,
          },
        ],
      },
    });
  });
  await page.route('**/api/model/diagnostics', async (route) => {
    await route.fulfill({
      json: {
        model_version: 'elo-poisson-baseline-2026-06-20',
        config_hash: 'abc123',
        as_of_date: '2026-06-20',
        ranking_rows: 2,
        historical_result_rows: 12112,
        current_completed_matches: 1,
        coverage_threshold: 150,
        team_coverage: {
          team_count: 48,
          min_matches: 151,
          median_matches: 320,
          max_matches: 475,
          teams_below_threshold: [],
        },
        limitations: ['Historical coverage is broad.'],
      },
    });
  });
  await page.route('**/api/model/evaluation', async (route) => {
    await route.fulfill({
      json: {
        model_version: 'elo-poisson-baseline-2026-06-20',
        config_hash: 'abc123',
        as_of_date: '2026-06-20',
        tournament_start_date: '2026-06-11',
        training_cutoff: '2026-06-10',
        completed_current_matches_used_for_training: 0,
        historical_result_rows_used_for_training: 12000,
        holdout_match_count: 30,
        correct_outcomes: 21,
        outcome_accuracy: 0.7,
        log_loss: 0.8589,
        brier_score: 0.4925,
        exact_top_scoreline_accuracy: 0.107,
        average_actual_outcome_probability: 0.51,
        quality_gate: {
          label: 'decent_holdout_check',
          accuracy_threshold: 0.55,
          log_loss_threshold: 1.05,
          clears_gate: true,
        },
        statistical_relevance: {
          accuracy_confidence_interval_95: { low: 0.5212, high: 0.8334 },
          chance_baseline_accuracy: 0.333333333,
          chance_baseline_p_value: 0.00005,
          warning: 'sample',
        },
        rows: [evaluationRow],
        note: 'sample',
      },
    });
  });
});

test('should load dashboard and select a match forecast', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Forecast data loaded')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tournament Overview' })).toBeVisible();
  await expect(page.locator('#team-select')).toHaveValue('');
  await expect(page.getByText('Backtest quality')).toBeVisible();
  await expect(page.getByRole('heading', { name: '70.0% outcome accuracy' })).toBeVisible();
  await page.getByRole('button', { name: /Inspect.*United States.*Australia/ }).first().click();
  await expect(page.getByRole('heading', { name: 'All Upcoming Forecasts' })).toBeVisible();
  await expect(page.getByText(/21\/30 outcomes/).first()).toBeVisible();
  await expect(page.getByText(/95% confidence range/)).toBeVisible();
  await expect(page.getByText(/Historical coverage is broad/)).toBeVisible();
  await expect(page.getByText(/United States rating/)).toBeVisible();
  await page.getByRole('button', { name: 'Data' }).click();
  await expect(page.getByRole('heading', { name: 'Past Predictions vs Actual Results' })).toBeVisible();
  await expect(page.getByText('Miss')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actual Results', exact: true })).toBeVisible();
  await expect(page.getByText('2-0').first()).toBeVisible();
  await page.locator('#team-select').selectOption('usa');
  await expect(page.getByText('Back to Dashboard')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upcoming Forecasted Matches' })).toBeVisible();
});
