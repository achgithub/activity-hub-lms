import React, { useState } from 'react';
import { Group, Player, Team, API_BASE } from '../types';

interface SetupTabProps {
  groups: Group[];
  players: Player[];
  onGroupsChange: () => void;
  onPlayersChange: () => void;
  collapsedCards: Record<string, boolean>;
  toggleCard: (cardName: string) => void;
}

const SetupTab: React.FC<SetupTabProps> = ({
  groups,
  players,
  onGroupsChange,
  onPlayersChange,
  collapsedCards,
  toggleCard,
}) => {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [groupTeams, setGroupTeams] = useState<Record<number, Team[]>>({});
  const [newGroupName, setNewGroupName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    message: string;
    onConfirm: () => void;
  }>({ show: false, message: '', onConfirm: () => {} });

  // Player CRUD handlers
  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newPlayerName }),
      });

      if (res.ok) {
        onPlayersChange();
        setNewPlayerName('');
      }
    } catch (err) {
      console.error('Failed to create player:', err);
    }
  };

  const handleDeletePlayer = async (playerId: number) => {
    setConfirmDialog({
      show: true,
      message: 'Delete this player?',
      onConfirm: async () => {
        setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const res = await fetch(`${API_BASE}/api/players/${playerId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok || res.status === 204) {
            onPlayersChange();
          }
        } catch (err) {
          console.error('Failed to delete player:', err);
        }
      },
    });
  };

  // Group CRUD handlers
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (res.ok) {
        onGroupsChange();
        setNewGroupName('');
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    setConfirmDialog({
      show: true,
      message: 'Delete this group? This will also delete all its teams.',
      onConfirm: async () => {
        setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const res = await fetch(`${API_BASE}/api/groups/${groupId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok || res.status === 204) {
            onGroupsChange();
            delete groupTeams[groupId];
            if (expandedGroup === groupId) {
              setExpandedGroup(null);
            }
          }
        } catch (err) {
          console.error('Failed to delete group:', err);
        }
      },
    });
  };

  const handleToggleGroup = async (groupId: number) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
      return;
    }

    setExpandedGroup(groupId);

    // Fetch teams if not already loaded
    if (!groupTeams[groupId]) {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/groups/${groupId}/teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setGroupTeams({ ...groupTeams, [groupId]: data.teams || [] });
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      }
    }
  };

  // Team CRUD handlers
  const handleCreateTeam = async (groupId: number) => {
    if (!newTeamName.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newTeamName }),
      });

      if (res.ok) {
        // Refresh teams for this group
        const teamsRes = await fetch(`${API_BASE}/api/groups/${groupId}/teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const teamsData = await teamsRes.json();
        setGroupTeams({ ...groupTeams, [groupId]: teamsData.teams || [] });
        setNewTeamName('');
        onGroupsChange();
      }
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const handleDeleteTeam = async (teamId: number, groupId: number) => {
    setConfirmDialog({
      show: true,
      message: 'Delete this team?',
      onConfirm: async () => {
        setConfirmDialog({ show: false, message: '', onConfirm: () => {} });
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const res = await fetch(`${API_BASE}/api/teams/${teamId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok || res.status === 204) {
            // Refresh teams for this group
            const teamsRes = await fetch(`${API_BASE}/api/groups/${groupId}/teams`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const teamsData = await teamsRes.json();
            setGroupTeams({ ...groupTeams, [groupId]: teamsData.teams || [] });
            onGroupsChange();
          }
        } catch (err) {
          console.error('Failed to delete team:', err);
        }
      },
    });
  };

  return (
    <div>
      {/* Player Pool Section */}
      <div className="ah-card ah-section">
        <div className="ah-section-header" onClick={() => toggleCard('players')}>
          <h3 className="ah-section-title">Player Pool ({players.length})</h3>
          <span className={`ah-section-toggle ${collapsedCards['players'] ? 'collapsed' : ''}`}>▼</span>
        </div>

        {!collapsedCards['players'] && (
          <>
            <div className="ah-inline-form">
              <input
                type="text"
                className="ah-input"
                placeholder="Player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreatePlayer()}
              />
              <button className="ah-btn-primary" onClick={handleCreatePlayer}>
                Add Player
              </button>
            </div>

            <div className="ah-list mt-4">
              {players.length === 0 && (
                <p className="ah-meta">No players yet. Add one to get started.</p>
              )}

              {players.map((player) => (
                <div key={player.id} className="ah-list-item">
                  <strong>{player.name}</strong>
                  <button
                    className="ah-btn-danger-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlayer(player.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Groups & Teams Section */}
      <div className="ah-card ah-section">
        <div className="ah-section-header" onClick={() => toggleCard('groups')}>
          <h3 className="ah-section-title">Groups & Teams ({groups.length})</h3>
          <span className={`ah-section-toggle ${collapsedCards['groups'] ? 'collapsed' : ''}`}>▼</span>
        </div>

        {!collapsedCards['groups'] && (
          <>
            <div className="ah-inline-form">
              <input
                type="text"
                className="ah-input"
                placeholder="New group name (e.g., Premier League 25/26)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
              <button className="ah-btn-primary" onClick={handleCreateGroup}>
                Create Group
              </button>
            </div>

            <div className="ah-list mt-4">
              {groups.length === 0 && (
                <p className="ah-meta">No groups yet. Create one to get started.</p>
              )}

              {groups.map((group) => (
                <div key={group.id} className="ah-card">
                  <div
                    className="ah-flex-between cursor-pointer"
                    onClick={() => handleToggleGroup(group.id)}
                  >
                    <div>
                      <strong>{group.name}</strong>
                      <p className="ah-meta">{group.teamCount} teams</p>
                    </div>
                    <button
                      className="ah-btn-danger-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {expandedGroup === group.id && (
                    <div className="ah-list mt-4 pt-4 border-t">
                      <div className="ah-inline-form">
                        <input
                          type="text"
                          className="ah-input"
                          placeholder="Team name"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === 'Enter' && handleCreateTeam(group.id)
                          }
                        />
                        <button
                          className="ah-btn-primary"
                          onClick={() => handleCreateTeam(group.id)}
                        >
                          Add Team
                        </button>
                      </div>

                      {groupTeams[group.id]?.map((team) => (
                        <div key={team.id} className="ah-flex-between p-2 rounded">
                          <strong>{team.name}</strong>
                          <button
                            className="ah-btn-danger-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeam(team.id, group.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}

                      {groupTeams[group.id]?.length === 0 && (
                        <p className="ah-meta">No teams yet. Add one above.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: () => {} })}
        >
          <div
            className="ah-card"
            style={{ maxWidth: '400px', margin: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="ah-section-title">Confirm Delete</h3>
            <p className="ah-meta mt-2">{confirmDialog.message}</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                className="ah-btn-outline"
                onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: () => {} })}
              >
                Cancel
              </button>
              <button className="ah-btn-danger" onClick={confirmDialog.onConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupTab;
