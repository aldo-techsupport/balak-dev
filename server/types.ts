export type GameMode = 'SOLO' | 'TEAM_BATTLE';
export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';
export type Team = 'TEAM_A' | 'TEAM_B';

export interface DominoTile {
  id: string; // e.g. "6-6", "0-3"
  left: number; // 0-6
  right: number; // 0-6
}

export interface BoardPlacedTile {
  tile: DominoTile;
  placedLeft: number;
  placedRight: number;
  isDouble: boolean;
  end: 'LEFT' | 'RIGHT' | 'CENTER';
  turnNumber: number;
}

export interface PlayerSlot {
  userId: string;
  username: string;
  nickname: string;
  avatar: string;
  seatIndex: number; // 0..3
  team: Team | null; // For TEAM_BATTLE: seats 0,2 = TEAM_A, seats 1,3 = TEAM_B
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  socketId: string | null;
  disconnectedAt: number | null;
}

export interface GameMoveRecord {
  userId: string;
  nickname: string;
  action: 'PLAY' | 'PASS' | 'DRAW';
  tile?: DominoTile;
  end?: 'LEFT' | 'RIGHT';
  timestamp: number;
}

export interface GameWinnerResult {
  winnerId?: string;
  winnerNickname?: string;
  winningTeam?: Team;
  endReason: 'NORMAL_WIN' | 'DEADLOCK';
  pipsSummary: {
    userId: string;
    nickname: string;
    avatar: string;
    team: Team | null;
    seatIndex: number;
    pips: number;
    tiles: DominoTile[];
    isWinner: boolean;
  }[];
  teamScores?: {
    teamA: number;
    teamB: number;
  };
}

export interface AuthoritativeGameState {
  board: BoardPlacedTile[];
  leftEnd: number | null;
  rightEnd: number | null;
  hands: Record<string, DominoTile[]>; // Map<userId, DominoTile[]>
  drawPile: DominoTile[];
  currentTurnSeat: number;
  currentTurnUserId: string;
  turnDeadline: number; // Timestamp when turn expires
  sequenceNumber: number; // Increment on every state change
  consecutivePasses: number;
  moveHistory: GameMoveRecord[];
  winnerResult: GameWinnerResult | null;
  isFinished: boolean;
}

export interface SanitizedGameState {
  board: BoardPlacedTile[];
  leftEnd: number | null;
  rightEnd: number | null;
  myHand: DominoTile[]; // Only tiles for this specific recipient
  opponentTileCounts: Record<string, number>; // Map<userId, count>
  drawPileCount: number;
  currentTurnSeat: number;
  currentTurnUserId: string;
  turnDeadline: number;
  sequenceNumber: number;
  moveHistory: GameMoveRecord[];
  winnerResult: GameWinnerResult | null;
  isFinished: boolean;
  playableTileIds: string[]; // Helper for client: tile IDs that can legally be played
}

export interface RoomData {
  code: string;
  name: string;
  mode: GameMode;
  isPublic: boolean;
  maxPlayers: number;
  hostId: string;
  turnTimeout: number; // e.g. 20s
  status: RoomStatus;
  players: PlayerSlot[];
  game: AuthoritativeGameState | null;
  createdAt: number;
  lastActiveAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  text: string;
  isEmote?: boolean;
  timestamp: number;
}
