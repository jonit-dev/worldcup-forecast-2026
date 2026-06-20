import { Activity, AlertTriangle, BarChart3, Database, LineChart, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getForecasts,
  getModelDiagnostics,
  getModelEvaluation,
  getNextForecasts,
  getSimulation,
  getStandings,
  getSummary,
  getTeams,
} from './api/client';
import type { MatchForecast } from './api/types';
import { ActualResults } from './components/ActualResults';
import { ForecastTable } from './components/ForecastTable';
import { GroupStandings } from './components/GroupStandings';
import { ModelInputsPanel } from './components/ModelInputsPanel';
import { PastPredictions } from './components/PastPredictions';
import { TeamNextMatches } from './components/TeamNextMatches';
import { TournamentOdds } from './components/TournamentOdds';
import { formatPercent } from './utils/format';

export function App() {
  const summaryQuery = useQuery({ queryKey: ['summary'], queryFn: getSummary, retry: false });
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: getTeams, retry: false });
  const forecastsQuery = useQuery({ queryKey: ['forecasts'], queryFn: () => getForecasts(), retry: false });
  const standingsQuery = useQuery({ queryKey: ['standings'], queryFn: getStandings, retry: false });
  const simulationQuery = useQuery({ queryKey: ['simulation'], queryFn: getSimulation, retry: false });
  const diagnosticsQuery = useQuery({
    queryKey: ['model-diagnostics'],
    queryFn: getModelDiagnostics,
    retry: false,
  });
  const evaluationQuery = useQuery({
    queryKey: ['model-evaluation'],
    queryFn: getModelEvaluation,
    retry: false,
  });
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<MatchForecast | undefined>();

  useEffect(() => {
    if (!selectedTeamId && teamsQuery.data?.length) {
      setSelectedTeamId(
        teamsQuery.data.find((team) => team.team_id === 'brazil')?.team_id ?? teamsQuery.data[0].team_id,
      );
    }
  }, [selectedTeamId, teamsQuery.data]);

  const nextForecastsQuery = useQuery({
    queryKey: ['next-forecasts', selectedTeamId],
    queryFn: () => getNextForecasts(selectedTeamId),
    enabled: selectedTeamId.length > 0,
    retry: false,
  });

  useEffect(() => {
    if (!selectedMatch && nextForecastsQuery.data?.length) {
      setSelectedMatch(nextForecastsQuery.data[0]);
    }
  }, [nextForecastsQuery.data, selectedMatch]);

  const upcomingForecasts = useMemo(
    () => (forecastsQuery.data ?? []).filter((forecast) => forecast.status !== 'complete'),
    [forecastsQuery.data],
  );
  const actualResults = useMemo(
    () =>
      (forecastsQuery.data ?? [])
        .filter((forecast) => forecast.status === 'complete')
        .sort((left, right) =>
          `${right.match_date}-${right.match_id}`.localeCompare(`${left.match_date}-${left.match_id}`),
        ),
    [forecastsQuery.data],
  );

  const apiReady = summaryQuery.isSuccess && summaryQuery.data.data_status === 'loaded';
  const hasError =
    summaryQuery.isError ||
    teamsQuery.isError ||
    forecastsQuery.isError ||
    standingsQuery.isError ||
    simulationQuery.isError;

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Project status">
        <div>
          <p className="eyebrow">FIFA World Cup 2026</p>
          <h1>Forecast Workbench</h1>
        </div>
        <div className={apiReady ? 'status-pill status-ok' : 'status-pill'}>
          <Activity size={18} aria-hidden="true" />
          <span>{apiReady ? 'Forecast data loaded' : 'Waiting for API data'}</span>
        </div>
      </section>

      {hasError ? (
        <section className="notice" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>Start the Flask API and run ingestion to load forecasts.</span>
        </section>
      ) : null}

      <section className="dashboard-grid" aria-label="Forecast dashboard">
        <section className="panel panel-wide grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Model summary">
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Actual results</p>
            <strong className="text-2xl font-black text-ink">{actualResults.length}</strong>
            <p className="mb-0 text-xs text-slate-500">Completed matches in snapshot</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Backtest hit rate</p>
            <strong className="text-2xl font-black text-ink">
              {evaluationQuery.data?.outcome_accuracy == null
                ? 'pending'
                : formatPercent(evaluationQuery.data.outcome_accuracy)}
            </strong>
            <p className="mb-0 text-xs text-slate-500">
              {evaluationQuery.data
                ? `${evaluationQuery.data.correct_outcomes}/${evaluationQuery.data.holdout_match_count} outcomes`
                : 'Waiting for model evaluation'}
            </p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Training cutoff</p>
            <strong className="text-2xl font-black text-ink">
              {evaluationQuery.data?.training_cutoff ?? 'pending'}
            </strong>
            <p className="mb-0 text-xs text-slate-500">No completed WC matches in training</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Quality gate</p>
            <strong className="text-2xl font-black text-ink">
              {evaluationQuery.data?.quality_gate.clears_gate ? 'Pass' : 'Pending'}
            </strong>
            <p className="mb-0 text-xs text-slate-500">Accuracy and log-loss check</p>
          </div>
        </section>

        <article className="panel team-panel xl:col-span-8">
          <div className="panel-heading">
            <LineChart size={20} aria-hidden="true" />
            <h2>Team Forecast Path</h2>
          </div>
          <TeamNextMatches
            teams={teamsQuery.data ?? []}
            selectedTeamId={selectedTeamId}
            forecasts={nextForecastsQuery.data ?? []}
            isLoading={nextForecastsQuery.isFetching}
            onTeamChange={(teamId) => {
              setSelectedTeamId(teamId);
              setSelectedMatch(undefined);
            }}
          />
        </article>

        <article className="panel xl:col-span-4">
          <div className="panel-heading">
            <Target size={20} aria-hidden="true" />
            <h2>Model Inputs</h2>
          </div>
          <ModelInputsPanel
            forecast={selectedMatch}
            diagnostics={diagnosticsQuery.data}
            evaluation={evaluationQuery.data}
          />
        </article>

        <article className="panel panel-wide">
          <div className="panel-heading">
            <LineChart size={20} aria-hidden="true" />
            <h2>Upcoming Match Forecasts</h2>
          </div>
          <ForecastTable
            forecasts={upcomingForecasts}
            selectedMatchId={selectedMatch?.match_id}
            onSelectMatch={setSelectedMatch}
          />
        </article>

        <article className="panel panel-wide">
          <div className="panel-heading">
            <BarChart3 size={20} aria-hidden="true" />
            <h2>Past Predictions vs Actual Results</h2>
          </div>
          <PastPredictions rows={evaluationQuery.data?.rows ?? []} />
        </article>

        <article className="panel xl:col-span-4">
          <div className="panel-heading">
            <Database size={20} aria-hidden="true" />
            <h2>Group Standings</h2>
          </div>
          <GroupStandings
            standings={standingsQuery.data ?? []}
            simulationTeams={simulationQuery.data?.teams ?? []}
          />
        </article>

        <article className="panel xl:col-span-4">
          <div className="panel-heading">
            <Database size={20} aria-hidden="true" />
            <h2>Actual Results</h2>
          </div>
          <ActualResults results={actualResults.slice(0, 12)} />
        </article>

        <article className="panel xl:col-span-4">
          <div className="panel-heading">
            <LineChart size={20} aria-hidden="true" />
            <h2>Advance Odds</h2>
          </div>
          <TournamentOdds teams={teamsQuery.data ?? []} odds={simulationQuery.data?.teams ?? []} />
        </article>

        <article className="panel xl:col-span-4">
          <h2>Data Freshness</h2>
          <dl className="metric-grid">
            <div>
              <dt>Status</dt>
              <dd>{summaryQuery.data?.data_status ?? 'pending'}</dd>
            </div>
            <div>
              <dt>As of</dt>
              <dd>{summaryQuery.data?.as_of_date ?? '2026-06-20'}</dd>
            </div>
            <div>
              <dt>Sources</dt>
              <dd>{summaryQuery.data?.source_count ?? 0}</dd>
            </div>
            <div>
              <dt>Matches</dt>
              <dd>{summaryQuery.data?.match_count ?? 0}</dd>
            </div>
            <div>
              <dt>History</dt>
              <dd>{summaryQuery.data?.historical_result_count ?? 0}</dd>
            </div>
          </dl>
          <p className="path-text">{summaryQuery.data?.database_path ?? 'DuckDB target pending'}</p>
        </article>
      </section>
    </main>
  );
}
