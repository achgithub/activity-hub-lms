import React, { useState, useEffect } from 'react';
import { GameDetail, Pick, Team, API_BASE } from '../types';

interface GameDetailTabProps {
  gameId: number;
  token: string;
  onBack: () => void;
  groupTeams: Record<number, Team[]>;
  setGroupTeams: (teams: Record<number, Team[]>) => void;
  collapsedCards: Record<string, boolean>;
  toggleCard: (cardName: string) => void;
  players: { id: number; name: string }[];
  onGamesChange: () => void;
}

const GameDetailTab: React.FC<GameDetailTabProps> = ({
  gameId,
  token,
  onBack,
  groupTeams,
  setGroupTeams,
  collapsedCards,
  toggleCard,
  players,
  onGamesChange,
}) => {
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [pickAssignments, setPickAssignments] = useState<Record<string, number>>({});
  const [pickResults, setPickResults] = useState<Record<number, string>>({});
  const [usedTeams, setUsedTeams] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [playersToAdd, setPlayersToAdd] = useState<string[]>([]);
  const [picksFinalized, setPicksFinalized] = useState(false);
  const [playerSearchText, setPlayerSearchText] = useState<string>('');
  const [showUnassignedPlayersOnly, setShowUnassignedPlayersOnly] = useState<boolean>(false);
  const [revealedPlayers, setRevealedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchGameDetail = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/games/${gameId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setGameDetail(data);

        // Fetch teams for the game's group if not already loaded
        if (data.game.groupId) {
          const teamsRes = await fetch(`${API_BASE}/api/groups/${data.game.groupId}/teams`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const teamsData = await teamsRes.json();
          setGroupTeams({ ...groupTeams, [data.game.groupId]: teamsData.teams || [] });
        }

        // Fetch used teams for this game
        const usedTeamsRes = await fetch(`${API_BASE}/api/games/${gameId}/used-teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const usedTeamsData = await usedTeamsRes.json();
        setUsedTeams(usedTeamsData.usedTeams || {});

        // If there are rounds, fetch picks for the latest round
        if (data.rounds && data.rounds.length > 0) {
          const latestRound = data.rounds[data.rounds.length - 1];
          const picksRes = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/picks`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const picksData = await picksRes.json();
          setPicks(picksData.picks || []);

          // Initialize pick assignments and results from existing picks
          const assignments: Record<string, number> = {};
          const results: Record<number, string> = {};
          (picksData.picks || []).forEach((pick: Pick) => {
            if (pick.teamId) {
              assignments[pick.playerName] = pick.teamId;
            }
            if (pick.result) {
              results[pick.id] = pick.result;
            }
          });
          setPickAssignments(assignments);
          setPickResults(results);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch game detail:', err);
        setLoading(false);
      }
    };

    fetchGameDetail();
  }, [gameId, token]);

  const handleBackToGamesList = () => {
    onBack();
  };

  const handleDeleteGame = async () => {
    if (!gameDetail || !token || !gameId) return;

    if (!window.confirm(`Are you sure you want to delete "${gameDetail.game.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok || res.status === 204) {
        alert('Game deleted successfully');
        onGamesChange();
        handleBackToGamesList();
      } else {
        const error = await res.text();
        alert(`Failed to delete game: ${error}`);
      }
    } catch (err) {
      console.error('Failed to delete game:', err);
      alert('Failed to delete game');
    }
  };

  const handleAddPlayersToGame = async () => {
    if (!gameDetail || !token) return;
    if (playersToAdd.length === 0) {
      alert('Please select at least one player to add');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerNames: playersToAdd }),
      });

      if (res.ok || res.status === 204) {
        // Refresh game detail
        const gameRes = await fetch(`${API_BASE}/api/games/${gameId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const gameData = await gameRes.json();
        setGameDetail(gameData);
        setShowAddPlayers(false);
        setPlayersToAdd([]);
      } else {
        const error = await res.text();
        alert(`Failed to add players: ${error}`);
      }
    } catch (err) {
      console.error('Failed to add players:', err);
      alert('Failed to add players');
    }
  };

  const handleSavePicks = async () => {
    if (!gameDetail || !token) return;

    const latestRound = gameDetail.rounds[gameDetail.rounds.length - 1];
    if (!latestRound) return;

    // Build picks array from assignments
    const picksToSave = Object.entries(pickAssignments).map(([playerName, teamId]) => ({
      playerName,
      teamId,
    }));

    if (picksToSave.length === 0) {
      alert('No picks to save');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ picks: picksToSave }),
      });

      if (res.ok || res.status === 204) {
        // Refresh picks
        const picksRes = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/picks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const picksData = await picksRes.json();
        setPicks(picksData.picks || []);

        alert('Picks saved successfully');
      } else {
        const error = await res.text();
        alert(`Failed to save picks: ${error}`);
      }
    } catch (err) {
      console.error('Failed to save picks:', err);
      alert('Failed to save picks');
    }
  };

  const handleFinalizePicks = async () => {
    if (!gameDetail || !token) return;

    const latestRound = gameDetail.rounds[gameDetail.rounds.length - 1];
    if (!latestRound) return;

    // First, save any pending picks from pickAssignments
    const picksToSave = Object.entries(pickAssignments).map(([playerName, teamId]) => ({
      playerName,
      teamId,
    }));

    if (picksToSave.length > 0) {
      try {
        await fetch(`${API_BASE}/api/rounds/${latestRound.id}/picks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ picks: picksToSave }),
        });
      } catch (err) {
        console.error('Failed to save pending picks:', err);
        alert('Failed to save pending picks');
        return;
      }
    }

    // Refresh picks to get current state
    try {
      const picksRes = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/picks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const picksData = await picksRes.json();
      const currentPicks = picksData.picks || [];

      // Count active players and existing picks
      const activeParticipants = gameDetail.participants.filter((p) => p.isActive);
      const playersWithPicks = currentPicks.filter((p: Pick) => p.teamId).length;
      const missingCount = activeParticipants.length - playersWithPicks;

      if (missingCount > 0) {
        const confirmed = window.confirm(
          `${missingCount} player${missingCount > 1 ? 's have' : ' has'} no pick assigned. Auto-assign next available team alphabetically?`
        );
        if (!confirmed) return;
      }
    } catch (err) {
      console.error('Failed to check picks:', err);
      alert('Failed to check picks');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/finalize-picks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();

        // Refresh picks
        const picksRes = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/picks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const picksData = await picksRes.json();
        setPicks(picksData.picks || []);
        setPicksFinalized(true);

        if (data.missingCount > 0) {
          alert(`Picks finalized! Auto-assigned ${data.missingCount} player${data.missingCount > 1 ? 's' : ''}.`);
        } else {
          alert('All picks confirmed! Ready for results entry.');
        }
      } else {
        const error = await res.text();
        alert(`Failed to finalize picks: ${error}`);
      }
    } catch (err) {
      console.error('Failed to finalize picks:', err);
      alert('Failed to finalize picks');
    }
  };

  const handleSaveResults = async () => {
    if (!gameDetail || !token) return;

    const latestRound = gameDetail.rounds[gameDetail.rounds.length - 1];
    if (!latestRound) return;

    // Build results array
    const resultsToSave = Object.entries(pickResults).map(([pickId, result]) => ({
      pickId: Number(pickId),
      result,
    }));

    if (resultsToSave.length === 0) {
      alert('No results to save');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ results: resultsToSave }),
      });

      if (res.ok || res.status === 204) {
        alert('Results saved');
        // Refresh picks to show updated results
        const picksRes = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/picks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const picksData = await picksRes.json();
        setPicks(picksData.picks || []);
      } else {
        const error = await res.text();
        alert(`Failed to save results: ${error}`);
      }
    } catch (err) {
      console.error('Failed to save results:', err);
      alert('Failed to save results');
    }
  };

  const handleCloseRound = async () => {
    if (!gameDetail || !token) return;

    const latestRound = gameDetail.rounds[gameDetail.rounds.length - 1];
    if (!latestRound) return;

    // Check that all picks have results
    const allPicksHaveResults = picks.every((pick) => pickResults[pick.id] || pick.result);
    if (!allPicksHaveResults) {
      if (!window.confirm('Not all picks have results. Close round anyway?')) {
        return;
      }
    }

    // Save any pending results first
    const resultsToSave = Object.entries(pickResults).map(([pickId, result]) => ({
      pickId: Number(pickId),
      result,
    }));

    if (resultsToSave.length > 0) {
      try {
        await fetch(`${API_BASE}/api/rounds/${latestRound.id}/results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ results: resultsToSave }),
        });
      } catch (err) {
        console.error('Failed to save results before closing:', err);
        alert('Failed to save results');
        return;
      }
    }

    // Close the round via dedicated endpoint
    try {
      const res = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok || res.status === 204) {
        alert('Round closed');
        // Refresh game detail
        const gameRes = await fetch(`${API_BASE}/api/games/${gameId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const gameData = await gameRes.json();
        setGameDetail(gameData);
        setPickResults({});
        setPicksFinalized(false);
      } else {
        const error = await res.text();
        alert(`Failed to close round: ${error}`);
      }
    } catch (err) {
      console.error('Failed to close round:', err);
      alert('Failed to close round');
    }
  };

  const handleAdvanceRound = async () => {
    if (!gameDetail || !token) return;

    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/advance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await res.json();

        // Refresh game detail
        const gameRes = await fetch(`${API_BASE}/api/games/${gameId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const gameData = await gameRes.json();
        setGameDetail(gameData);

        // Refresh used teams (previous round is now closed)
        const usedTeamsRes = await fetch(`${API_BASE}/api/games/${gameId}/used-teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const usedTeamsData = await usedTeamsRes.json();
        setUsedTeams(usedTeamsData.usedTeams || {});

        // Fetch picks for new round
        if (gameData.rounds && gameData.rounds.length > 0) {
          const latestRound = gameData.rounds[gameData.rounds.length - 1];
          const picksRes = await fetch(`${API_BASE}/api/rounds/${latestRound.id}/picks`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const picksData = await picksRes.json();
          setPicks(picksData.picks || []);
          setPickAssignments({});
          setPickResults({});
          setPicksFinalized(false);
        }
      } else {
        const error = await res.text();
        alert(`Failed to advance round: ${error}`);
      }
    } catch (err) {
      console.error('Failed to advance round:', err);
      alert('Failed to advance round');
    }
  };

  if (loading) {
    return (
      <div className="ah-flex-center-justify ah-py-4">
        <div className="ah-spinner"></div>
        <p className="ah-ml-2">Loading game...</p>
      </div>
    );
  }

  if (!gameDetail) {
    return <p className="ah-meta">Game not found</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="ah-card">
        <div className="ah-flex-between">
          <button className="ah-btn-outline" onClick={handleBackToGamesList}>
            ← Back to Games
          </button>
          <button className="ah-btn-danger" onClick={handleDeleteGame}>
            Delete Game
          </button>
        </div>
        <div className="mt-4">
          <h3 className="ah-section-title">{gameDetail.game.name}</h3>
          <p className="ah-meta">
            {gameDetail.game.groupName} •{' '}
            <span
              className={`ah-status ${
                gameDetail.game.status === 'active' ? 'ah-status--active' : 'ah-status--complete'
              }`}
            >
              {gameDetail.game.status}
            </span>
          </p>
          <div className="mt-3 text-sm">
            <strong>Configuration:</strong>{' '}
            {gameDetail.game.postponeAsWin ? 'Postpone=Win' : 'Postpone=Loss'} •{' '}
            {gameDetail.game.winnerMode === 'single' ? '1 Winner' : `Multiple Winners (max ${gameDetail.game.maxWinners})`} •{' '}
            {gameDetail.game.rolloverMode === 'round' ? 'Rollover Round' : 'Rollover Game'}
          </div>
          {gameDetail.game.status === 'completed' && gameDetail.game.winnerName && (
            <p className="mt-2 text-lg font-semibold">
              Winner: {gameDetail.game.winnerName} 🏆
            </p>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="ah-card">
        <div className="ah-section-header" onClick={() => toggleCard('participants')}>
          <h3 className="ah-section-title">Participants ({gameDetail.participants.length})</h3>
          <div className="ah-flex-center gap-2">
            {gameDetail.game.status === 'active' && !collapsedCards['participants'] && (
              <button
                className="ah-btn-outline px-4 py-2 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddPlayers(!showAddPlayers);
                }}
              >
                {showAddPlayers ? 'Cancel' : '+ Add Players'}
              </button>
            )}
            <span className={`ah-section-toggle ${collapsedCards['participants'] ? 'collapsed' : ''}`}>▼</span>
          </div>
        </div>

        {!collapsedCards['participants'] && (
          <>
            {showAddPlayers && (
              <div className="ah-filter-box mb-4">
                <p className="ah-meta mb-2">Select players to add:</p>
                <div className="ah-player-grid max-h-[200px]">
                  {players.filter(p => !gameDetail.participants.some(part => part.playerName === p.name)).map((player) => (
                    <label key={player.id} className="ah-player-grid-item">
                      <input
                        type="checkbox"
                        checked={playersToAdd.includes(player.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPlayersToAdd([...playersToAdd, player.name]);
                          } else {
                            setPlayersToAdd(playersToAdd.filter(n => n !== player.name));
                          }
                        }}
                      />
                      <span>{player.name}</span>
                    </label>
                  ))}
                </div>
                <button
                  className="ah-btn-primary mt-2"
                  onClick={handleAddPlayersToGame}
                >
                  Add Selected Players
                </button>
              </div>
            )}

            <div className="ah-grid-auto">
              {gameDetail.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="ah-flex-between py-2 px-3 rounded-md text-sm font-medium"
                >
                  <span>{participant.playerName}</span>
                  {!participant.isActive && participant.eliminatedInRound && (
                    <span className="text-xs px-2 py-0.5 rounded">
                      R{participant.eliminatedInRound}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Current Round Management */}
      {gameDetail.game.status === 'active' &&
        gameDetail.rounds &&
        gameDetail.rounds.length > 0 && (
          <div>
            {(() => {
              const currentRound = gameDetail.rounds[gameDetail.rounds.length - 1];
              const activePlayers = gameDetail.participants.filter((p) => p.isActive);

              return (
                <div className="ah-card">
                  <div className="ah-section-header" onClick={() => toggleCard('round')}>
                    <h3 className="ah-section-title">
                      Round {currentRound.roundNumber} - {currentRound.status === 'open' ? 'Open' : 'Closed'}
                    </h3>
                    <div className="ah-flex-center gap-2">
                      {currentRound.status === 'closed' && !collapsedCards['round'] && (
                        <button className="ah-btn-primary" onClick={(e) => { e.stopPropagation(); handleAdvanceRound(); }}>
                          Next Round →
                        </button>
                      )}
                      <span className={`ah-section-toggle ${collapsedCards['round'] ? 'collapsed' : ''}`}>▼</span>
                    </div>
                  </div>

                  {!collapsedCards['round'] && (
                    <>
                      {currentRound.status === 'open' && (
                        <div>
                          <p className="ah-meta mb-4">
                            Assign teams to active players:
                          </p>

                          {/* Player filters */}
                          <div className="mb-4 p-4 rounded-lg">
                            <div className="flex gap-4 items-center flex-wrap">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  placeholder="Search players (e.g., 'Dave P' to find Dave P...)"
                                  value={playerSearchText}
                                  onChange={(e) => setPlayerSearchText(e.target.value)}
                                  className="ah-input w-full"
                                />
                              </div>
                              <label className="flex items-center gap-2 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={showUnassignedPlayersOnly}
                                  onChange={(e) => setShowUnassignedPlayersOnly(e.target.checked)}
                                />
                                <span>Show unassigned only</span>
                              </label>
                            </div>
                          </div>

                          {/* Team assignment for each active player */}
                          <div className="ah-list gap-3">
                            {activePlayers.filter((participant) => {
                              const existingPick = picks.find(
                                (p) => p.playerName === participant.playerName
                              );
                              const hasAssignment = pickAssignments[participant.playerName] || existingPick?.teamId;

                              // Player name search filter (case insensitive)
                              const matchesSearch = !playerSearchText ||
                                participant.playerName.toLowerCase().includes(playerSearchText.toLowerCase());

                              // Unassigned players only filter
                              const matchesUnassigned = !showUnassignedPlayersOnly || !hasAssignment;

                              return matchesSearch && matchesUnassigned;
                            }).map((participant) => {
                              const existingPick = picks.find(
                                (p) => p.playerName === participant.playerName
                              );
                              const isRevealed = revealedPlayers.has(participant.playerName);
                              const assignedTeamId = pickAssignments[participant.playerName] || existingPick?.teamId;
                              const hasAssignment = !!assignedTeamId;
                              const maskedName = '*************************';

                              return (
                                <div key={participant.id} className="ah-flex-between p-3 border rounded-md gap-3">
                                  <strong>{participant.playerName}</strong>

                                  <div className="flex gap-2 items-center">
                                    <select
                                      className="ah-select-fixed"
                                      value={assignedTeamId || ''}
                                      onChange={(e) =>
                                        setPickAssignments({
                                          ...pickAssignments,
                                          [participant.playerName]: Number(e.target.value),
                                        })
                                      }
                                    >
                                      <option value="">
                                        {!isRevealed && hasAssignment ? maskedName : 'Select Team'}
                                      </option>
                                      {!isRevealed && hasAssignment ? null : groupTeams[gameDetail.game.groupId]?.map((team) => {
                                        const alreadyUsed = usedTeams[participant.playerName]?.includes(team.id);
                                        return (
                                          <option
                                            key={team.id}
                                            value={team.id}
                                            disabled={alreadyUsed}
                                          >
                                            {team.name}{alreadyUsed ? ' (used)' : ''}
                                          </option>
                                        );
                                      })}
                                    </select>

                                    <button
                                      className="ah-btn-outline ah-btn-sm"
                                      onClick={() => {
                                        const newAssignments = { ...pickAssignments };
                                        delete newAssignments[participant.playerName];
                                        setPickAssignments(newAssignments);
                                      }}
                                      disabled={!hasAssignment}
                                      title="Clear team selection"
                                    >
                                      ✕
                                    </button>

                                    <button
                                      className="ah-btn-outline ah-btn-sm"
                                      onMouseDown={() => {
                                        const newSet = new Set(revealedPlayers);
                                        newSet.add(participant.playerName);
                                        setRevealedPlayers(newSet);
                                      }}
                                      onMouseUp={() => {
                                        const newSet = new Set(revealedPlayers);
                                        newSet.delete(participant.playerName);
                                        setRevealedPlayers(newSet);
                                      }}
                                      onMouseLeave={() => {
                                        const newSet = new Set(revealedPlayers);
                                        newSet.delete(participant.playerName);
                                        setRevealedPlayers(newSet);
                                      }}
                                      onTouchStart={() => {
                                        const newSet = new Set(revealedPlayers);
                                        newSet.add(participant.playerName);
                                        setRevealedPlayers(newSet);
                                      }}
                                      onTouchEnd={() => {
                                        const newSet = new Set(revealedPlayers);
                                        newSet.delete(participant.playerName);
                                        setRevealedPlayers(newSet);
                                      }}
                                      onTouchCancel={() => {
                                        const newSet = new Set(revealedPlayers);
                                        newSet.delete(participant.playerName);
                                        setRevealedPlayers(newSet);
                                      }}
                                    >
                                      👁️
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-4 flex gap-2">
                            <button
                              className="ah-btn-outline"
                              onClick={handleSavePicks}
                            >
                              Save Picks
                            </button>
                            {!picksFinalized && (
                              <button
                                className="ah-btn-primary"
                                onClick={handleFinalizePicks}
                              >
                                Finalize Picks
                              </button>
                            )}
                          </div>

                          {/* Results Entry - Team-based (only after finalize) */}
                          {picksFinalized && picks.length > 0 && (
                            <div className="mt-8">
                              <h4 className="ah-section-title">Enter Results (by Team)</h4>
                              <p className="ah-meta mb-4">
                                Click result for each team. All players who picked that team will get the same result.
                              </p>

                              <div className="ah-list gap-4">
                                {(() => {
                                  // Group picks by team
                                  const teamGroups: Record<string, Pick[]> = {};
                                  picks.forEach(pick => {
                                    const teamKey = pick.teamName || 'No team';
                                    if (!teamGroups[teamKey]) {
                                      teamGroups[teamKey] = [];
                                    }
                                    teamGroups[teamKey].push(pick);
                                  });

                                  return Object.entries(teamGroups).map(([teamName, teamPicks]) => {
                                    const setTeamResult = (result: string) => {
                                      const newResults = { ...pickResults };
                                      teamPicks.forEach(pick => {
                                        newResults[pick.id] = result;
                                      });
                                      setPickResults(newResults);
                                    };

                                    return (
                                      <div key={teamName} className="ah-card ah-flex-col gap-4">
                                        <div>
                                          <strong className="text-lg">{teamName}</strong>
                                          <p className="ah-meta">
                                            {teamPicks.map(p => p.playerName).join(', ')}
                                          </p>
                                        </div>
                                        <div className="ah-flex-wrap gap-2">
                                          <button
                                            className="flex-1 min-w-[100px] px-4 py-3 text-sm font-semibold border-2 rounded-md cursor-pointer uppercase"
                                            onClick={() => setTeamResult('win')}
                                          >
                                            Win
                                          </button>
                                          <button
                                            className="flex-1 min-w-[100px] px-4 py-3 text-sm font-semibold border-2 rounded-md cursor-pointer uppercase"
                                            onClick={() => setTeamResult('loss')}
                                          >
                                            Loss
                                          </button>
                                          <button
                                            className="flex-1 min-w-[100px] px-4 py-3 text-sm font-semibold border-2 rounded-md cursor-pointer uppercase"
                                            onClick={() => setTeamResult('draw')}
                                          >
                                            Draw
                                          </button>
                                          <button
                                            className="flex-1 min-w-[100px] px-4 py-3 text-sm font-semibold border-2 rounded-md cursor-pointer uppercase"
                                            onClick={() => setTeamResult('postponed')}
                                          >
                                            Postponed
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>

                              <div className="mt-4 flex gap-2 flex-wrap">
                                <button
                                  className="ah-btn-outline"
                                  onClick={handleSaveResults}
                                >
                                  Save Results
                                </button>
                                <button
                                  className="ah-btn-primary"
                                  onClick={handleCloseRound}
                                >
                                  Close Round
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Closed round - show results */}
                      {currentRound.status === 'closed' && (
                        <div>
                          <p className="ah-meta mb-4">
                            Round complete. Click "Next Round" to continue.
                          </p>
                          {picks.filter(p => p.result).length > 0 && (
                            <div className="ah-list gap-3">
                              {picks.filter(p => p.result).map((pick) => (
                                <div key={pick.id} className="ah-flex-between p-3 border rounded-md gap-4">
                                  <div>
                                    <strong>{pick.playerName}</strong>
                                    <p className="ah-meta">{pick.teamName || 'No team'}</p>
                                  </div>
                                  <span
                                    className="px-3 py-1 rounded-xl text-xs font-semibold uppercase"
                                  >
                                    {pick.result}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
    </div>
  );
};

export default GameDetailTab;
