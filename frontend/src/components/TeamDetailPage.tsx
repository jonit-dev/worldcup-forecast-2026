import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { getTeamHistory, getNextForecasts } from '../api/client';
import type { SimulationTeam, Standing, Team } from '../api/types';
import { TeamFlag, teamWithFlag } from '../utils/flags';
import { formatPercent } from '../utils/format';

type TeamDetailPageProps = {
  team: Team;
  standing?: Standing;
  simulationTeam?: SimulationTeam;
  titleOdd?: { probability: number; rating: number };
  onBack: () => void;
  onSelectTeam: (teamId: string) => void;
};

export function TeamDetailPage({
  team,
  standing,
  simulationTeam,
  titleOdd,
  onBack,
  onSelectTeam,
}: TeamDetailPageProps) {
  const teamId = team.team_id;

  // Queries for history and upcoming forecasts specific to this team
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['team-history', teamId],
    queryFn: () => getTeamHistory(teamId),
    retry: false,
  });

  const { data: nextMatches, isLoading: isMatchesLoading } = useQuery({
    queryKey: ['team-next-matches', teamId],
    queryFn: () => getNextForecasts(teamId),
    retry: false,
  });

  // Calculate stats from history
  const historyStats = (() => {
    if (!history || history.length === 0) return null;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;

    for (const match of history) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const opponentScore = isHome ? match.away_score : match.home_score;
      
      goalsScored += teamScore;
      goalsConceded += opponentScore;

      if (teamScore > opponentScore) wins++;
      else if (teamScore === opponentScore) draws++;
      else losses++;
    }

    return {
      total: history.length,
      wins,
      draws,
      losses,
      goalsScored,
      goalsConceded,
      winRate: wins / history.length,
    };
  })();

  return (
    <div className="team-detail-container">
      {/* Premium Header Breadcrumb & Back button */}
      <div className="detail-navigation">
        <button className="back-btn" onClick={onBack} type="button">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
        <span className="nav-breadcrumbs">Teams / {team.team_name}</span>
      </div>

      {/* Team Hero Section */}
      <div className="team-hero-card">
        <div className="hero-flag-glow">
          <TeamFlag teamId={teamId} title={team.team_name} />
        </div>
        <div className="hero-info">
          <div className="confederation-badge">
            {team.confederation && team.confederation !== 'unknown' ? `${team.confederation} Member` : 'FIFA Member'}
          </div>
          <h1>{team.team_name}</h1>
          <div className="group-info-pill">
            {standing?.group_name ? `Group Stage: Group ${standing.group_name}` : 'Group Stage status pending'}
          </div>
        </div>

        {/* Model Ratings Stats */}
        <div className="hero-ratings">
          <div className="rating-card">
            <span className="rating-label">ELO Rating</span>
            <span className="rating-val">{titleOdd?.rating ? Math.round(titleOdd.rating) : '1500'}</span>
            <span className="rating-trend">
              <TrendingUp size={12} className="inline mr-1" />
              Model Estimate
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="detail-layout-grid">
        <div className="detail-col detail-outlook">
          {/* Tournament Probabilities Card */}
          <div className="detail-widget">
            <div className="widget-header">
              <Trophy size={18} className="icon-gold" />
              <h3>Tournament Simulation Outlook</h3>
            </div>
            <div className="prob-meter-group">
              <div className="prob-meter-row">
                <div className="prob-meter-info">
                  <span>Win Tournament</span>
                  <strong>{titleOdd ? formatPercent(titleOdd.probability) : '0.0%'}</strong>
                </div>
                <div className="prob-meter-bar-track">
                  <div 
                    className="prob-meter-bar fill-gold" 
                    style={{ width: `${(titleOdd?.probability ?? 0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="prob-meter-row">
                <div className="prob-meter-info">
                  <span>Advance to Knockout</span>
                  <strong>{simulationTeam ? formatPercent(simulationTeam.advance_probability) : '0.0%'}</strong>
                </div>
                <div className="prob-meter-bar-track">
                  <div 
                    className="prob-meter-bar fill-blue" 
                    style={{ width: `${(simulationTeam?.advance_probability ?? 0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="prob-meter-row">
                <div className="prob-meter-info">
                  <span>Win Group</span>
                  <strong>{simulationTeam ? formatPercent(simulationTeam.group_win_probability) : '0.0%'}</strong>
                </div>
                <div className="prob-meter-bar-track">
                  <div 
                    className="prob-meter-bar fill-teal" 
                    style={{ width: `${(simulationTeam?.group_win_probability ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats overview */}
            {historyStats && (
              <div className="quick-stats-strip">
                <div className="quick-stat">
                  <span>Wins</span>
                  <strong>{historyStats.wins}</strong>
                </div>
                <div className="quick-stat">
                  <span>Draws</span>
                  <strong>{historyStats.draws}</strong>
                </div>
                <div className="quick-stat">
                  <span>Losses</span>
                  <strong>{historyStats.losses}</strong>
                </div>
                <div className="quick-stat">
                  <span>Win Rate</span>
                  <strong>{formatPercent(historyStats.winRate)}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-col detail-upcoming">
          <div className="detail-widget">
            <div className="widget-header">
              <Calendar size={18} className="icon-blue" />
              <h3>Upcoming Forecasted Matches</h3>
            </div>
            
            <div className="upcoming-list">
              {isMatchesLoading ? (
                <div className="loader-container">Loading upcoming forecast...</div>
              ) : !nextMatches || nextMatches.length === 0 ? (
                <div className="empty-state">No scheduled matches remaining in the forecast model.</div>
              ) : (
                nextMatches.map((match) => {
                  const isHome = match.home_team_id === teamId;
                  const opponentId = isHome ? match.away_team_id : match.home_team_id;
                  const opponentName = isHome ? match.away_team : match.home_team;
                  const winProb = isHome ? match.probabilities.home_win : match.probabilities.away_win;
                  const drawProb = match.probabilities.draw;
                  const lossProb = isHome ? match.probabilities.away_win : match.probabilities.home_win;

                  return (
                    <div className="upcoming-item-card" key={match.match_id}>
                      <div className="upcoming-item-header">
                        <span className="match-tag">Group {match.group_name || match.stage}</span>
                        <span className="match-date-tag">{match.match_date}</span>
                      </div>
                      
                      <div className="upcoming-teams-row">
                        <TeamFlag className="team-node-flag" teamId={teamId} title={team.team_name} />
                        <span className="team-node-name">{team.team_name}</span>
                        <span className="vs-divider">vs</span>
                        <button 
                          className="team-node-link" 
                          onClick={() => onSelectTeam(opponentId)}
                          type="button"
                        >
                          <TeamFlag className="team-node-flag" teamId={opponentId} title={opponentName} />
                          <span className="team-node-name underline-hover">{opponentName}</span>
                        </button>
                      </div>

                      {/* Probabilities bar */}
                      <div className="match-probability-bar">
                        <div className="prob-segment fill-win" style={{ width: `${winProb * 100}%` }} title={`Win: ${formatPercent(winProb)}`}>
                          W {formatPercent(winProb)}
                        </div>
                        <div className="prob-segment fill-draw" style={{ width: `${drawProb * 100}%` }} title={`Draw: ${formatPercent(drawProb)}`}>
                          D {formatPercent(drawProb)}
                        </div>
                        <div className="prob-segment fill-loss" style={{ width: `${lossProb * 100}%` }} title={`Loss: ${formatPercent(lossProb)}`}>
                          L {formatPercent(lossProb)}
                        </div>
                      </div>

                      <div className="upcoming-goals-hint">
                        Expected goals: {match.expected_goals.home.toFixed(1)} - {match.expected_goals.away.toFixed(1)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="detail-col detail-history">
          <div className="detail-widget full-height-widget">
            <div className="widget-header">
              <Sparkles size={18} className="icon-purple" />
              <h3>Historical Results History</h3>
            </div>
            
            <div className="history-table-container">
              {isHistoryLoading ? (
                <div className="loader-container">Loading historical database records...</div>
              ) : !history || history.length === 0 ? (
                <div className="empty-state">No historical matches in this database segment.</div>
              ) : (
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Tournament</th>
                      <th>Matchup</th>
                      <th className="text-center">Score</th>
                      <th className="text-center">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((match, idx) => {
                      const isHome = match.home_team_id === teamId;
                      const opponentName = isHome ? match.away_team : match.home_team;
                      const opponentId = isHome ? match.away_team_id : match.home_team_id;
                      
                      const teamScore = isHome ? match.home_score : match.away_score;
                      const opponentScore = isHome ? match.away_score : match.home_score;

                      let badgeClass = 'badge-draw';
                      let outcomeLabel = 'Draw';
                      if (teamScore > opponentScore) {
                        badgeClass = 'badge-win';
                        outcomeLabel = 'Win';
                      } else if (teamScore < opponentScore) {
                        badgeClass = 'badge-loss';
                        outcomeLabel = 'Loss';
                      }

                      return (
                        <tr key={`${match.match_date}-${idx}`}>
                          <td className="text-muted text-xs">{match.match_date}</td>
                          <td className="text-muted text-xs max-w-150 truncate" title={match.tournament}>
                            {match.tournament}
                          </td>
                          <td>
                            <div className="matchup-cell">
                              <span className="bold">{team.team_name}</span>
                              <span className="text-muted">vs</span>
                              <button 
                                className="opponent-link"
                                onClick={() => onSelectTeam(opponentId)}
                                type="button"
                              >
                                {teamWithFlag(opponentId, opponentName)}
                              </button>
                            </div>
                          </td>
                          <td className="text-center font-mono font-bold">
                            {teamScore} - {opponentScore}
                          </td>
                          <td className="text-center">
                            <span className={`outcome-badge ${badgeClass}`}>{outcomeLabel}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
