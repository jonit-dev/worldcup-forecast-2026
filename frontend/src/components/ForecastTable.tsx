import type { MatchForecast } from '../api/types';
import { formatPercent } from '../utils/format';

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
            <th>xG</th>
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
                  {forecast.home_team} vs {forecast.away_team}
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
