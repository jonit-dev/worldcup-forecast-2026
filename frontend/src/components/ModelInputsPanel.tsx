import type { MatchForecast, ModelDiagnostics, ModelEvaluation } from '../api/types';
import { formatPercent } from '../utils/format';
import { teamLabel } from '../utils/flags';

type ModelInputsPanelProps = {
  forecast?: MatchForecast;
  diagnostics?: ModelDiagnostics;
  evaluation?: ModelEvaluation;
};

export function ModelInputsPanel({ forecast, diagnostics, evaluation }: ModelInputsPanelProps) {
  if (!forecast) {
    return <p className="muted">Select a match to inspect model inputs.</p>;
  }

  return (
    <div className="detail-stack">
      <div>
        <h3>
          {teamLabel(forecast.home_team_id, forecast.home_team)} vs{' '}
          {teamLabel(forecast.away_team_id, forecast.away_team)}
        </h3>
        <p className="muted">
          {forecast.model.version} · {forecast.model.config_hash}
        </p>
      </div>
      <dl className="metric-grid">
        <div>
          <dt>{teamLabel(forecast.home_team_id, forecast.home_team)} rating</dt>
          <dd>{forecast.model_inputs.home_rating.toFixed(1)}</dd>
        </div>
        <div>
          <dt>{teamLabel(forecast.away_team_id, forecast.away_team)} rating</dt>
          <dd>{forecast.model_inputs.away_rating.toFixed(1)}</dd>
        </div>
        <div>
          <dt>{teamLabel(forecast.home_team_id, forecast.home_team)} attack</dt>
          <dd>{forecast.model_inputs.home_attack.toFixed(2)}</dd>
        </div>
        <div>
          <dt>{teamLabel(forecast.away_team_id, forecast.away_team)} attack</dt>
          <dd>{forecast.model_inputs.away_attack.toFixed(2)}</dd>
        </div>
      </dl>
      <p className="warning">{forecast.model.note}</p>
      {diagnostics ? <p className="muted">{diagnostics.limitations[0]}</p> : null}
      {diagnostics ? (
        <p className="sample-note">
          Tournament coverage: {diagnostics.team_coverage.team_count} teams, minimum{' '}
          {diagnostics.team_coverage.min_matches} matches per team, median{' '}
          {diagnostics.team_coverage.median_matches}, maximum{' '}
          {diagnostics.team_coverage.max_matches}.
        </p>
      ) : null}
      {evaluation ? (
        <div className="backtest-note">
          <strong>Pre-tournament backtest</strong>
          <span>
            Trained through {evaluation.training_cutoff}, then compared with actual World Cup
            results: {evaluation.correct_outcomes}/{evaluation.holdout_match_count} outcomes
            correct
            {evaluation.outcome_accuracy === null
              ? ''
              : ` (${formatPercent(evaluation.outcome_accuracy)})`}
            .
          </span>
          {evaluation.statistical_relevance.accuracy_confidence_interval_95 ? (
            <span>
              95% confidence range:{' '}
              {formatPercent(evaluation.statistical_relevance.accuracy_confidence_interval_95.low)}-
              {formatPercent(evaluation.statistical_relevance.accuracy_confidence_interval_95.high)}
              . This is a small holdout, so it checks leakage and direction, not final proof.
            </span>
          ) : null}
          <span>
            Quality gate: {evaluation.quality_gate.clears_gate ? 'decent' : 'needs iteration'}.
            Completed World Cup matches used for training:{' '}
            {evaluation.completed_current_matches_used_for_training}.
          </span>
        </div>
      ) : null}
    </div>
  );
}
