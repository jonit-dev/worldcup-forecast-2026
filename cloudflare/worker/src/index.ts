type Snapshot = {
  generated_at: string;
  summary: Record<string, unknown>;
  teams: Array<Record<string, unknown> & { team_id: string }>;
  matches: Array<Record<string, unknown> & { home_team_id: string; away_team_id: string }>;
  standings: Array<Record<string, unknown>>;
  forecasts: Array<
    Record<string, unknown> & {
      match_date: string;
      match_id: string;
      home_team_id: string;
      away_team_id: string;
      status: string;
    }
  >;
  tournament_overview: Record<string, unknown>;
  simulation: Record<string, unknown>;
  diagnostics: Record<string, unknown>;
  evaluation: Record<string, unknown>;
  team_history: Record<string, Array<Record<string, unknown>>>;
  next_forecasts: Record<string, Snapshot['forecasts']>;
  potential_opponents: Record<string, Array<Record<string, unknown>>>;
};

type Env = {
  ASSETS: Fetcher;
  SNAPSHOT_KV?: KVNamespace;
  SNAPSHOT_REFRESH_URL?: string;
};

const SNAPSHOT_KEY = 'worldcup-forecast:snapshot';
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=60',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/health') {
      const snapshot = await loadSnapshot(request, env);
      return json({ status: 'ok', version: 'cloudflare-worker', as_of_date: snapshot.summary.as_of_date });
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(refreshSnapshot(env));
  },
};

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const snapshot = await loadSnapshot(request, env);

  if (url.pathname === '/api/summary') return json(snapshot.summary);
  if (url.pathname === '/api/teams') return json({ teams: snapshot.teams });
  if (url.pathname === '/api/standings') return json({ standings: snapshot.standings });
  if (url.pathname === '/api/tournament/overview') return json(snapshot.tournament_overview);
  if (url.pathname === '/api/simulations') return json(snapshot.simulation);
  if (url.pathname === '/api/model/diagnostics') return json(snapshot.diagnostics);
  if (url.pathname === '/api/model/evaluation') return json(snapshot.evaluation);

  if (url.pathname === '/api/matches') {
    const teamId = url.searchParams.get('team_id');
    const matches = teamId
      ? snapshot.matches.filter((match) => match.home_team_id === teamId || match.away_team_id === teamId)
      : snapshot.matches;
    return json({ matches });
  }

  if (url.pathname === '/api/forecasts') {
    const teamId = url.searchParams.get('team_id');
    const forecasts = teamId
      ? snapshot.forecasts.filter(
          (forecast) => forecast.home_team_id === teamId || forecast.away_team_id === teamId,
        )
      : snapshot.forecasts;
    return json({ forecasts });
  }

  const historyMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/history$/);
  if (historyMatch) {
    const teamId = decodeURIComponent(historyMatch[1]);
    return json({ team_id: teamId, history: snapshot.team_history[teamId] ?? [] });
  }

  const nextMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/next-forecasts$/);
  if (nextMatch) {
    const teamId = decodeURIComponent(nextMatch[1]);
    const limit = Number(url.searchParams.get('limit') ?? '3');
    return json({ team_id: teamId, forecasts: (snapshot.next_forecasts[teamId] ?? []).slice(0, limit) });
  }

  const potentialMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/potential-opponents$/);
  if (potentialMatch) {
    const teamId = decodeURIComponent(potentialMatch[1]);
    const limit = Number(url.searchParams.get('limit') ?? '6');
    return json({
      team_id: teamId,
      opponents: (snapshot.potential_opponents[teamId] ?? []).slice(0, limit),
      note:
        'Potential opponents are simulated from projected group finishing positions and the published 2026 Round-of-32 slot template. Best-third assignment is approximated.',
    });
  }

  return json({ error: 'Not found' }, 404);
}

async function loadSnapshot(request: Request, env: Env): Promise<Snapshot> {
  const stored = await env.SNAPSHOT_KV?.get(SNAPSHOT_KEY, 'json');
  if (stored) return stored as Snapshot;

  const assetUrl = new URL('/api-snapshot.json', request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl, request));
  if (!response.ok) {
    throw new Error(`Snapshot asset missing: ${response.status}`);
  }
  return (await response.json()) as Snapshot;
}

async function refreshSnapshot(env: Env): Promise<void> {
  if (!env.SNAPSHOT_KV || !env.SNAPSHOT_REFRESH_URL) return;

  const response = await fetch(env.SNAPSHOT_REFRESH_URL, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Snapshot refresh failed: ${response.status}`);
  }

  const snapshot = await response.text();
  JSON.parse(snapshot);
  await env.SNAPSHOT_KV.put(SNAPSHOT_KEY, snapshot);
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}
