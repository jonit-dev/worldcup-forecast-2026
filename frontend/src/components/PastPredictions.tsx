import { CheckCircle2, Target, XCircle } from 'lucide-react';
import type { EvaluationRow } from '../api/types';
import { teamLabel } from '../utils/flags';
import { formatPercent } from '../utils/format';

type PastPredictionsProps = {
  rows: EvaluationRow[];
  limit?: number;
};

function outcomeLabel(outcome: EvaluationRow['actual_outcome'], row: EvaluationRow) {
  if (outcome === 'draw') {
    return 'Draw';
  }
  return outcome === 'home_win' ? row.home_team : row.away_team;
}

function formatScoreline(scoreline: EvaluationRow['top_scoreline']) {
  return `${scoreline.home_score}-${scoreline.away_score}`;
}

function formatSigned(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function getScoreDelta(row: EvaluationRow) {
  const homeDelta = row.actual_score.home - row.top_scoreline.home_score;
  const awayDelta = row.actual_score.away - row.top_scoreline.away_score;

  return {
    homeDelta,
    awayDelta,
    total: Math.abs(homeDelta) + Math.abs(awayDelta),
  };
}

export function PastPredictions({ rows, limit }: PastPredictionsProps) {
  const sortedRows = rows
    .slice()
    .sort((left, right) =>
      `${right.match_date}-${right.match_id}`.localeCompare(`${left.match_date}-${left.match_id}`),
    );
  const completedRows = typeof limit === 'number' ? sortedRows.slice(0, limit) : sortedRows;

  if (!completedRows.length) {
    return (
      <div className="rounded-md border border-line bg-slate-50 p-4 text-sm text-slate-500">
        No completed World Cup predictions are available for analysis yet.
      </div>
    );
  }

  const correctOutcomes = completedRows.filter((row) => row.correct_outcome).length;
  const exactScorelines = completedRows.filter((row) => row.top_scoreline_correct).length;
  const averageActualProbability =
    completedRows.reduce((sum, row) => sum + row.actual_outcome_probability, 0) / completedRows.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-800">Outcome calls</p>
          <strong className="text-2xl font-black text-emerald-950">
            {correctOutcomes}/{completedRows.length}
          </strong>
        </div>
        <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-800">Avg actual probability</p>
          <strong className="text-2xl font-black text-sky-950">{formatPercent(averageActualProbability)}</strong>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-600">Exact scorelines</p>
          <strong className="text-2xl font-black text-slate-950">
            {exactScorelines}/{completedRows.length}
          </strong>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="min-w-[980px] w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Match</th>
              <th className="px-4 py-3 text-left">Predicted outcome</th>
              <th className="px-4 py-3 text-left">Actual result</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actual probability</th>
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1">
                  <Target size={14} aria-hidden="true" />
                  Predicted scoreline
                </span>
              </th>
              <th className="px-4 py-3 text-left">Score delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {completedRows.map((row) => {
              const scoreDelta = getScoreDelta(row);

              return (
                <tr key={row.match_id} className="align-top">
                  <td className="px-4 py-3 font-semibold text-ink">{row.match_date}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">
                      {teamLabel(row.home_team_id, row.home_team)} vs {teamLabel(row.away_team_id, row.away_team)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{row.match_id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{outcomeLabel(row.predicted_outcome, row)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">
                      {row.actual_score.home}-{row.actual_score.away}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{outcomeLabel(row.actual_outcome, row)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${
                        row.correct_outcome
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}
                    >
                      {row.correct_outcome ? (
                        <CheckCircle2 size={14} aria-hidden="true" />
                      ) : (
                        <XCircle size={14} aria-hidden="true" />
                      )}
                      {row.correct_outcome ? 'Correct' : 'Miss'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatPercent(row.actual_outcome_probability)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{formatScoreline(row.top_scoreline)}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatPercent(row.top_scoreline.probability)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{scoreDelta.total} goals</div>
                    <div className="mt-1 text-xs text-slate-500">
                      H {formatSigned(scoreDelta.homeDelta)} / A {formatSigned(scoreDelta.awayDelta)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
