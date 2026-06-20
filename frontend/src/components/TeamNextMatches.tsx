import { Target } from 'lucide-react';
import type { MatchForecast, Team } from '../api/types';
import { formatPercent } from '../utils/format';

type TeamNextMatchesProps = {
  teams: Team[];
  selectedTeamId: string;
  forecasts: MatchForecast[];
  onTeamChange: (teamId: string) => void;
};

export function TeamNextMatches({
  teams,
  selectedTeamId,
  forecasts,
  onTeamChange,
}: TeamNextMatchesProps) {
  return (
    <div className="detail-stack">
      <label className="field-label" htmlFor="team-select">
        Team
      </label>
      <select id="team-select" value={selectedTeamId} onChange={(event) => onTeamChange(event.target.value)}>
        {teams.map((team) => (
          <option key={team.team_id} value={team.team_id}>
            {team.team_name}
          </option>
        ))}
      </select>

      <div className="next-match-list">
        {forecasts.map((forecast) => {
          const isHome = forecast.home_team_id === selectedTeamId;
          const teamWinProbability = isHome
            ? forecast.probabilities.home_win
            : forecast.probabilities.away_win;
          return (
            <article className="match-card" key={forecast.match_id}>
              <div className="match-card-title">
                <Target size={18} aria-hidden="true" />
                <h3>
                  {forecast.home_team} vs {forecast.away_team}
                </h3>
              </div>
              <p className="muted">{forecast.match_date}</p>
              <div className="bar-row">
                <span>Win</span>
                <div className="bar-track">
                  <span style={{ width: `${teamWinProbability * 100}%` }} />
                </div>
                <strong>{formatPercent(teamWinProbability)}</strong>
              </div>
              <p>
                Predicted xG: {forecast.expected_goals.home.toFixed(2)}-
                {forecast.expected_goals.away.toFixed(2)}
              </p>
              <p className="muted">
                Top result: {forecast.top_scorelines[0].home_score}-
                {forecast.top_scorelines[0].away_score}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
