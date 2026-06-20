import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

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

describe('App', () => {
  it('should display forecast details when a team is selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/summary')) {
          return Response.json({
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
          });
        }
        if (url.endsWith('/api/teams')) {
          return Response.json({
            teams: [
              { team_id: 'usa', team_name: 'United States', confederation: 'unknown' },
              { team_id: 'australia', team_name: 'Australia', confederation: 'unknown' },
            ],
          });
        }
        if (url.includes('/api/forecasts')) {
          return Response.json({ forecasts: [forecast, completedForecast] });
        }
        if (url.includes('/api/teams/usa/next-forecasts')) {
          return Response.json({ forecasts: [forecast] });
        }
        if (url.endsWith('/api/standings')) {
          return Response.json({
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
          });
        }
        if (url.includes('/api/simulations')) {
          return Response.json({
            model_version: 'elo-poisson-baseline-2026-06-20',
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
          });
        }
        if (url.endsWith('/api/model/evaluation')) {
          return Response.json({
            model_version: 'elo-poisson-baseline-2026-06-20',
            config_hash: 'abc123',
            as_of_date: '2026-06-20',
            tournament_start_date: '2026-06-11',
            training_cutoff: '2026-06-10',
            completed_current_matches_used_for_training: 0,
            historical_result_rows_used_for_training: 12000,
            holdout_match_count: 28,
            correct_outcomes: 20,
            outcome_accuracy: 0.714285714,
            log_loss: 0.77,
            brier_score: 0.43,
            exact_top_scoreline_accuracy: 0.107,
            average_actual_outcome_probability: 0.51,
            quality_gate: {
              label: 'decent_holdout_check',
              accuracy_threshold: 0.55,
              log_loss_threshold: 1.05,
              clears_gate: true,
            },
            statistical_relevance: {
              accuracy_confidence_interval_95: { low: 0.5285, high: 0.856 },
              chance_baseline_accuracy: 0.333333333,
              chance_baseline_p_value: 0.00005,
              warning: 'sample',
            },
            note: 'sample',
          });
        }
        return Response.json({
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
        });
      }),
    );

    renderApp();

    await waitFor(() => expect(screen.getByText('Forecast data loaded')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /United States.*Australia/i }).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Expected goals means the average goals/)).toBeInTheDocument();
    expect(await screen.findByText(/20\/28 outcomes/)).toBeInTheDocument();
    expect(screen.getByText(/95% confidence range/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Actual Results' })).toBeInTheDocument();
    expect(screen.getByText('2-0')).toBeInTheDocument();
    expect(screen.getByText(/Broad sample/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Team'), 'usa');
    expect(screen.getAllByText('80.0%').length).toBeGreaterThanOrEqual(2);
  });
});
