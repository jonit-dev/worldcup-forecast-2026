import type { SimulationTeam, Standing } from '../api/types';
import { formatPercent } from '../utils/format';

type GroupStandingsProps = {
  standings: Standing[];
  simulationTeams: SimulationTeam[];
};

export function GroupStandings({ standings, simulationTeams }: GroupStandingsProps) {
  const oddsByTeam = new Map(simulationTeams.map((team) => [team.team_id, team]));

  return (
    <div className="table-wrap compact-table">
      <table>
        <thead>
          <tr>
            <th>Group</th>
            <th>Team</th>
            <th>Pts</th>
            <th>GD</th>
            <th>Advance</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => {
            const odds = oddsByTeam.get(standing.team_id);
            return (
              <tr key={`${standing.group_name}-${standing.team_id}`}>
                <td>{standing.group_name}</td>
                <td>{standing.team_name}</td>
                <td>{standing.points}</td>
                <td>{standing.goals_for - standing.goals_against}</td>
                <td>{odds ? formatPercent(odds.advance_probability) : 'pending'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
