import { DominoTile, BoardPlacedTile, Team } from '../types';

/**
 * Generate standard set of 28 double-six dominoes
 */
export function generateDominoSet(): DominoTile[] {
  const tiles: DominoTile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({
        id: `${i}-${j}`,
        left: i,
        right: j,
      });
    }
  }
  return tiles;
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleTiles(tiles: DominoTile[]): DominoTile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal tiles: 7 tiles per player. Remaining tiles go to draw pile.
 */
export function dealHands(
  playerIds: string[]
): { hands: Record<string, DominoTile[]>; drawPile: DominoTile[] } {
  const fullSet = shuffleTiles(generateDominoSet());
  const hands: Record<string, DominoTile[]> = {};
  const tilesPerPlayer = 7;

  playerIds.forEach((id, index) => {
    const start = index * tilesPerPlayer;
    hands[id] = fullSet.slice(start, start + tilesPerPlayer);
  });

  const dealtCount = playerIds.length * tilesPerPlayer;
  const drawPile = fullSet.slice(dealtCount);

  return { hands, drawPile };
}

/**
 * Find the player who should move first:
 * Priority 1: Highest balak (double), from 6-6 down to 0-0.
 * Priority 2: If no doubles held by anyone, highest pip sum tile.
 */
export function findStartingPlayer(
  playerIds: string[],
  hands: Record<string, DominoTile[]>
): { startingUserId: string; requiredInitialTile?: DominoTile } {
  // Check doubles from 6 down to 0
  for (let val = 6; val >= 0; val--) {
    const doubleId = `${val}-${val}`;
    for (const userId of playerIds) {
      const tile = hands[userId]?.find((t) => t.id === doubleId);
      if (tile) {
        return { startingUserId: userId, requiredInitialTile: tile };
      }
    }
  }

  // Fallback: highest single tile by pip sum
  let highestScore = -1;
  let startingUserId = playerIds[0];
  let bestTile: DominoTile | undefined;

  for (const userId of playerIds) {
    const hand = hands[userId] || [];
    for (const t of hand) {
      const score = t.left + t.right;
      if (score > highestScore) {
        highestScore = score;
        startingUserId = userId;
        bestTile = t;
      }
    }
  }

  return { startingUserId, requiredInitialTile: bestTile };
}

/**
 * Calculate pip sum for a tile
 */
export function getTilePips(tile: DominoTile): number {
  return tile.left + tile.right;
}

/**
 * Calculate total pips for a player's hand
 */
export function getHandPips(hand: DominoTile[]): number {
  return hand.reduce((sum, tile) => sum + getTilePips(tile), 0);
}

/**
 * Get IDs of playable tiles for a given hand and board state
 */
export function getPlayableTileIds(
  hand: DominoTile[],
  leftEnd: number | null,
  rightEnd: number | null
): string[] {
  // If board is empty, any tile in hand can be played
  if (leftEnd === null || rightEnd === null) {
    return hand.map((t) => t.id);
  }

  return hand
    .filter((tile) => {
      return (
        tile.left === leftEnd ||
        tile.right === leftEnd ||
        tile.left === rightEnd ||
        tile.right === rightEnd
      );
    })
    .map((t) => t.id);
}

/**
 * Validate and connect tile to the chain
 */
export function connectTileToBoard(
  board: BoardPlacedTile[],
  tile: DominoTile,
  requestedEnd: 'LEFT' | 'RIGHT',
  currentLeft: number | null,
  currentRight: number | null,
  turnNumber: number
): {
  valid: boolean;
  newBoard: BoardPlacedTile[];
  newLeft: number;
  newRight: number;
  placedTile?: BoardPlacedTile;
  error?: string;
} {
  const isDouble = tile.left === tile.right;

  // Case 1: First tile on empty board
  if (currentLeft === null || currentRight === null || board.length === 0) {
    const placed: BoardPlacedTile = {
      tile,
      placedLeft: tile.left,
      placedRight: tile.right,
      isDouble,
      end: 'CENTER',
      turnNumber,
    };
    return {
      valid: true,
      newBoard: [placed],
      newLeft: tile.left,
      newRight: tile.right,
      placedTile: placed,
    };
  }

  // Case 2: Placing at LEFT end
  if (requestedEnd === 'LEFT') {
    let placedLeft: number;
    let placedRight: number;

    if (tile.right === currentLeft) {
      placedLeft = tile.left;
      placedRight = tile.right; // matches currentLeft
    } else if (tile.left === currentLeft) {
      placedLeft = tile.right;
      placedRight = tile.left; // matches currentLeft
    } else {
      return {
        valid: false,
        newBoard: board,
        newLeft: currentLeft,
        newRight: currentRight,
        error: `Kartu [${tile.left}|${tile.right}] tidak cocok dengan ujung kiri (${currentLeft}).`,
      };
    }

    const placed: BoardPlacedTile = {
      tile,
      placedLeft,
      placedRight,
      isDouble,
      end: 'LEFT',
      turnNumber,
    };

    return {
      valid: true,
      newBoard: [placed, ...board],
      newLeft: placedLeft,
      newRight: currentRight,
      placedTile: placed,
    };
  }

  // Case 3: Placing at RIGHT end
  if (requestedEnd === 'RIGHT') {
    let placedLeft: number;
    let placedRight: number;

    if (tile.left === currentRight) {
      placedLeft = tile.left; // matches currentRight
      placedRight = tile.right;
    } else if (tile.right === currentRight) {
      placedLeft = tile.right; // matches currentRight
      placedRight = tile.left;
    } else {
      return {
        valid: false,
        newBoard: board,
        newLeft: currentLeft,
        newRight: currentRight,
        error: `Kartu [${tile.left}|${tile.right}] tidak cocok dengan ujung kanan (${currentRight}).`,
      };
    }

    const placed: BoardPlacedTile = {
      tile,
      placedLeft,
      placedRight,
      isDouble,
      end: 'RIGHT',
      turnNumber,
    };

    return {
      valid: true,
      newBoard: [...board, placed],
      newLeft: currentLeft,
      newRight: placedRight,
      placedTile: placed,
    };
  }

  return {
    valid: false,
    newBoard: board,
    newLeft: currentLeft,
    newRight: currentRight,
    error: 'Ujung penempatan kartu tidak valid.',
  };
}
