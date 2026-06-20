import type { MatchForecast } from '../api/types';
import { teamLabel } from '../utils/flags';

type ActualResultsProps = {
  results: MatchForecast[];
};

export function ActualResults({ results }: ActualResultsProps) {
  if (!results.length) {
    return <p className="muted">No completed World Cup matches in the current snapshot.</p>;
  }

  return (
    <div className="table-wrap compact-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Group</th>
            <th>Match</th>
            <th>Actual score</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.match_id}>
              <td>{result.match_date}</td>
              <td>{result.group_name ?? result.stage}</td>
              <td>
                {teamLabel(result.home_team_id, result.home_team)} vs{' '}
                {teamLabel(result.away_team_id, result.away_team)}
              </td>
              <td>
                <strong>
                  {result.home_score}-{result.away_score}
                </strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
