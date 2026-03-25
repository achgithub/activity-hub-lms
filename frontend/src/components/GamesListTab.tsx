import React, { useState } from 'react';
import { Game, Group, Player, API_BASE } from '../types';

interface GamesListTabProps {
  games: Game[];
  groups: Group[];
  players: Player[];
  onSelectGame: (gameId: number) => void;
  onGamesChange: () => void;
  collapsedCards: Record<string, boolean>;
  toggleCard: (cardName: string) => void;
}

const GamesListTab: React.FC<GamesListTabProps> = ({
  games,
  groups,
  players,
  onSelectGame,
  onGamesChange,
  collapsedCards,
  toggleCard,
}) => {
  const [newGameName, setNewGameName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0);
  const [selectedPlayerNames, setSelectedPlayerNames] = useState<string[]>([]);
  const [postponeAsWin, setPostponeAsWin] = useState<boolean>(true);
  const [winnerMode, setWinnerMode] = useState<string>('single');
  const [rolloverMode, setRolloverMode] = useState<string>('round');
  const [maxWinners, setMaxWinners] = useState<number>(4);
  const [gameCreationPlayerSearch, setGameCreationPlayerSearch] = useState<string>('');
  const [showSelectedPlayersOnly, setShowSelectedPlayersOnly] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<{
    gameName?: string;
    group?: string;
    players?: string;
  }>({});

  const handleTogglePlayerSelection = (playerName: string) => {
    if (selectedPlayerNames.includes(playerName)) {
      setSelectedPlayerNames(selectedPlayerNames.filter((n) => n !== playerName));
    } else {
      setSelectedPlayerNames([...selectedPlayerNames, playerName]);
      if (validationErrors.players) {
        setValidationErrors({ ...validationErrors, players: undefined });
      }
    }
  };

  const handleSelectAll = () => {
    setSelectedPlayerNames(players.map((p) => p.name));
    if (validationErrors.players) {
      setValidationErrors({ ...validationErrors, players: undefined });
    }
  };

  const handleDeselectAll = () => {
    setSelectedPlayerNames([]);
  };

  const handleCreateGame = async () => {
    const errors: { gameName?: string; group?: string; players?: string } = {};

    if (!newGameName.trim()) {
      errors.gameName = 'Please enter a game name';
    }

    if (selectedGroupId === 0) {
      errors.group = 'Please select a group';
    }

    if (selectedPlayerNames.length === 0) {
      errors.players = 'Please select at least one player';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Scroll to the first error
      setTimeout(() => {
        const firstErrorElement = document.querySelector('.validation-error-field');
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setValidationErrors({});

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGameName,
          groupId: selectedGroupId,
          playerNames: selectedPlayerNames,
          postponeAsWin: postponeAsWin,
          winnerMode: winnerMode,
          rolloverMode: rolloverMode,
          maxWinners: maxWinners,
        }),
      });

      if (res.ok) {
        onGamesChange();
        // Reset form
        setNewGameName('');
        setSelectedGroupId(0);
        setSelectedPlayerNames([]);
        setPostponeAsWin(true);
        setWinnerMode('single');
        setRolloverMode('round');
        setMaxWinners(4);
      } else {
        const error = await res.text();
        alert(`Failed to create game: ${error}`);
      }
    } catch (err) {
      console.error('Failed to create game:', err);
      alert('Failed to create game');
    }
  };

  return (
    <div>
      {/* Games List Section */}
      <div className="ah-card ah-section">
        <div className="ah-section-header" onClick={() => toggleCard('activeGames')}>
          <h3 className="ah-section-title">Active Games ({games.length})</h3>
          <span className={`ah-section-toggle ${collapsedCards['activeGames'] ? 'collapsed' : ''}`}>▼</span>
        </div>

        {!collapsedCards['activeGames'] && (
          <>
            {games.length === 0 && (
              <p className="ah-meta">No games yet. Create one below to get started.</p>
            )}

            <div className="ah-list gap-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="ah-card cursor-pointer p-5"
                  onClick={() => onSelectGame(game.id)}
                >
                  <div className="ah-flex-between items-start">
                    <div>
                      <strong>{game.name}</strong>
                      <p className="ah-meta">
                        {game.groupName} • {game.participantCount} players • Round{' '}
                        {game.currentRound}
                      </p>
                    </div>
                    <span
                      className={`ah-status ${
                        game.status === 'active' ? 'ah-status--active' : 'ah-status--complete'
                      }`}
                    >
                      {game.status}
                    </span>
                  </div>
                  {game.status === 'completed' && game.winnerName && (
                    <p className="ah-meta">Winner: {game.winnerName}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Game Section */}
      <div className="ah-card ah-section">
        <div className="ah-section-header" onClick={() => toggleCard('createGame')}>
          <h3 className="ah-section-title">Create New Game</h3>
          <span className={`ah-section-toggle ${collapsedCards['createGame'] ? 'collapsed' : ''}`}>▼</span>
        </div>

        {!collapsedCards['createGame'] && (
          <>
            {groups.length === 0 && (
              <p className="ah-meta">
                No groups available. Please create a group in the Setup tab first.
              </p>
            )}

            {players.length === 0 && (
              <p className="ah-meta">
                No players available. Please add players in the Setup tab first.
              </p>
            )}

            {groups.length > 0 && players.length > 0 && (
              <div>
                <div className="ah-inline-form">
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      className={`ah-input ${validationErrors.gameName ? 'validation-error-field' : ''}`}
                      placeholder="Game name (e.g., Spring 2026 LMS)"
                      value={newGameName}
                      onChange={(e) => {
                        setNewGameName(e.target.value);
                        if (validationErrors.gameName) {
                          setValidationErrors({ ...validationErrors, gameName: undefined });
                        }
                      }}
                      style={{
                        borderColor: validationErrors.gameName ? '#ef4444' : undefined,
                        borderWidth: validationErrors.gameName ? '2px' : undefined,
                      }}
                    />
                    {validationErrors.gameName && (
                      <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {validationErrors.gameName}
                      </p>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <select
                      className={`ah-select ${validationErrors.group ? 'validation-error-field' : ''}`}
                      value={selectedGroupId}
                      onChange={(e) => {
                        setSelectedGroupId(Number(e.target.value));
                        if (validationErrors.group) {
                          setValidationErrors({ ...validationErrors, group: undefined });
                        }
                      }}
                      style={{
                        borderColor: validationErrors.group ? '#ef4444' : undefined,
                        borderWidth: validationErrors.group ? '2px' : undefined,
                      }}
                    >
                      <option value={0}>Select Group</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.teamCount} teams)
                        </option>
                      ))}
                    </select>
                    {validationErrors.group && (
                      <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {validationErrors.group}
                      </p>
                    )}
                  </div>
                </div>

                <div className={`mt-4 ${validationErrors.players ? 'validation-error-field' : ''}`}>
                  <div className="ah-flex-between mb-2">
                    <p className="ah-meta">
                      Select Players ({selectedPlayerNames.length} selected):
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button className="ah-btn-outline ah-btn-sm" onClick={handleSelectAll}>
                        Select All
                      </button>
                      <button className="ah-btn-outline ah-btn-sm" onClick={handleDeselectAll}>
                        Deselect All
                      </button>
                    </div>
                  </div>
                  {validationErrors.players && (
                    <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      {validationErrors.players}
                    </p>
                  )}

                  {/* Player filters */}
                  <div className="ah-filter-box mb-3">
                    <div className="flex gap-3 items-center flex-wrap">
                      <input
                        type="text"
                        placeholder="Search players by name..."
                        value={gameCreationPlayerSearch}
                        onChange={(e) => setGameCreationPlayerSearch(e.target.value)}
                        className="ah-input flex-1"
                      />
                      <label className="flex items-center gap-2 whitespace-nowrap text-sm">
                        <input
                          type="checkbox"
                          checked={showSelectedPlayersOnly}
                          onChange={(e) => setShowSelectedPlayersOnly(e.target.checked)}
                        />
                        <span>Selected only</span>
                      </label>
                    </div>
                  </div>

                  <div className="ah-player-grid">
                    {players.filter((player) => {
                      // Text search filter
                      const matchesSearch = !gameCreationPlayerSearch ||
                        player.name.toLowerCase().includes(gameCreationPlayerSearch.toLowerCase());

                      // Selected filter
                      const matchesSelected = !showSelectedPlayersOnly ||
                        selectedPlayerNames.includes(player.name);

                      return matchesSearch && matchesSelected;
                    }).map((player) => (
                      <label key={player.id} className="ah-player-grid-item">
                        <input
                          type="checkbox"
                          checked={selectedPlayerNames.includes(player.name)}
                          onChange={() => handleTogglePlayerSelection(player.name)}
                        />
                        <span>{player.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="ah-flex-center gap-2 p-3 border rounded-md cursor-pointer">
                    <input
                      type="checkbox"
                      checked={postponeAsWin}
                      onChange={(e) => setPostponeAsWin(e.target.checked)}
                    />
                    <span>Postponed matches count as WIN (uncheck for LOSS)</span>
                  </label>
                </div>

                <div className="mt-4">
                  <strong>Winner Mode:</strong>
                  <div className="mt-2 ml-4">
                    <label className="block mb-1">
                      <input
                        type="radio"
                        name="winnerMode"
                        value="single"
                        checked={winnerMode === 'single'}
                        onChange={(e) => setWinnerMode(e.target.value)}
                      />
                      <span className="ml-2">1 winner only (default)</span>
                    </label>
                    <label className="block">
                      <input
                        type="radio"
                        name="winnerMode"
                        value="multiple"
                        checked={winnerMode === 'multiple'}
                        onChange={(e) => setWinnerMode(e.target.value)}
                      />
                      <span className="ml-2">Multiple winners allowed</span>
                    </label>
                  </div>
                </div>

                {winnerMode === 'multiple' && (
                  <div className="mt-2 ml-4">
                    <label>
                      <strong>Max Winners:</strong>{' '}
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={maxWinners}
                        onChange={(e) => setMaxWinners(parseInt(e.target.value) || 4)}
                        className="ah-input w-20 ml-2"
                      />
                    </label>
                  </div>
                )}

                <div className="mt-4">
                  <strong>Rollover Mode:</strong>
                  <div className="mt-2 ml-4">
                    <label className="block mb-1">
                      <input
                        type="radio"
                        name="rolloverMode"
                        value="round"
                        checked={rolloverMode === 'round'}
                        onChange={(e) => setRolloverMode(e.target.value)}
                      />
                      <span className="ml-2">Rollover round (default)</span>
                    </label>
                    <label className="block">
                      <input
                        type="radio"
                        name="rolloverMode"
                        value="game"
                        checked={rolloverMode === 'game'}
                        onChange={(e) => setRolloverMode(e.target.value)}
                      />
                      <span className="ml-2">Rollover game</span>
                    </label>
                  </div>
                </div>

                <button
                  className="ah-btn-primary mt-4"
                  onClick={handleCreateGame}
                >
                  Create Game
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GamesListTab;
