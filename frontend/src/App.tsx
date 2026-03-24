import { useState, useEffect, useMemo } from 'react';
import { GameCard } from 'activity-hub-sdk';
import SetupTab from './components/SetupTab';
import GamesListTab from './components/GamesListTab';
import GameDetailTab from './components/GameDetailTab';
import ReportsTab from './components/ReportsTab';
import { Game, Group, Player, Team, API_BASE } from './types';

// Parse query params from URL
function useQueryParams() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      userId: params.get('userId'),
      token: params.get('token'),
    };
  }, []);
}

function App() {
  const { userId, token } = useQueryParams();
  const [activeTab, setActiveTab] = useState<'setup' | 'games' | 'reports'>('games');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  // Shared state
  const [groups, setGroups] = useState<Group[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [groupTeams, setGroupTeams] = useState<Record<number, Team[]>>({});
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const toggleCard = (cardName: string) => {
    setCollapsedCards({
      ...collapsedCards,
      [cardName]: !collapsedCards[cardName],
    });
  };

  // Must have userId and token
  if (!userId || !token) {
    return (
      <GameCard size="narrow">
        <h2 className="ah-card-title">🎯 LMS Manager</h2>
        <p className="ah-meta">
          Missing authentication. Please access this app through the Activity Hub.
        </p>
      </GameCard>
    );
  }

  // Fetch initial data (groups, players)
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        // Fetch groups
        const groupsRes = await fetch(`${API_BASE}/api/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const groupsData = await groupsRes.json();
        setGroups(groupsData.groups || []);

        // Fetch players
        const playersRes = await fetch(`${API_BASE}/api/players`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const playersData = await playersRes.json();
        setPlayers(playersData.players || []);

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Fetch games when Games or Reports tab is active
  useEffect(() => {
    if (!token || (activeTab !== 'games' && activeTab !== 'reports')) return;

    const fetchGames = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/games`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setGames(data.games || []);
      } catch (err) {
        console.error('Failed to fetch games:', err);
      }
    };

    fetchGames();
  }, [token, activeTab]);

  // Reload data helpers
  const reloadGroups = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setGroups(data.groups || []);
  };

  const reloadPlayers = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/players`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setPlayers(data.players || []);
  };

  const reloadGames = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/games`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setGames(data.games || []);
  };

  if (loading) {
    return (
      <GameCard size="narrow">
        <div className="ah-flex-center-justify ah-py-4">
          <div className="ah-spinner"></div>
          <p className="ah-ml-2">Loading...</p>
        </div>
      </GameCard>
    );
  }

  return (
    <div className="ah-container ah-py-4" style={{ maxWidth: '64rem', margin: '0 auto' }}>
      <div className="ah-card" style={{ height: 'calc(100vh - 12rem)', minHeight: '600px', overflow: 'auto' }}>
        <h1 className="ah-card-title">🎯 LMS Manager</h1>
        <p className="ah-meta ah-mb-3">Manage Last Man Standing competitions</p>

        {/* Tabs */}
        <div className="ah-tabs">
          <button
            className={`ah-tab ${activeTab === 'setup' ? 'active' : ''}`}
            onClick={() => setActiveTab('setup')}
          >
            Setup
          </button>
          <button
            className={`ah-tab ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('games');
              setSelectedGameId(null);
            }}
          >
            Games
          </button>
          <button
            className={`ah-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        </div>

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <SetupTab
            groups={groups}
            players={players}
            token={token}
            onGroupsChange={reloadGroups}
            onPlayersChange={reloadPlayers}
            collapsedCards={collapsedCards}
            toggleCard={toggleCard}
          />
        )}

        {/* Games List Tab */}
        {activeTab === 'games' && !selectedGameId && (
          <GamesListTab
            games={games}
            groups={groups}
            players={players}
            token={token}
            onSelectGame={setSelectedGameId}
            onGamesChange={reloadGames}
            collapsedCards={collapsedCards}
            toggleCard={toggleCard}
          />
        )}

        {/* Game Detail Tab */}
        {activeTab === 'games' && selectedGameId && (
          <GameDetailTab
            gameId={selectedGameId}
            token={token}
            onBack={() => {
              setSelectedGameId(null);
              reloadGames();
            }}
            groupTeams={groupTeams}
            setGroupTeams={setGroupTeams}
            collapsedCards={collapsedCards}
            toggleCard={toggleCard}
            players={players}
            onGamesChange={reloadGames}
          />
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsTab games={games} token={token} />
        )}
      </div>
    </div>
  );
}

export default App;
