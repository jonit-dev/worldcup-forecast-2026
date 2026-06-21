import { Target } from 'lucide-react';
import type { MatchForecast, Team } from '../api/types';
import { formatPercent } from '../utils/format';
import { teamLabel } from '../utils/flags';

type TeamNextMatchesProps = {
  teams: Team[];
  selectedTeamId: string;
  forecasts: MatchForecast[];
  isLoading: boolean;
  onTeamChange: (teamId: string) => void;
  onSelectMatch?: (match: MatchForecast) => void;
  selectedMatchId?: string;
  showTeamPicker?: boolean;
};

export function TeamNextMatches({
  teams,
  selectedTeamId,
  forecasts,
  isLoading,
  onTeamChange,
  onSelectMatch,
  selectedMatchId,
  showTeamPicker = true,
}: TeamNextMatchesProps) {
  const selectedTeam = teams.find((team) => team.team_id === selectedTeamId);

  return (
    <div className="detail-stack">
      {showTeamPicker ? (
        <div className="team-picker-row">
          <div>
            <label className="field-label" htmlFor="team-select">
              Team
            </label>
            <select
              id="team-select"
              value={selectedTeamId}
              onChange={(event) => onTeamChange(event.target.value)}
            >
              {teams.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {teamLabel(team.team_id, team.team_name)}
                </option>
              ))}
            </select>
          </div>
          <p className="interpretation-note">
            Read each card left to right: chance to win, chance to draw, chance to lose, likely score,
            then expected goals. “Expected goals” is the model’s average goal estimate for the match.
          </p>
        </div>
      ) : null}

      {selectedTeam ? (
        <div className="selected-team-summary">
          <span className="selected-team-flag" aria-hidden="true">
            {teamLabel(selectedTeam.team_id, '')}
          </span>
          <div>
            <strong>{selectedTeam.team_name}</strong>
            <p>Future matches and probabilities are shown from this team&apos;s point of view.</p>
          </div>
        </div>
      ) : null}

      <div className="next-match-list">
        {isLoading ? <p className="muted">Loading upcoming forecasts...</p> : null}
        {!isLoading && forecasts.length === 0 ? (
          <p className="muted">No upcoming forecasts for this team in the current sample.</p>
        ) : null}
        {forecasts.map((forecast) => {
          const isHome = forecast.home_team_id === selectedTeamId;
          const teamWinProbability = isHome
            ? forecast.probabilities.home_win
            : forecast.probabilities.away_win;
          const teamLossProbability = isHome
            ? forecast.probabilities.away_win
            : forecast.probabilities.home_win;
          const selectedTeamName = selectedTeam?.team_name ?? selectedTeamId;
          const opponentName = isHome ? forecast.away_team : forecast.home_team;
          const selectedExpectedGoals = isHome
            ? forecast.expected_goals.home
            : forecast.expected_goals.away;
          const opponentExpectedGoals = isHome
            ? forecast.expected_goals.away
            : forecast.expected_goals.home;
          const favoriteText =
            teamWinProbability >= 0.55
              ? `${selectedTeamName} is favored`
              : teamLossProbability >= 0.55
                ? `${selectedTeamName} is the underdog`
                : 'Close match';
          const likelyScore = forecast.top_scorelines[0];
          const likelySelectedScore = isHome ? likelyScore.home_score : likelyScore.away_score;
          const likelyOpponentScore = isHome ? likelyScore.away_score : likelyScore.home_score;
          const selectedSample = isHome
            ? forecast.model_inputs.home_matches_used
            : forecast.model_inputs.away_matches_used;
          const opponentSample = isHome
            ? forecast.model_inputs.away_matches_used
            : forecast.model_inputs.home_matches_used;
          const coverageLabel =
            selectedSample >= 150 && opponentSample >= 150 ? 'Broad sample' : 'Thin sample';
          return (
            <article
              className={forecast.match_id === selectedMatchId ? 'match-card selected-match-card' : 'match-card'}
              key={forecast.match_id}
            >
              <div className="match-card-title">
                <Target size={18} aria-hidden="true" />
                <h3>
                  <button
                    className="team-name-button"
                    onClick={() => onTeamChange(forecast.home_team_id)}
                    type="button"
                  >
                    {teamLabel(forecast.home_team_id, forecast.home_team)}
                  </button>
                  <span>vs</span>
                  <button
                    className="team-name-button"
                    onClick={() => onTeamChange(forecast.away_team_id)}
                    type="button"
                  >
                    {teamLabel(forecast.away_team_id, forecast.away_team)}
                  </button>
                </h3>
              </div>
              <p className="muted">
                {forecast.match_date} · Group {forecast.group_name} · Opponent: {opponentName}
              </p>
              <div className="verdict">
                <strong>{favoriteText}</strong>
                <span>
                  Most likely score: {selectedTeamName} {likelySelectedScore}-{likelyOpponentScore}{' '}
                  {opponentName}
                </span>
              </div>
              <div className="probability-grid" aria-label={`Forecast probabilities for ${selectedTeamName}`}>
                <div className="probability-chip positive">
                  <span>Win</span>
                  <strong>{formatPercent(teamWinProbability)}</strong>
                </div>
                <div className="probability-chip neutral">
                  <span>Draw</span>
                  <strong>{formatPercent(forecast.probabilities.draw)}</strong>
                </div>
                <div className="probability-chip negative">
                  <span>Lose</span>
                  <strong>{formatPercent(teamLossProbability)}</strong>
                </div>
              </div>
              <div className="bar-row">
                <span>Win bar</span>
                <div className="bar-track">
                  <span style={{ width: `${teamWinProbability * 100}%` }} />
                </div>
                <strong>{formatPercent(teamWinProbability)}</strong>
              </div>
              <p className="plain-explainer">
                Expected goals means the average goals the model would expect if this match were
                replayed many times. Here: {selectedTeamName} {selectedExpectedGoals.toFixed(2)}{' '}
                expected goals, {opponentName} {opponentExpectedGoals.toFixed(2)} expected goals.
              </p>
              <p className="sample-note">
                {coverageLabel}: {selectedTeamName} has {selectedSample} prior/current matches in
                this model; {opponentName} has {opponentSample}. More history improves stability,
                but it still does not make the prediction certain.
              </p>
              {onSelectMatch ? (
                <button className="secondary-action" onClick={() => onSelectMatch(forecast)} type="button">
                  Inspect model inputs
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
