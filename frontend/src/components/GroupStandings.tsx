import { useEffect, useMemo, useState } from 'react';
import type { SimulationTeam, Standing } from '../api/types';
import { formatPercent } from '../utils/format';
import { teamLabel } from '../utils/flags';

type GroupStandingsProps = {
  standings: Standing[];
  simulationTeams: SimulationTeam[];
  selectedTeamId?: string;
  onSelectTeam?: (teamId: string) => void;
};

export function GroupStandings({
  standings,
  simulationTeams,
  selectedTeamId,
  onSelectTeam,
}: GroupStandingsProps) {
  const oddsByTeam = new Map(simulationTeams.map((team) => [team.team_id, team]));
  const groups = useMemo(
    () => [...new Set(standings.map((standing) => standing.group_name))].sort(),
    [standings],
  );
  const [activeGroup, setActiveGroup] = useState('');

  useEffect(() => {
    if ((!activeGroup || !groups.includes(activeGroup)) && groups.length > 0) {
      setActiveGroup(groups[0]);
    }
  }, [activeGroup, groups]);

  const visibleStandings = standings.filter((standing) => standing.group_name === activeGroup);

  return (
    <div className="group-standings">
      <div className="group-tabs" aria-label="Group selector">
        {groups.map((group) => (
          <button
            className={group === activeGroup ? 'active' : undefined}
            key={group}
            onClick={() => setActiveGroup(group)}
            type="button"
          >
            {group}
          </button>
        ))}
      </div>
      <div className="table-wrap compact-table">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Pts</th>
              <th>GD</th>
              <th>Advance</th>
            </tr>
          </thead>
          <tbody>
            {visibleStandings.map((standing) => {
              const odds = oddsByTeam.get(standing.team_id);
              return (
                <tr
                  className={standing.team_id === selectedTeamId ? 'selected-row' : undefined}
                  key={`${standing.group_name}-${standing.team_id}`}
                >
                  <td>
                    <button
                      className="team-name-button"
                      onClick={() => onSelectTeam?.(standing.team_id)}
                      type="button"
                    >
                      {teamLabel(standing.team_id, standing.team_name)}
                    </button>
                  </td>
                  <td>{standing.points}</td>
                  <td>{standing.goals_for - standing.goals_against}</td>
                  <td>{odds ? formatPercent(odds.advance_probability) : 'pending'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
