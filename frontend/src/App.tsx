import {
  AlertTriangle,
  BarChart3,
  Database,
  Home,
  Info,
  LineChart,
  ShieldCheck,
  Target,
  Trophy,
} from 'lucide-react';
import type { ReactNode } from 'react';
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
  getTournamentOverview,
} from './api/client';
import type {
  ChampionOdd,
  MatchForecast,
  ModelDiagnostics,
  ModelEvaluation,
  SimulationTeam,
  Standing,
  Summary,
  TournamentOverview,
} from './api/types';
import { ActualResults } from './components/ActualResults';
import { ForecastTable } from './components/ForecastTable';
import { GroupStandings } from './components/GroupStandings';
import { ModelInputsPanel } from './components/ModelInputsPanel';
import { PastPredictions } from './components/PastPredictions';
import { TeamDetailPage } from './components/TeamDetailPage';
import { TeamFlag, teamWithFlag } from './utils/flags';
import { formatPercent } from './utils/format';

const navItems = [
  { label: 'Overview', icon: Home, view: 'overview' },
  { label: 'Team Forecast', icon: Target, view: 'team-detail' },
  { label: 'All Forecasts', icon: LineChart, view: 'forecasts' },
  { label: 'Champion Odds', icon: Trophy, view: 'champion-odds' },
  { label: 'Knockout Bracket', icon: LineChart, view: 'knockout-bracket' },
  { label: 'Group Stage', icon: ShieldCheck, view: 'group-stage' },
  { label: 'Data', icon: Database, view: 'data' },
];

const DISPLAYED_CHAMPION_ODDS = 10;

type ViewMode = (typeof navItems)[number]['view'];

export function App() {
  const summaryQuery = useQuery({ queryKey: ['summary'], queryFn: getSummary, retry: false });
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: getTeams, retry: false });
  const forecastsQuery = useQuery({ queryKey: ['forecasts'], queryFn: () => getForecasts(), retry: false });
  const standingsQuery = useQuery({ queryKey: ['standings'], queryFn: getStandings, retry: false });
  const simulationQuery = useQuery({ queryKey: ['simulation'], queryFn: getSimulation, retry: false });
  const tournamentOverviewQuery = useQuery({
    queryKey: ['tournament-overview'],
    queryFn: getTournamentOverview,
    retry: false,
  });
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
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

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
  const championOdds = useMemo(
    () => buildChampionOdds(forecastsQuery.data ?? [], teamsQuery.data ?? []),
    [forecastsQuery.data, teamsQuery.data],
  );
  const selectedTeam = useMemo(
    () => (teamsQuery.data ?? []).find((team) => team.team_id === selectedTeamId),
    [selectedTeamId, teamsQuery.data],
  );
  const selectedTeamStanding = useMemo(
    () => (standingsQuery.data ?? []).find((standing) => standing.team_id === selectedTeamId),
    [selectedTeamId, standingsQuery.data],
  );
  const selectedTeamSimulation = useMemo(
    () => simulationQuery.data?.teams.find((team) => team.team_id === selectedTeamId),
    [selectedTeamId, simulationQuery.data?.teams],
  );
  const selectedTeamTitleOdd = useMemo(
    () => championOdds.find((team) => team.team_id === selectedTeamId),
    [championOdds, selectedTeamId],
  );
  const leader = championOdds[0];
  const apiReady = summaryQuery.isSuccess && summaryQuery.data.data_status === 'loaded';
  const hasError =
    summaryQuery.isError ||
    teamsQuery.isError ||
    forecastsQuery.isError ||
    standingsQuery.isError ||
    simulationQuery.isError ||
    tournamentOverviewQuery.isError;

  const selectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedMatch(undefined);
    setViewMode('team-detail');
  };

  const selectMatch = (match: MatchForecast) => {
    setSelectedMatch(match);
    if (selectedTeamId !== match.home_team_id && selectedTeamId !== match.away_team_id) {
      setSelectedTeamId(match.home_team_id);
    }
    if (viewMode === 'overview') {
      setViewMode('forecasts');
    }
  };

  return (
    <main className="workbench-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <div className="worldcup-mark">26</div>
          <div>
            <span>FIFA World Cup</span>
            <strong>2026</strong>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.view === viewMode;

            return (
              <button
                aria-label={item.label}
                className={isActive ? 'nav-item active' : 'nav-item'}
                key={item.label}
                onClick={() => {
                  if (item.view === 'team-detail' && selectedTeamId) {
                    setViewMode('team-detail');
                  } else {
                    setViewMode(item.view === 'team-detail' ? 'overview' : item.view);
                  }
                }}
                type="button"
              >
                <Icon size={21} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-status">
          <span className={apiReady ? 'live-dot' : 'live-dot pending'} />
          <div>
            <strong>Model Status</strong>
            <span>{apiReady ? 'All systems operational' : 'Waiting for API data'}</span>
          </div>
        </div>
      </aside>

      <section className="main-stage" id="overview">
        <header className="app-topbar" aria-label="Project status">
          <div className="title-lockup">
            <span className="divider" />
            <h1>FIFA World Cup 2026 Forecast Workbench</h1>
          </div>
          <label className="team-select-control" htmlFor="team-select">
            <span>Team</span>
            <select
              id="team-select"
              value={selectedTeamId}
              onChange={(event) => {
                if (event.target.value) {
                  selectTeam(event.target.value);
                }
              }}
            >
              <option value="">Select a team</option>
              {(teamsQuery.data ?? []).map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name}
                </option>
              ))}
            </select>
          </label>
          <div className="api-status-chip">
            <span className={apiReady ? 'live-dot' : 'live-dot pending'} />
            <span>{apiReady ? 'Forecast data loaded' : 'Waiting for API data'}</span>
          </div>
        </header>

        {hasError ? (
          <section className="notice" role="status">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>Start the Flask API and run ingestion to load forecasts.</span>
          </section>
        ) : null}

        {viewMode === 'team-detail' && selectedTeam ? (
          <TeamDetailPage
            team={selectedTeam}
            standing={selectedTeamStanding}
            simulationTeam={selectedTeamSimulation}
            titleOdd={selectedTeamTitleOdd}
            onBack={() => setViewMode('overview')}
            onSelectTeam={selectTeam}
          />
        ) : null}

        {viewMode === 'overview' ? (
          <OverviewPage
            championOdds={championOdds}
            evaluation={evaluationQuery.data}
            leader={leader}
            onSelectMatch={selectMatch}
            onSelectTeam={selectTeam}
            overview={tournamentOverviewQuery.data}
            selectedMatch={selectedMatch}
            selectedTeamId={selectedTeamId}
            summary={summaryQuery.data}
            upcomingForecasts={upcomingForecasts}
          />
        ) : null}

        {viewMode === 'forecasts' ? (
          <ForecastsPage
            diagnostics={diagnosticsQuery.data}
            evaluation={evaluationQuery.data}
            forecasts={upcomingForecasts}
            onSelectMatch={selectMatch}
            onSelectTeam={selectTeam}
            selectedMatch={selectedMatch}
          />
        ) : null}

        {viewMode === 'champion-odds' ? (
          <ChampionOddsPage
            championOdds={championOdds}
            onSelectTeam={selectTeam}
            overview={tournamentOverviewQuery.data}
            selectedTeamId={selectedTeamId}
            simulationIterations={simulationQuery.data?.iterations ?? 0}
          />
        ) : null}

        {viewMode === 'knockout-bracket' ? (
          <BracketPage championOdds={championOdds} onSelectTeam={selectTeam} selectedTeamId={selectedTeamId} />
        ) : null}

        {viewMode === 'group-stage' ? (
          <GroupStagePage
            onSelectTeam={selectTeam}
            selectedTeamId={selectedTeamId}
            simulationTeams={simulationQuery.data?.teams ?? []}
            standings={standingsQuery.data ?? []}
          />
        ) : null}

        {viewMode === 'data' ? (
          <DataPage
            actualResults={actualResults}
            diagnostics={diagnosticsQuery.data}
            evaluation={evaluationQuery.data}
            summary={summaryQuery.data}
          />
        ) : null}
      </section>
    </main>
  );
}

function OverviewPage({
  championOdds,
  evaluation,
  leader,
  onSelectMatch,
  onSelectTeam,
  overview,
  selectedMatch,
  selectedTeamId,
  summary,
  upcomingForecasts,
}: {
  championOdds: ChampionOdd[];
  evaluation?: ModelEvaluation;
  leader?: ChampionOdd;
  onSelectMatch: (match: MatchForecast) => void;
  onSelectTeam: (teamId: string) => void;
  overview?: TournamentOverview;
  selectedMatch?: MatchForecast;
  selectedTeamId: string;
  summary?: Summary;
  upcomingForecasts: MatchForecast[];
}) {
  return (
    <section className="page-grid overview-page" aria-label="Tournament overview">
      <Panel className="span-full" icon={<Target size={18} />} title="Tournament Overview">
        <OverviewSummary
          completedCount={overview?.match_counts.completed ?? 0}
          evaluationAccuracy={evaluation?.outcome_accuracy}
          leader={overview?.title_leader ?? leader}
          selectedMatch={selectedMatch}
          summary={summary}
          upcomingCount={overview?.match_counts.upcoming ?? upcomingForecasts.length}
        />
      </Panel>

      <div className="page-card span-4">
        <p className="eyebrow">Model signal</p>
        <h2>Teams To Watch</h2>
        <div className="signal-list">
          <SignalRow label="Title leader" onSelectTeam={onSelectTeam} team={overview?.title_leader ?? leader} value={overview?.title_leader?.probability ?? leader?.probability} />
          <SignalRow label="Strongest attack" onSelectTeam={onSelectTeam} team={overview?.strongest_attack} value={overview?.strongest_attack?.value} />
          <SignalRow label="Tightest defense" lowerIsBetter onSelectTeam={onSelectTeam} team={overview?.strongest_defense} value={overview?.strongest_defense?.value} />
        </div>
      </div>

      <Panel className="span-8 forecast-panel overview-forecast-panel" icon={<LineChart size={18} />} title="Featured Upcoming Forecasts">
        <ForecastTable
          forecasts={(overview?.featured_matches ?? upcomingForecasts).slice(0, 6)}
          selectedMatchId={selectedMatch?.match_id}
          onSelectMatch={onSelectMatch}
          onSelectTeam={onSelectTeam}
        />
      </Panel>

      <Panel className="span-5 champion-panel" icon={<Trophy size={18} />} title="Champion Probability">
        <div className="panel-summary-line">
          <span>Top {Math.min(DISPLAYED_CHAMPION_ODDS, championOdds.length)} teams</span>
          <strong>{leader ? teamWithFlag(leader.team_id, leader.team_name) : 'pending'}</strong>
        </div>
        <ChampionProbabilityList odds={championOdds} selectedTeamId={selectedTeamId} onSelectTeam={onSelectTeam} />
      </Panel>

      <div className="page-card span-7 backtest-card">
        <p className="eyebrow">Backtest quality</p>
        <h2>{evaluation?.outcome_accuracy == null ? 'Waiting for evaluation' : `${formatPercent(evaluation.outcome_accuracy)} outcome accuracy`}</h2>
        <dl className="overview-metrics">
          <div>
            <dt>Correct</dt>
            <dd>{evaluation ? `${evaluation.correct_outcomes}/${evaluation.holdout_match_count}` : 'pending'}</dd>
          </div>
          <div>
            <dt>Log loss</dt>
            <dd>{evaluation?.log_loss == null ? 'pending' : evaluation.log_loss.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Brier</dt>
            <dd>{evaluation?.brier_score == null ? 'pending' : evaluation.brier_score.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Gate</dt>
            <dd>{evaluation?.quality_gate.clears_gate ? 'clear' : 'review'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function ForecastsPage({
  diagnostics,
  evaluation,
  forecasts,
  onSelectMatch,
  onSelectTeam,
  selectedMatch,
}: {
  diagnostics?: ModelDiagnostics;
  evaluation?: ModelEvaluation;
  forecasts: MatchForecast[];
  onSelectMatch: (match: MatchForecast) => void;
  onSelectTeam: (teamId: string) => void;
  selectedMatch?: MatchForecast;
}) {
  return (
    <section className="page-grid forecasts-page" aria-label="All forecasts">
      <Panel className="span-8 forecast-panel large-table-panel" icon={<LineChart size={18} />} title="All Upcoming Forecasts">
        <ForecastTable
          forecasts={forecasts}
          selectedMatchId={selectedMatch?.match_id}
          onSelectMatch={onSelectMatch}
          onSelectTeam={onSelectTeam}
        />
      </Panel>
      <Panel className="span-4 inputs-panel" icon={<BarChart3 size={18} />} title="Selected Match Model Drivers">
        <ModelInputsPanel forecast={selectedMatch} diagnostics={diagnostics} evaluation={evaluation} />
      </Panel>
    </section>
  );
}

function ChampionOddsPage({
  championOdds,
  onSelectTeam,
  overview,
  selectedTeamId,
  simulationIterations,
}: {
  championOdds: ChampionOdd[];
  onSelectTeam: (teamId: string) => void;
  overview?: TournamentOverview;
  selectedTeamId: string;
  simulationIterations: number;
}) {
  return (
    <section className="page-grid champion-page" aria-label="Champion odds">
      <div className="page-card span-full champion-hero">
        <p className="eyebrow">Champion model</p>
        <h2>{championOdds[0] ? teamWithFlag(championOdds[0].team_id, championOdds[0].team_name) : 'Waiting for odds'}</h2>
        <p>{simulationIterations.toLocaleString()} group simulations. Rating-based title odds are shown separately from group advancement paths.</p>
      </div>
      <Panel className="span-7 champion-panel" icon={<Trophy size={18} />} title="Title Probability Ranking">
        <ChampionProbabilityList odds={championOdds.slice(0, 16)} selectedTeamId={selectedTeamId} onSelectTeam={onSelectTeam} />
      </Panel>
      <div className="page-card span-5">
        <p className="eyebrow">Group path leaders</p>
        <h2>Best Group Win Profiles</h2>
        <div className="leader-list">
          {(overview?.group_leaders ?? []).map((team) => (
            <button className="leader-row" key={team.team_id} onClick={() => onSelectTeam(team.team_id)} type="button">
              <strong>{teamWithFlag(team.team_id, team.team_name)}</strong>
              <span>Group {team.group_name}</span>
              <em>{formatPercent(team.group_win_probability)}</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BracketPage({
  championOdds,
  onSelectTeam,
  selectedTeamId,
}: {
  championOdds: ChampionOdd[];
  onSelectTeam: (teamId: string) => void;
  selectedTeamId: string;
}) {
  return (
    <section className="page-grid bracket-page" aria-label="Knockout bracket">
      <Panel className="span-full bracket-panel full-bracket-panel" icon={<Trophy size={18} />} title="Knockout Bracket Forecast">
        <BracketPreview teams={championOdds} selectedTeamId={selectedTeamId} onSelectTeam={onSelectTeam} />
      </Panel>
      <div className="page-card span-full">
        <p className="eyebrow">Bracket status</p>
        <h2>Projected contenders, not fixed pairings</h2>
        <p>Full bracket pairings stay model-gated until knockout qualification rules and live group positions are available in the data feed.</p>
      </div>
    </section>
  );
}

function GroupStagePage({
  onSelectTeam,
  selectedTeamId,
  simulationTeams,
  standings,
}: {
  onSelectTeam: (teamId: string) => void;
  selectedTeamId: string;
  simulationTeams: SimulationTeam[];
  standings: Standing[];
}) {
  return (
    <section className="page-grid group-page" aria-label="Group stage">
      <Panel className="span-full standings-panel group-stage-full" icon={<ShieldCheck size={18} />} title="Group Stage Outlook">
        <GroupStandings
          standings={standings}
          simulationTeams={simulationTeams}
          selectedTeamId={selectedTeamId}
          onSelectTeam={onSelectTeam}
        />
      </Panel>
    </section>
  );
}

function DataPage({
  actualResults,
  diagnostics,
  evaluation,
  summary,
}: {
  actualResults: MatchForecast[];
  diagnostics?: ModelDiagnostics;
  evaluation?: ModelEvaluation;
  summary?: Summary;
}) {
  return (
    <section className="page-grid data-page" aria-label="Data and model quality">
      <Panel className="span-4 data-panel" icon={<Database size={18} />} title="Data Freshness">
        <DataFreshness summary={summary} />
      </Panel>
      <Panel className="span-8 inputs-panel" icon={<BarChart3 size={18} />} title="Model Diagnostics">
        <ModelDiagnosticsSummary diagnostics={diagnostics} evaluation={evaluation} />
      </Panel>
      <Panel className="span-7 past-panel" icon={<BarChart3 size={18} />} title="Past Predictions vs Actual Results">
        <PastPredictions rows={evaluation?.rows ?? []} />
      </Panel>
      <Panel className="span-5 actual-panel" icon={<Database size={18} />} title="Actual Results">
        <ActualResults results={actualResults.slice(0, 12)} />
      </Panel>
    </section>
  );
}

function SignalRow({
  label,
  lowerIsBetter = false,
  onSelectTeam,
  team,
  value,
}: {
  label: string;
  lowerIsBetter?: boolean;
  onSelectTeam: (teamId: string) => void;
  team?: { team_id: string; team_name: string } | null;
  value?: number;
}) {
  const valueText =
    value == null
      ? 'pending'
      : lowerIsBetter || value > 1
        ? value.toFixed(2)
        : formatPercent(value);

  return (
    <button className="signal-row" disabled={!team} onClick={() => team && onSelectTeam(team.team_id)} type="button">
      <span>{label}</span>
      <strong>{team ? teamWithFlag(team.team_id, team.team_name) : 'pending'}</strong>
      <em>{valueText}</em>
    </button>
  );
}

function DataFreshness({ summary }: { summary?: Summary }) {
  return (
    <>
      <dl className="metric-grid">
        <div>
          <dt>Status</dt>
          <dd>{summary?.data_status ?? 'pending'}</dd>
        </div>
        <div>
          <dt>As of</dt>
          <dd>{summary?.as_of_date ?? '2026-06-20'}</dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>{summary?.source_count ?? 0}</dd>
        </div>
        <div>
          <dt>Matches</dt>
          <dd>{summary?.match_count ?? 0}</dd>
        </div>
        <div>
          <dt>Teams</dt>
          <dd>{summary?.team_count ?? 0}</dd>
        </div>
        <div>
          <dt>History</dt>
          <dd>{summary?.historical_result_count ?? 0}</dd>
        </div>
      </dl>
      <p className="path-text">{summary?.database_path ?? 'DuckDB target pending'}</p>
    </>
  );
}

function ModelDiagnosticsSummary({
  diagnostics,
  evaluation,
}: {
  diagnostics?: ModelDiagnostics;
  evaluation?: ModelEvaluation;
}) {
  return (
    <div className="detail-stack">
      <dl className="metric-grid diagnostics-grid">
        <div>
          <dt>Coverage</dt>
          <dd>{diagnostics ? `${diagnostics.team_coverage.team_count} teams` : 'pending'}</dd>
        </div>
        <div>
          <dt>Min history</dt>
          <dd>{diagnostics?.team_coverage.min_matches ?? 0}</dd>
        </div>
        <div>
          <dt>Backtest</dt>
          <dd>{evaluation?.outcome_accuracy == null ? 'pending' : formatPercent(evaluation.outcome_accuracy)}</dd>
        </div>
        <div>
          <dt>Gate</dt>
          <dd>{evaluation?.quality_gate.clears_gate ? 'clear' : 'pending'}</dd>
        </div>
      </dl>
      {diagnostics ? <p className="sample-note">{diagnostics.limitations[0]}</p> : null}
      {evaluation ? (
        <p className="backtest-note">
          <strong>Pre-tournament backtest</strong>
          <span>
            {evaluation.correct_outcomes}/{evaluation.holdout_match_count} outcomes correct through holdout
            results, with training cut off on {evaluation.training_cutoff}.
          </span>
        </p>
      ) : null}
    </div>
  );
}

function Panel({
  className = '',
  icon,
  id,
  title,
  children,
}: {
  className?: string;
  icon: ReactNode;
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className={`panel ${className}`} id={id}>
      <div className="panel-heading">
        {icon}
        <h2>{title}</h2>
        <Info size={15} aria-hidden="true" />
      </div>
      {children}
    </article>
  );
}

function OverviewSummary({
  summary,
  upcomingCount,
  completedCount,
  leader,
  evaluationAccuracy,
  selectedMatch,
}: {
  summary?: Summary;
  upcomingCount: number;
  completedCount: number;
  leader?: ChampionOdd;
  evaluationAccuracy: number | null | undefined;
  selectedMatch?: MatchForecast;
}) {
  return (
    <div className="overview-summary">
      <div className="overview-headline">
        <p className="eyebrow">Forecast snapshot</p>
        <h3>{summary?.as_of_date ?? 'Waiting for data'}</h3>
        <span>{summary?.data_status === 'loaded' ? 'Data loaded' : 'API data pending'}</span>
      </div>
      <dl className="overview-metrics">
        <div>
          <dt>Upcoming</dt>
          <dd>{upcomingCount}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{completedCount}</dd>
        </div>
        <div>
          <dt>Teams</dt>
          <dd>{summary?.team_count ?? 0}</dd>
        </div>
        <div>
          <dt>Backtest</dt>
          <dd>{evaluationAccuracy == null ? 'pending' : formatPercent(evaluationAccuracy)}</dd>
        </div>
      </dl>
      <div className="overview-callouts">
        <div>
          <span>Title leader</span>
          <strong>{leader ? teamWithFlag(leader.team_id, leader.team_name) : 'pending'}</strong>
        </div>
        <div>
          <span>Inspecting</span>
          <strong>
            {selectedMatch
              ? `${selectedMatch.home_team} vs ${selectedMatch.away_team}`
              : 'Select a match from the forecasts table'}
          </strong>
        </div>
      </div>
    </div>
  );
}

function ChampionProbabilityList({
  odds,
  selectedTeamId,
  onSelectTeam,
}: {
  odds: ChampionOdd[];
  selectedTeamId?: string;
  onSelectTeam?: (teamId: string) => void;
}) {
  const topOdds = odds.slice(0, DISPLAYED_CHAMPION_ODDS);
  return (
    <div className="odds-list champion-list">
      {topOdds.map((team, index) => (
        <button
          className={team.team_id === selectedTeamId ? 'champion-row selected-team-row' : 'champion-row'}
          key={team.team_id}
          onClick={() => onSelectTeam?.(team.team_id)}
          type="button"
        >
          <span>{index + 1}</span>
          <strong>
            {teamWithFlag(team.team_id, team.team_name)}
          </strong>
          <div className="bar-track">
            <span style={{ width: `${Math.max(3, team.probability * 100)}%` }} />
          </div>
          <em>{formatPercent(team.probability)}</em>
        </button>
      ))}
    </div>
  );
}

function BracketPreview({
  teams,
  selectedTeamId,
  onSelectTeam,
}: {
  teams: ChampionOdd[];
  selectedTeamId?: string;
  onSelectTeam?: (teamId: string) => void;
}) {
  const bracketTeams = teams.slice(0, 8);
  return (
    <div className="bracket-grid" aria-label="Bracket preview">
      {[0, 1, 2].map((round) => (
        <div className={`bracket-round round-${round + 1}`} key={round}>
          <span>{round === 0 ? 'Round of 16' : round === 1 ? 'Quarterfinals' : 'Semifinals'}</span>
          {bracketTeams.slice(0, round === 0 ? 8 : round === 1 ? 4 : 2).map((team) => (
            <button
              className={team.team_id === selectedTeamId ? 'bracket-node selected-team-row' : 'bracket-node'}
              key={`${round}-${team.team_id}`}
              onClick={() => onSelectTeam?.(team.team_id)}
              type="button"
            >
              <span>
                <TeamFlag teamId={team.team_id} title={team.team_name} /> {team.team_name}
              </span>
            </button>
          ))}
        </div>
      ))}
      <div className="bracket-final">
        <Trophy size={24} aria-hidden="true" />
        <strong>
          {bracketTeams[0] ? teamWithFlag(bracketTeams[0].team_id, bracketTeams[0].team_name) : 'Pending'}
        </strong>
        <span>{bracketTeams[0] ? formatPercent(bracketTeams[0].probability) : '0.0%'}</span>
      </div>
    </div>
  );
}

function buildChampionOdds(
  forecasts: MatchForecast[],
  teams: Array<{ team_id: string; team_name: string }>,
): ChampionOdd[] {
  const teamNames = new Map(teams.map((team) => [team.team_id, team.team_name]));
  const ratings = new Map<string, number>();

  for (const forecast of forecasts) {
    ratings.set(
      forecast.home_team_id,
      Math.max(ratings.get(forecast.home_team_id) ?? 0, forecast.model_inputs.home_rating),
    );
    ratings.set(
      forecast.away_team_id,
      Math.max(ratings.get(forecast.away_team_id) ?? 0, forecast.model_inputs.away_rating),
    );
  }

  const weighted = [...ratings.entries()].map(([team_id, rating]) => {
    const titleWeight = 10 ** (((rating - 1500) / 400) * 1.8);
    return {
      team_id,
      team_name: teamNames.get(team_id) ?? team_id,
      rating,
      titleWeight,
    };
  });
  const totalWeight = weighted.reduce((sum, team) => sum + team.titleWeight, 0);

  return weighted
    .map((team) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      rating: team.rating,
      probability: totalWeight === 0 ? 0 : team.titleWeight / totalWeight,
    }))
    .sort((left, right) => right.probability - left.probability);
}
