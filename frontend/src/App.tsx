import { Activity, Database, LineChart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSummary } from './api/client';

export function App() {
  const summaryQuery = useQuery({
    queryKey: ['summary'],
    queryFn: getSummary,
    retry: false,
  });

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Project status">
        <div>
          <p className="eyebrow">FIFA World Cup 2026</p>
          <h1>Forecast Workbench</h1>
        </div>
        <div className="status-pill">
          <Activity size={18} aria-hidden="true" />
          <span>{summaryQuery.isSuccess ? 'API connected' : 'API pending'}</span>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Forecast dashboard">
        <article className="panel">
          <div className="panel-heading">
            <LineChart size={20} aria-hidden="true" />
            <h2>Model</h2>
          </div>
          <p>Status: {summaryQuery.data?.model_status ?? 'waiting for Flask'}</p>
          <p>As of: {summaryQuery.data?.as_of_date ?? '2026-06-20'}</p>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <Database size={20} aria-hidden="true" />
            <h2>Data</h2>
          </div>
          <p>Status: {summaryQuery.data?.data_status ?? 'not loaded'}</p>
          <p className="path-text">{summaryQuery.data?.database_path ?? 'DuckDB target pending'}</p>
        </article>

        <article className="panel panel-wide">
          <h2>Next Build Tickets</h2>
          <ul>
            {(summaryQuery.data?.next_steps ?? [
              'Start Flask API',
              'Ingest current tournament data',
              'Train baseline forecast model',
            ]).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
