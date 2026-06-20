import { Activity, AlertTriangle, Database, LineChart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getForecasts,
  getModelDiagnostics,
  getNextForecasts,
  getSimulation,
  getStandings,
  getSummary,
  getTeams,
} from './api/client';
import type { MatchForecast } from './api/types';
import { ForecastTable } from './components/ForecastTable';
import { GroupStandings } from './components/GroupStandings';
import { ModelInputsPanel } from './components/ModelInputsPanel';
import { TeamNextMatches } from './components/TeamNextMatches';
import { TournamentOdds } from './components/TournamentOdds';

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
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<MatchForecast | undefined>();

  useEffect(() => {
    if (!selectedTeamId && teamsQuery.data?.length) {
      setSelectedTeamId(teamsQuery.data[0].team_id);
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
        <article className="panel panel-wide team-panel">
          <div className="panel-heading">
            <LineChart size={20} aria-hidden="true" />
            <h2>Team Forecast Path</h2>
          </div>
          <TeamNextMatches
            teams={teamsQuery.data ?? []}
            selectedTeamId={selectedTeamId}
            forecasts={nextForecastsQuery.data ?? []}
            onTeamChange={(teamId) => {
              setSelectedTeamId(teamId);
              setSelectedMatch(undefined);
            }}
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

        <article className="panel">
          <div className="panel-heading">
            <Database size={20} aria-hidden="true" />
            <h2>Group Standings</h2>
          </div>
          <GroupStandings
            standings={standingsQuery.data ?? []}
            simulationTeams={simulationQuery.data?.teams ?? []}
          />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <LineChart size={20} aria-hidden="true" />
            <h2>Advance Odds</h2>
          </div>
          <TournamentOdds teams={teamsQuery.data ?? []} odds={simulationQuery.data?.teams ?? []} />
        </article>

        <article className="panel">
          <h2>Model Inputs</h2>
          <ModelInputsPanel forecast={selectedMatch} diagnostics={diagnosticsQuery.data} />
        </article>

        <article className="panel">
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
          </dl>
          <p className="path-text">{summaryQuery.data?.database_path ?? 'DuckDB target pending'}</p>
        </article>
      </section>
    </main>
  );
}
