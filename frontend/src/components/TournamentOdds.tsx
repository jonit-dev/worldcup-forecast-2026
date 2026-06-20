import type { SimulationTeam, Team } from '../api/types';
import { formatPercent } from '../utils/format';
import { teamLabel } from '../utils/flags';

type TournamentOddsProps = {
  teams: Team[];
  odds: SimulationTeam[];
};

export function TournamentOdds({ teams, odds }: TournamentOddsProps) {
  const names = new Map(teams.map((team) => [team.team_id, team.team_name]));
  const topOdds = [...odds]
    .sort((left, right) => right.advance_probability - left.advance_probability)
    .slice(0, 8);

  return (
    <div className="odds-list">
      {topOdds.map((team) => (
        <div className="odds-row" key={team.team_id}>
          <span>{teamLabel(team.team_id, names.get(team.team_id) ?? team.team_id)}</span>
          <div className="bar-track">
            <span style={{ width: `${team.advance_probability * 100}%` }} />
          </div>
          <strong>{formatPercent(team.advance_probability)}</strong>
        </div>
      ))}
    </div>
  );
}
