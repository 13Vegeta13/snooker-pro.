import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  roles: {
    admin: boolean;
    scorer: boolean;
    viewer: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  linkedPlayerId?: string; // ✅ ajouté une seule fois
}

export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  hand?: 'L' | 'R' | null;
  club?: string | null;
  stats: PlayerStats;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  userId?: string; // ✅ ajouté une seule fois
}

export interface PlayerStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  framesWon: number;
  framesLost: number;
  highestBreak: number;
  breaks50plus: number;
  breaks100plus: number;
  avgPointsPerFrame: number;
  elo: number;
}

export type Ball = 'R' | 'Y' | 'G' | 'Br' | 'Bl' | 'P' | 'Bk';

export interface Match {
  id: string;
  status: 'scheduled' | 'live' | 'completed' | 'abandoned';
  format: {
    setsEnabled: boolean;
    bestOfSets: number;
    framesPerSet: number;
  };
  players: MatchPlayer[];
  current: MatchState;
  score: MatchScore;
  history: MatchEvent[];
  venue?: string;
  referee?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface MatchPlayer {
  playerId: string;
  name: string;
  seed?: number;
}

export interface MatchState {
  activePlayerId: string;
  setNumber: number;
  frameNumber: number;
  breakPoints: number;
  redsRemaining: number;
  colorsPhase: boolean;
  colorsOrderIndex?: number;
  pointsOnTable: number;
  freeballActive?: boolean;
  snookersRequired?: boolean;
  lastBallPottedInBreak?: Ball;
}

export interface MatchScore {
  frames: FrameScore[];
  sets: SetScore[];
  match: {
    p1Sets: number;
    p2Sets: number;
    winnerPlayerId?: string;
  };
}

export interface FrameScore {
  setNo: number;
  frameNo: number;
  p1Points: number;
  p2Points: number;
  winnerPlayerId?: string;
  highestBreak?: number;
  decidedOnBlack?: boolean;
}

export interface SetScore {
  setNo: number;
  p1Frames: number;
  p2Frames: number;
  winnerPlayerId?: string;
}

export interface MatchEvent {
  id: string;
  timestamp: Timestamp;
  playerId: string;
  action:
    | 'pot'
    | 'foul'
    | 'freeBallPot'
    | 'miss'
    | 'endTurn'
    | 'reRack'
    | 'concede'
    | 'endFrame'
    | 'endMatch';
  ball?: Ball;
  pointsDelta: number;
  note?: string;
  stateSnapshot?: Partial<MatchState>;
}

export interface Leaderboard {
  id: string;
  seasonName: string;
  period: {
    from: Timestamp;
    to: Timestamp;
  };
  monthly?: Record<string, LeaderboardAggregates>;
  aggregates: LeaderboardAggregates;
  updatedAt: Timestamp;
}

export interface LeaderboardAggregates {
  byPlayer: Record<string, PlayerStats & { name: string; playerId: string }>;
}

export type UserRole = 'admin' | 'scorer' | 'viewer';

export interface MatchEventData {
  action: MatchEvent['action'];
  ball?: Ball;
  note?: string;
}
