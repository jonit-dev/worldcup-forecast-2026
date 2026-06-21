import type { MatchForecast } from '../api/types';
import { formatPercent } from '../utils/format';
import { TeamFlag, teamLabel } from '../utils/flags';
import { Search, Target } from 'lucide-react';

type ForecastTableProps = {
  forecasts: MatchForecast[];
  selectedMatchId?: string;
  onSelectMatch: (match: MatchForecast) => void;
  onSelectTeam?: (teamId: string) => void;
};

export function ForecastTable({ forecasts, selectedMatchId, onSelectMatch, onSelectTeam }: ForecastTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Probabilities</th>
            <th>
              <span className="icon-label">
                <Target size={14} aria-hidden="true" />
                xG
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
                <div className="forecast-match-cell">
                  <button
                    aria-label={`Inspect ${forecast.home_team} vs ${forecast.away_team}`}
                    className="match-inspect-button"
                    onClick={() => onSelectMatch(forecast)}
                    title="Inspect model inputs"
                    type="button"
                  >
                    <Search size={15} aria-hidden="true" />
                  </button>
                  <button
                    className="team-name-button"
                    onClick={() => onSelectTeam?.(forecast.home_team_id)}
                    type="button"
                  >
                    <TeamFlag teamId={forecast.home_team_id} title={forecast.home_team} />
                    <span>{teamLabel(forecast.home_team_id, forecast.home_team)}</span>
                  </button>
                  <span className="versus-text">vs</span>
                  <button
                    className="team-name-button"
                    onClick={() => onSelectTeam?.(forecast.away_team_id)}
                    type="button"
                  >
                    <TeamFlag teamId={forecast.away_team_id} title={forecast.away_team} />
                    <span>{teamLabel(forecast.away_team_id, forecast.away_team)}</span>
                  </button>
                </div>
              </td>
              <td>
                <div className="forecast-probability-cell" aria-label="Win draw loss probabilities">
                  <span>
                    <strong>H</strong>
                    {formatPercent(forecast.probabilities.home_win)}
                  </span>
                  <span>
                    <strong>D</strong>
                    {formatPercent(forecast.probabilities.draw)}
                  </span>
                  <span>
                    <strong>A</strong>
                    {formatPercent(forecast.probabilities.away_win)}
                  </span>
                </div>
              </td>
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
