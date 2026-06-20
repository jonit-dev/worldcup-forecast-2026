import type { MatchForecast, ModelDiagnostics, Simulation, Standing, Summary, Team } from './types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export async function getSummary(): Promise<Summary> {
  return getJson<Summary>('/api/summary');
}

export async function getTeams(): Promise<Team[]> {
  const response = await getJson<{ teams: Team[] }>('/api/teams');
  return response.teams;
}

export async function getForecasts(teamId?: string): Promise<MatchForecast[]> {
  const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
  const response = await getJson<{ forecasts: MatchForecast[] }>(`/api/forecasts${query}`);
  return response.forecasts;
}

export async function getNextForecasts(teamId: string): Promise<MatchForecast[]> {
  const response = await getJson<{ forecasts: MatchForecast[] }>(
    `/api/teams/${encodeURIComponent(teamId)}/next-forecasts?limit=4`,
  );
  return response.forecasts;
}

export async function getStandings(): Promise<Standing[]> {
  const response = await getJson<{ standings: Standing[] }>('/api/standings');
  return response.standings;
}

export async function getSimulation(): Promise<Simulation> {
  return getJson<Simulation>('/api/simulations?iterations=1000&seed=20260620');
}

export async function getModelDiagnostics(): Promise<ModelDiagnostics> {
  return getJson<ModelDiagnostics>('/api/model/diagnostics');
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}
