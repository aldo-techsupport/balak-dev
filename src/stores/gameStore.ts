import { create } from 'zustand';
import { getSocket } from '@/lib/socket';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';

export interface DominoTile {
  id: string;
  left: number;
  right: number;
}

export interface BoardPlacedTile {
  tile: DominoTile;
  placedLeft: number;
  placedRight: number;
  isDouble: boolean;
  end: 'LEFT' | 'RIGHT' | 'CENTER';
  turnNumber: number;
}

export interface GameWinnerResult {
  winnerId?: string;
  winnerNickname?: string;
  winningTeam?: 'TEAM_A' | 'TEAM_B';
  endReason: 'NORMAL_WIN' | 'DEADLOCK';
  pipsSummary: {
    userId: string;
    nickname: string;
    avatar: string;
    team: 'TEAM_A' | 'TEAM_B' | null;
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

export interface ClientGameState {
  board: BoardPlacedTile[];
  leftEnd: number | null;
  rightEnd: number | null;
  myHand: DominoTile[];
  opponentTileCounts: Record<string, number>;
  drawPileCount: number;
  currentTurnSeat: number;
  currentTurnUserId: string;
  turnDeadline: number;
  sequenceNumber: number;
  moveHistory: any[];
  winnerResult: GameWinnerResult | null;
  isFinished: boolean;
  playableTileIds: string[];
}

interface GameStoreState {
  gameState: ClientGameState | null;
  selectedTileId: string | null;
  needsSideSelection: boolean;
  isActionInProgress: boolean;
  errorMessage: string | null;

  setGameState: (state: ClientGameState | null) => void;
  selectTile: (tileId: string) => void;
  clearSelection: () => void;
  playTile: (roomCode: string, tileId: string, end: 'LEFT' | 'RIGHT') => void;
  passTurn: (roomCode: string) => void;
  initGameSocketListeners: (myUserId: string) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  selectedTileId: null,
  needsSideSelection: false,
  isActionInProgress: false,
  errorMessage: null,

  setGameState: (state) => set({ gameState: state }),

  clearSelection: () => set({ selectedTileId: null, needsSideSelection: false }),

  clearGame: () =>
    set({
      gameState: null,
      selectedTileId: null,
      needsSideSelection: false,
      isActionInProgress: false,
      errorMessage: null,
    }),

  selectTile: (tileId: string) => {
    const { gameState } = get();
    if (!gameState) return;

    const tile = gameState.myHand.find((t) => t.id === tileId);
    if (!tile) return;

    sound.playTileClick();

    // If board is empty, default placement is CENTER (represented as RIGHT)
    if (gameState.leftEnd === null || gameState.rightEnd === null || gameState.board.length === 0) {
      set({ selectedTileId: tileId, needsSideSelection: false });
      return;
    }

    const matchesLeft = tile.left === gameState.leftEnd || tile.right === gameState.leftEnd;
    const matchesRight = tile.left === gameState.rightEnd || tile.right === gameState.rightEnd;

    if (matchesLeft && matchesRight && gameState.leftEnd !== gameState.rightEnd) {
      // Tile can be placed on BOTH left and right ends -> prompt player to choose
      set({ selectedTileId: tileId, needsSideSelection: true });
    } else {
      // Can only be placed on one side or both ends have same number
      set({ selectedTileId: tileId, needsSideSelection: false });
    }
  },

  playTile: (roomCode: string, tileId: string, end: 'LEFT' | 'RIGHT') => {
    set({ isActionInProgress: true, errorMessage: null });
    const socket = getSocket();

    socket.emit('game:play', { roomCode, tileId, end }, (res: any) => {
      set({ isActionInProgress: false });
      if (res && res.success) {
        sound.playTilePlace();
        get().clearSelection();
      } else {
        const error = res?.error || 'Langkah tidak valid.';
        set({ errorMessage: error });
      }
    });
  },

  passTurn: (roomCode: string) => {
    set({ isActionInProgress: true, errorMessage: null });
    const socket = getSocket();

    socket.emit('game:pass', { roomCode }, (res: any) => {
      set({ isActionInProgress: false });
      if (res && res.success) {
        sound.playPass();
      } else {
        const error = res?.error || 'Tidak dapat lewat saat ini.';
        set({ errorMessage: error });
      }
    });
  },

  initGameSocketListeners: (myUserId: string) => {
    const socket = getSocket();

    socket.off('game:state');
    socket.off('game:move-rejected');
    socket.off('game:finished');

    socket.on('game:state', (newState: ClientGameState) => {
      const prevState = get().gameState;

      // Play alert chime if turn just switched to me
      if (newState.currentTurnUserId === myUserId && prevState?.currentTurnUserId !== myUserId) {
        sound.playTurnAlert();
      }

      // If board lengthened, someone placed a tile
      if (prevState && newState.board.length > prevState.board.length) {
        sound.playTilePlace();
      }

      set({ gameState: newState, isActionInProgress: false });
    });

    socket.on('game:move-rejected', (data: { error: string }) => {
      sound.playPass();
      set({ errorMessage: data.error, isActionInProgress: false });
    });

    socket.on('game:finished', (result: GameWinnerResult) => {
      const amIWinner = result.pipsSummary?.find((p) => p.userId === myUserId)?.isWinner;

      if (amIWinner) {
        sound.playVictory();
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {}
      } else {
        sound.playDefeat();
      }

      set((state) => ({
        gameState: state.gameState ? { ...state.gameState, winnerResult: result, isFinished: true } : null,
      }));
    });
  },
}));
