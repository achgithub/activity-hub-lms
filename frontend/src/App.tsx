import { useState, useEffect } from 'react';
import { useActivityHubContext } from 'activity-hub-sdk';
// import SetupTab from './components/SetupTab';
// import GamesListTab from './components/GamesListTab';
// import GameDetailTab from './components/GameDetailTab';
// import ReportsTab from './components/ReportsTab';
import { Game, Group, Player, /*Team,*/ API_BASE } from './types';

// Tab order defines privilege hierarchy (left = more privileges)
const TAB_ORDER = ['setup', 'games', 'reports'] as const;
type TabName = typeof TAB_ORDER[number];

function App() {
  const { user, roles } = useActivityHubContext();
  // const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  // Get accessible tabs based on user roles
  // Tab hierarchy: setup (left) → games (middle) → reports (right)
  // lms-manager:setup grants access to all tabs
  // lms-manager:games grants access to games + reports
  // lms-manager:reports grants access to reports only (default role)
  const accessibleTabs = roles.getAccessibleTabs([...TAB_ORDER]);

  const [activeTab, setActiveTab] = useState<TabName>('reports');

  // Shared state
  const [groups, setGroups] = useState<Group[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  // const [groupTeams, setGroupTeams] = useState<Record<number, Team[]>>({});
  // const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // const toggleCard = (cardName: string) => {
  //   setCollapsedCards({
  //     ...collapsedCards,
  //     [cardName]: !collapsedCards[cardName],
  //   });
  // };

  // Debug logging
  useEffect(() => {
    console.log('LMS App State:', {
      user,
      rolesAll: roles.all,
      accessibleTabs,
      activeTab,
      groups: groups.length,
      players: players.length,
      games: games.length,
      groupsIsArray: Array.isArray(groups),
      playersIsArray: Array.isArray(players),
      gamesIsArray: Array.isArray(games),
    });
  }, [user, roles, accessibleTabs, activeTab, groups, players, games]);

  // Update active tab when accessible tabs change
  useEffect(() => {
    if (accessibleTabs.length > 0 && !accessibleTabs.includes(activeTab)) {
      setActiveTab(accessibleTabs[0] as TabName);
    }
  }, [accessibleTabs, activeTab]);

  // SDK loading check - wait for user email to be populated
  if (!user || !user.email) {
    return (
      <div className="ah-container ah-container--narrow" style={{ marginTop: '2rem' }}>
        <div className="ah-card">
          <div className="ah-flex-center-justify" style={{ padding: '2rem' }}>
            <p className="ah-meta">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check authentication
  if (user.isGuest) {
    return (
      <div className="ah-container ah-container--narrow" style={{ marginTop: '2rem' }}>
        <div className="ah-card">
          <h2 style={{ marginBottom: '1rem' }}>🎯 LMS Manager</h2>
          <p className="ah-meta">
            Authentication required. Please access this app through Activity Hub.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has any LMS role
  if (accessibleTabs.length === 0) {
    return (
      <div className="ah-container ah-container--narrow" style={{ marginTop: '2rem' }}>
        <div className="ah-card">
          <h2 style={{ marginBottom: '1rem' }}>🎯 LMS Manager</h2>
          <p className="ah-meta">
            You don't have permission to access Last Man Standing.
          </p>
          <p className="ah-meta">
            Contact an administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  // Fetch initial data (groups, players)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Fetch groups
        const groupsRes = await fetch(`${API_BASE}/api/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setGroups(Array.isArray(groupsData.groups) ? groupsData.groups : []);
        } else {
          console.error('Failed to fetch groups:', groupsRes.status);
        }

        // Fetch players
        const playersRes = await fetch(`${API_BASE}/api/players`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          setPlayers(Array.isArray(playersData.players) ? playersData.players : []);
        } else {
          console.error('Failed to fetch players:', playersRes.status);
        }

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
        if (res.ok) {
          const data = await res.json();
          setGames(Array.isArray(data.games) ? data.games : []);
        } else {
          console.error('Failed to fetch games:', res.status);
        }
      } catch (err) {
        console.error('Failed to fetch games:', err);
      }
    };

    fetchGames();
  }, [activeTab]);

  // Reload data helpers (commented out for debugging)
  // const reloadGroups = async () => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     if (!token) return;
  //     const res = await fetch(`${API_BASE}/api/groups`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setGroups(Array.isArray(data.groups) ? data.groups : []);
  //     }
  //   } catch (err) {
  //     console.error('Failed to reload groups:', err);
  //   }
  // };

  // const reloadPlayers = async () => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     if (!token) return;
  //     const res = await fetch(`${API_BASE}/api/players`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setPlayers(Array.isArray(data.players) ? data.players : []);
  //     }
  //   } catch (err) {
  //     console.error('Failed to reload players:', err);
  //   }
  // };

  // const reloadGames = async () => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     if (!token) return;
  //     const res = await fetch(`${API_BASE}/api/games`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setGames(Array.isArray(data.games) ? data.games : []);
  //     }
  //   } catch (err) {
  //     console.error('Failed to reload games:', err);
  //   }
  // };

  if (loading) {
    return (
      <div className="ah-container ah-container--narrow" style={{ marginTop: '2rem' }}>
        <div className="ah-card">
          <div className="ah-flex-center-justify" style={{ padding: '2rem' }}>
            <p className="ah-meta">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('About to render LMS with activeTab:', activeTab);

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
          <div className="ah-card">
            <h3>Active Tab: {activeTab}</h3>
            <p>Groups: {groups.length} items</p>
            <p>Players: {players.length} items</p>
            <p>Games: {games.length} items</p>
            <p>Tab components temporarily disabled for debugging</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
