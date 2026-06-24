export type Summary = {
  as_of_date: string;
  database_path: string;
  model_status: string;
  data_status: string;
  last_refresh_at: string | null;
  source_count: number;
  team_count: number;
  match_count: number;
  historical_result_count: number;
  next_steps: string[];
};

export type Team = {
  team_id: string;
  team_name: string;
  confederation: string;
};

export type ChampionOdd = {
  team_id: string;
  team_name: string;
  rating: number;
  probability: number;
};

export type MatchForecast = {
  match_id: string;
  match_date: string;
  stage: string;
  group_name: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team: string;
  away_team: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  expected_goals: { home: number; away: number };
  probabilities: { home_win: number; draw: number; away_win: number };
  top_scorelines: Array<{ home_score: number; away_score: number; probability: number }>;
  model: { version: string; config_hash: string; as_of_date: string; note: string };
  model_inputs: {
    home_rating: number;
    away_rating: number;
    home_attack: number;
    away_attack: number;
    home_defense: number;
    away_defense: number;
    home_matches_used: number;
    away_matches_used: number;
  };
};

export type PotentialOpponent = {
  team_id: string;
  team_name: string;
  group_name: string;
  estimated_match_probability: number;
  conditional_match_probability: number;
  advance_probability: number;
  selected_team_advance_probability: number;
  selected_team_win_probability: number;
  draw_probability: number;
  opponent_win_probability: number;
  expected_goals: { home: number; away: number };
  top_scoreline: { home_score: number; away_score: number; probability: number };
};

export type Standing = {
  group_name: string;
  team_id: string;
  team_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
};

export type SimulationTeam = {
  team_id: string;
  group_name: string;
  group_win_probability: number;
  advance_probability: number;
};

export type Simulation = {
  model_version: string;
  config_hash: string;
  as_of_date: string;
  iterations: number;
  seed: number;
  teams: SimulationTeam[];
  note: string;
};

export type TournamentOverview = {
  model_version: string;
  config_hash: string;
  as_of_date: string;
  match_counts: {
    upcoming: number;
    completed: number;
    total: number;
  };
  team_count: number;
  group_count: number;
  title_leader: ChampionOdd | null;
  strongest_attack: { team_id: string; team_name: string; value: number } | null;
  strongest_defense: { team_id: string; team_name: string; value: number } | null;
  featured_matches: MatchForecast[];
  champion_odds: ChampionOdd[];
  group_leaders: Array<{
    team_id: string;
    team_name: string;
    group_name: string;
    group_win_probability: number;
    advance_probability: number;
  }>;
  teams: Array<{
    team_id: string;
    team_name: string;
    confederation: string;
    rating: number;
    group_name: string | null;
    advance_probability: number | null;
    group_win_probability: number | null;
  }>;
  note: string;
};

export type ModelDiagnostics = {
  model_version: string;
  config_hash: string;
  as_of_date: string;
  ranking_rows: number;
  historical_result_rows: number;
  current_completed_matches: number;
  coverage_threshold: number;
  team_coverage: {
    team_count: number;
    min_matches: number;
    median_matches: number;
    max_matches: number;
    teams_below_threshold: string[];
  };
  limitations: string[];
};

export type ModelEvaluation = {
  model_version: string;
  config_hash: string;
  as_of_date: string;
  tournament_start_date: string;
  training_cutoff: string;
  completed_current_matches_used_for_training: number;
  historical_result_rows_used_for_training: number;
  holdout_match_count: number;
  correct_outcomes: number;
  outcome_accuracy: number | null;
  log_loss: number | null;
  brier_score: number | null;
  exact_top_scoreline_accuracy: number | null;
  average_actual_outcome_probability: number | null;
  quality_gate: {
    label: string;
    accuracy_threshold: number;
    log_loss_threshold: number;
    clears_gate: boolean;
  };
  statistical_relevance: {
    accuracy_confidence_interval_95: { low: number; high: number } | null;
    chance_baseline_accuracy: number;
    chance_baseline_p_value: number | null;
    warning: string;
  };
  rows: EvaluationRow[];
  note: string;
};

export type EvaluationRow = {
  match_id: string;
  match_date: string;
  home_team_id: string;
  away_team_id: string;
  home_team: string;
  away_team: string;
  actual_score: { home: number; away: number };
  actual_outcome: 'home_win' | 'draw' | 'away_win';
  predicted_outcome: 'home_win' | 'draw' | 'away_win';
  correct_outcome: boolean;
  actual_outcome_probability: number;
  actual_log_loss: number;
  brier_score: number;
  probabilities: { home_win: number; draw: number; away_win: number };
  expected_goals: { home: number; away: number };
  top_scoreline: { home_score: number; away_score: number; probability: number };
  top_scoreline_correct: boolean;
};

export type TeamHistoryMatch = {
  match_date: string;
  home_team_id: string;
  away_team_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  tournament: string;
  neutral_site: boolean;
};
