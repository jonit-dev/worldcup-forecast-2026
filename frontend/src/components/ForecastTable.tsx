import type { MatchForecast } from '../api/types';
import { formatPercent } from '../utils/format';
import { teamLabel } from '../utils/flags';
import { Target } from 'lucide-react';

type ForecastTableProps = {
  forecasts: MatchForecast[];
  selectedMatchId?: string;
  onSelectMatch: (match: MatchForecast) => void;
};

export function ForecastTable({ forecasts, selectedMatchId, onSelectMatch }: ForecastTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Home</th>
            <th>Draw</th>
            <th>Away</th>
            <th>
              <span className="icon-label">
                <Target size={14} aria-hidden="true" />
                Expected goals
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {forecasts.map((forecast) => (
            <tr
              key={forecast.match_id}
              className={forecast.match_id === selectedMatchId ? 'selected-row' : undefined}
            >
              <td>{forecast.match_date}</td>
              <td>
                <button className="link-button" onClick={() => onSelectMatch(forecast)} type="button">
                  {teamLabel(forecast.home_team_id, forecast.home_team)} vs{' '}
                  {teamLabel(forecast.away_team_id, forecast.away_team)}
                </button>
              </td>
              <td>{formatPercent(forecast.probabilities.home_win)}</td>
              <td>{formatPercent(forecast.probabilities.draw)}</td>
              <td>{formatPercent(forecast.probabilities.away_win)}</td>
              <td>
                {forecast.expected_goals.home.toFixed(2)}-{forecast.expected_goals.away.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
