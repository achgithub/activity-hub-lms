// LMS Manager Shared Types

export interface Group {
  id: number;
  managerEmail: string;
  name: string;
  teamCount: number;
  createdAt: string;
}

export interface Team {
  id: number;
  groupId: number;
  name: string;
  createdAt: string;
}

export interface Player {
  id: number;
  managerEmail: string;
  name: string;
  createdAt: string;
}

export interface Game {
  id: number;
  managerEmail: string;
  name: string;
  groupId: number;
  status: string;
  winnerName?: string;
  postponeAsWin: boolean;
  winnerMode: string; // 'single', 'multiple'
  rolloverMode: string; // 'round', 'game'
  maxWinners: number;
  createdAt: string;
  groupName: string;
  participantCount: number;
  currentRound: number;
}

export interface Participant {
  id: number;
  gameId: number;
  playerName: string;
  isActive: boolean;
  eliminatedInRound?: number;
  createdAt: string;
}

export interface Round {
  id: number;
  gameId: number;
  roundNumber: number;
  status: string;
  createdAt: string;
}

export interface Pick {
  id: number;
  gameId: number;
  roundId: number;
  playerName: string;
  teamId?: number;
  teamName?: string;
  result?: string;
  autoAssigned: boolean;
  createdAt: string;
}

export interface GameDetail {
  game: Game;
  participants: Participant[];
  rounds: Round[];
}

// Activity Hub proxy path for LMS Manager
export const API_BASE = '/api/apps/lms/proxy';
