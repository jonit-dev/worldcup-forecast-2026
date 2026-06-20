import type { MatchForecast, ModelDiagnostics } from '../api/types';
import { teamLabel } from '../utils/flags';

type ModelInputsPanelProps = {
  forecast?: MatchForecast;
  diagnostics?: ModelDiagnostics;
};

export function ModelInputsPanel({ forecast, diagnostics }: ModelInputsPanelProps) {
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
    </div>
  );
}
