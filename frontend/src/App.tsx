import { useState, useEffect } from 'react';
import { GameCard, useActivityHubContext } from 'activity-hub-sdk';
import SetupTab from './components/SetupTab';
import GamesListTab from './components/GamesListTab';
import GameDetailTab from './components/GameDetailTab';
import ReportsTab from './components/ReportsTab';
import { Game, Group, Player, Team, API_BASE } from './types';

// Tab order defines privilege hierarchy (left = more privileges)
const TAB_ORDER = ['setup', 'games', 'reports'] as const;
type TabName = typeof TAB_ORDER[number];

function App() {
  const { user, roles } = useActivityHubContext();
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  // Get accessible tabs based on user roles
  // Tab hierarchy: setup (left) → games (middle) → reports (right)
  // lms-manager:setup grants access to all tabs
  // lms-manager:games grants access to games + reports
  // lms-manager:reports grants access to reports only (default role)
  const accessibleTabs = roles.getAccessibleTabs([...TAB_ORDER]);

  const [activeTab, setActiveTab] = useState<TabName>('reports');

  // Update active tab when accessible tabs change
  useEffect(() => {
    if (accessibleTabs.length > 0 && !accessibleTabs.includes(activeTab)) {
      setActiveTab(accessibleTabs[0] as TabName);
    }
  }, [accessibleTabs, activeTab]);

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

  // SDK loading check - wait for user email to be populated
  if (!user || !user.email) {
    return (
      <GameCard size="narrow">
        <div className="ah-flex-center-justify ah-py-4">
          <div className="ah-spinner"></div>
          <p className="ah-ml-2">Loading...</p>
        </div>
      </GameCard>
    );
  }

  // Check authentication
  if (user.isGuest) {
    return (
      <GameCard size="narrow">
        <h2 className="ah-card-title">🎯 LMS Manager</h2>
        <p className="ah-meta">
          Authentication required. Please access this app through Activity Hub.
        </p>
      </GameCard>
    );
  }

  // Check if user has any LMS role
  if (accessibleTabs.length === 0) {
    return (
      <GameCard size="narrow">
        <h2 className="ah-card-title">🎯 LMS Manager</h2>
        <p className="ah-meta">
          You don't have permission to access Last Man Standing.
        </p>
        <p className="ah-meta">
          Contact an administrator to request access.
        </p>
      </GameCard>
    );
  }

  // Fetch initial data (groups, players)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

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
  }, []);

  // Fetch games when Games or Reports tab is active
  useEffect(() => {
    if (activeTab !== 'games' && activeTab !== 'reports') return;

    const fetchGames = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

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
  }, [activeTab]);

  // Reload data helpers
  const reloadGroups = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setGroups(data.groups || []);
  };

  const reloadPlayers = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/players`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setPlayers(data.players || []);
  };

  const reloadGames = async () => {
    const token = localStorage.getItem('token');
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
    <div style={{ width: '100%', maxWidth: '64rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="ah-card" style={{ height: 'calc(100vh - 10rem)', minHeight: '600px', maxHeight: '900px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '0 0 auto', padding: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#000' }}>Manage Last Man Standing Competitions</h2>

          {/* Tabs - Only show accessible tabs based on role hierarchy */}
          <div className="ah-tabs">
            {accessibleTabs.includes('setup') && (
              <button
                className={`ah-tab ${activeTab === 'setup' ? 'active' : ''}`}
                onClick={() => setActiveTab('setup')}
              >
                Setup
              </button>
            )}
            {accessibleTabs.includes('games') && (
              <button
                className={`ah-tab ${activeTab === 'games' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('games');
                  setSelectedGameId(null);
                }}
              >
                Games
              </button>
            )}
            {accessibleTabs.includes('reports') && (
              <button
                className={`ah-tab ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                Reports
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: '1 1 auto', overflow: 'auto', padding: '1rem' }}>
          {/* Setup Tab */}
        {activeTab === 'setup' && (
          <SetupTab
            groups={groups}
            players={players}
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
            <ReportsTab games={games} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
