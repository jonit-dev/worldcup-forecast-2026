import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ForecastTable } from './ForecastTable';
import type { MatchForecast } from '../api/types';

const forecast: MatchForecast = {
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
  probabilities: { home_win: 0.512345, draw: 0.244444, away_win: 0.243211 },
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
    home_matches_used: 10,
    away_matches_used: 10,
  },
};

describe('ForecastTable', () => {
  it('should render compact probabilities when forecasts are present', () => {
    render(<ForecastTable forecasts={[forecast]} onSelectMatch={() => undefined} />);

    expect(screen.getByText('Probabilities')).toBeInTheDocument();
    expect(screen.getByText('xG')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('51.2%')).toBeInTheDocument();
  });

  it('should select a match when the match button is clicked', async () => {
    const onSelectMatch = vi.fn();
    render(<ForecastTable forecasts={[forecast]} onSelectMatch={onSelectMatch} />);

    await userEvent.click(screen.getAllByRole('button', { name: /United States.*Australia/i })[0]);

    expect(onSelectMatch).toHaveBeenCalledWith(forecast);
  });
});
