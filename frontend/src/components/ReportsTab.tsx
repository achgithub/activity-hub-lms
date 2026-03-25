import React, { useState, useEffect } from 'react';
import { Game, API_BASE } from '../types';

interface ReportsTabProps {
  games: Game[];
}

const ReportsTab: React.FC<ReportsTabProps> = ({ games }) => {
  const [reportGameId, setReportGameId] = useState<number>(0);
  const [reportRound, setReportRound] = useState<string>('all');
  const [reportData, setReportData] = useState<any>(null);

  // Fetch report data when game is selected
  useEffect(() => {
    if (reportGameId === 0) {
      setReportData(null);
      return;
    }

    const fetchReport = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/report/${reportGameId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch report:', err);
      }
    };

    fetchReport();
  }, [reportGameId]);

  return (
    <div>
      <div className="ah-card">
        <h3 className="ah-section-title">Game Reports</h3>

        {/* Game Selection */}
        <div className="mt-4">
          <label className="block mb-2">
            <strong>Select Game:</strong>
          </label>
          <select
            className="ah-select w-full max-w-[400px]"
            value={reportGameId}
            onChange={(e) => setReportGameId(parseInt(e.target.value))}
          >
            <option value={0}>-- Select a game --</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name} ({game.status})
              </option>
            ))}
          </select>
        </div>

        {/* Round Selection */}
        {reportGameId > 0 && (
          <div className="mt-4">
            <label className="block mb-2">
              <strong>Select Round:</strong>
            </label>
            <select
              className="ah-select w-full max-w-[400px]"
              value={reportRound}
              onChange={(e) => setReportRound(e.target.value)}
            >
              <option value="all">All Rounds</option>
              {(() => {
                const selectedGame = games.find(g => g.id === reportGameId);
                if (!selectedGame) return null;
                return Array.from({ length: selectedGame.currentRound }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Round {i + 1}
                  </option>
                ));
              })()}
            </select>
          </div>
        )}
      </div>

      {/* Report Display */}
      {reportGameId > 0 && reportData && (
        <div className="mt-4">
          {/* Game Header */}
          <div className="ah-card">
            <div className="ah-flex-between mb-2">
              <h2>{reportData.game.name}</h2>
              <button
                className="ah-btn-outline"
                onClick={() => {
                  fetch(`${API_BASE}/api/report/${reportGameId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .then(res => res.json())
                    .then(data => setReportData(data))
                    .catch(err => console.error('Failed to refresh report:', err));
                }}
              >
                🔄 Refresh
              </button>
            </div>
            <p className="ah-meta">
              Starting Players: {reportData.game.startingPlayers} | Status: {reportData.game.status}
              {reportData.game.winnerName && ` | Winner: ${reportData.game.winnerName}`}
            </p>
          </div>

          {/* Rounds Display */}
          {reportData.rounds && reportData.rounds.length > 0 && (
            <>
              {reportData.rounds
                .filter((round: any) => reportRound === 'all' || round.roundNumber === parseInt(reportRound))
                .map((round: any) => (
                  <div key={round.roundNumber} className="ah-card mt-4">
                    <h3 className="ah-section-title">
                      Round {round.roundNumber} - {round.status === 'open' ? 'OPEN' : 'CLOSED'}
                    </h3>

                    {round.status === 'open' && (
                      <div className="mt-4">
                        <p><strong>Active Players:</strong> {round.activePlayers}</p>
                        {round.teamPicks && Object.keys(round.teamPicks).length > 0 && (
                          <div className="mt-4">
                            <p className="font-semibold mb-2">Team Picks:</p>
                            <div className="ah-grid-auto gap-2">
                              {Object.entries(round.teamPicks)
                                .sort(([, a]: any, [, b]: any) => b - a)
                                .map(([team, count]: any) => (
                                  <div key={team} className="p-2 rounded">
                                    {team} ({count})
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {round.status === 'closed' && (
                      <div className="mt-4">
                        <div className="flex gap-8 mb-4">
                          <p><strong>Eliminated:</strong> {round.eliminatedCount} players</p>
                          <p><strong>Through to Round {round.roundNumber + 1}:</strong> {round.throughCount} players</p>
                        </div>
                        {round.teamResults && Object.keys(round.teamResults).length > 0 && (
                          <div>
                            <p className="font-semibold mb-2">Team Results:</p>
                            <div className="ah-grid-auto gap-2">
                              {Object.entries(round.teamResults)
                                .sort(([a]: any, [b]: any) => a.localeCompare(b))
                                .map(([team, result]: any) => {
                                  return (
                                    <div
                                      key={team}
                                      className="p-2 rounded font-semibold"
                                    >
                                      {team} - {result.toUpperCase()}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
