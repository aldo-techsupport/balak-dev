import {
  AuthoritativeGameState,
  DominoTile,
  GameMode,
  PlayerSlot,
  Team,
} from '../types';
import { getPlayableTileIds } from './domino';

export interface BotDecision {
  action: 'PLAY' | 'PASS';
  tileId?: string;
  end?: 'LEFT' | 'RIGHT';
}

// Generate the complete set of 28 standard domino tiles
export function generateFullDominoSet(): DominoTile[] {
  const tiles: DominoTile[] = [];
  for (let left = 0; left <= 6; left++) {
    for (let right = left; right <= 6; right++) {
      tiles.push({
        id: `${left}-${right}`,
        left,
        right,
      });
    }
  }
  return tiles;
}

interface PlayerKnowledge {
  userId: string;
  seatIndex: number;
  team: Team | null;
  cardCount: number;
  passedSuits: Set<number>;
  playedTiles: DominoTile[];
  possibleTiles: DominoTile[];
  knownTiles: DominoTile[]; // 100% deduced tiles
}

export class DominoBotAI {
  /**
   * Determine the optimal move for a Mythic Glory 100★ Grandmaster AI in Balak / Gaple
   */
  public static getBestMove(
    game: AuthoritativeGameState,
    botUserId: string,
    gameMode: GameMode,
    players: PlayerSlot[]
  ): BotDecision {
    const hand = game.hands[botUserId] || [];
    if (hand.length === 0) {
      return { action: 'PASS' };
    }

    const isOpeningMove = game.board.length === 0;

    // 1. Check legal playable tiles
    const playableIds = getPlayableTileIds(
      hand,
      game.leftEnd,
      game.rightEnd,
      isOpeningMove ? game.requiredInitialTileId : undefined,
      isOpeningMove ? game.mustPlayBalak : false
    );

    if (playableIds.length === 0) {
      return { action: 'PASS' };
    }

    // 2. Opening Move (Mythic Glory 100★ Opening Theory)
    if (isOpeningMove) {
      // If round 1, must play Balak 0 (0-0)
      if (game.requiredInitialTileId) {
        return { action: 'PLAY', tileId: game.requiredInitialTileId, end: 'RIGHT' };
      }

      // Round 2+ Opening:
      // If must play balak, evaluate which balak gives best suit monopoly and safety
      const playableTiles = hand.filter((t) => playableIds.includes(t.id));
      const balaks = playableTiles.filter((t) => t.left === t.right);

      if (balaks.length > 0) {
        // Evaluate each balak: prefer balak where bot has complementary tiles (e.g. holds 6-6 and 6-5, 6-4)
        // AND ditch heavy balaks (6-6, 5-5) early so they don't become dead balak liabilities!
        balaks.sort((a, b) => {
          const countA = hand.filter((t) => t.left === a.left || t.right === a.left).length;
          const countB = hand.filter((t) => t.left === b.left || t.right === b.left).length;
          const pipsA = a.left + a.right;
          const pipsB = b.left + b.right;
          // Weighted: suit backing + pip unloading
          const scoreA = countA * 10 + pipsA * 2;
          const scoreB = countB * 10 + pipsB * 2;
          return scoreB - scoreA;
        });
        return { action: 'PLAY', tileId: balaks[0].id, end: 'RIGHT' };
      }

      // If opening without balak restriction, pick tile that unloads heavy pips while retaining suit control
      playableTiles.sort((a, b) => {
        const pipsA = a.left + a.right;
        const pipsB = b.left + b.right;
        return pipsB - pipsA;
      });
      return { action: 'PLAY', tileId: playableTiles[0].id, end: 'RIGHT' };
    }

    // 3. Deductive Knowledge Engine (Baca Kartu Lawan & Peluang)
    const all28Tiles = generateFullDominoSet();
    const visibleTileIds = new Set<string>();
    for (const b of game.board) {
      visibleTileIds.add(b.tile.id);
    }
    for (const h of hand) {
      visibleTileIds.add(h.id);
    }
    const unseenTiles = all28Tiles.filter((t) => !visibleTileIds.has(t.id));

    // Track pass history by reconstructing board ends at each move
    const knowledgeMap = new Map<string, PlayerKnowledge>();
    for (const p of players) {
      const cardCount = game.hands[p.userId]?.length ?? (p.userId === botUserId ? hand.length : 7);
      knowledgeMap.set(p.userId, {
        userId: p.userId,
        seatIndex: p.seatIndex,
        team: p.team ?? null,
        cardCount,
        passedSuits: new Set<number>(),
        playedTiles: [],
        possibleTiles: [],
        knownTiles: [],
      });
    }

    // Reconstruct moves to extract exact passed numbers
    for (let i = 0; i < game.moveHistory.length; i++) {
      const move = game.moveHistory[i];
      if (move.action === 'PASS') {
        const pk = knowledgeMap.get(move.userId);
        if (pk && move.leftEnd !== undefined && move.rightEnd !== undefined) {
          if (move.leftEnd !== null) pk.passedSuits.add(move.leftEnd);
          if (move.rightEnd !== null) pk.passedSuits.add(move.rightEnd);
        }
      } else if (move.action === 'PLAY' && move.tile) {
        const pk = knowledgeMap.get(move.userId);
        if (pk) pk.playedTiles.push(move.tile);
      }
    }

    // Determine possible tiles for each other player
    for (const tile of unseenTiles) {
      const candidateUsers: string[] = [];
      for (const [uid, pk] of knowledgeMap.entries()) {
        if (uid === botUserId || pk.cardCount <= 0) continue;
        const cannotHold = pk.passedSuits.has(tile.left) || pk.passedSuits.has(tile.right);
        if (!cannotHold) {
          candidateUsers.push(uid);
          pk.possibleTiles.push(tile);
        }
      }
      // If only 1 player could possibly hold this tile, it is 100% in their hand!
      if (candidateUsers.length === 1) {
        const confirmedUser = knowledgeMap.get(candidateUsers[0]);
        if (confirmedUser) {
          confirmedUser.knownTiles.push(tile);
        }
      }
    }

    const botSlot = players.find((p) => p.userId === botUserId);
    const botSeat = botSlot?.seatIndex ?? 0;
    const botTeam = botSlot?.team ?? null;
    const isTeam = gameMode === 'TEAM_BATTLE';

    const sortedPlayers = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
    const botIdx = sortedPlayers.findIndex((p) => p.seatIndex === botSeat);
    const nextPlayer = sortedPlayers[(botIdx + 1) % sortedPlayers.length];
    const partnerPlayer = isTeam
      ? sortedPlayers.find((p) => p.team === botTeam && p.userId !== botUserId)
      : null;

    // 4. Generate all valid placement candidate moves
    interface CandidateMove {
      tile: DominoTile;
      end: 'LEFT' | 'RIGHT';
      newLeft: number;
      newRight: number;
      score: number;
      tacticalNotes: string[];
    }

    const candidates: CandidateMove[] = [];
    const playableTiles = hand.filter((t) => playableIds.includes(t.id));
    const leftEnd = game.leftEnd!;
    const rightEnd = game.rightEnd!;

    for (const tile of playableTiles) {
      // Can place on LEFT?
      if (tile.left === leftEnd || tile.right === leftEnd) {
        const newLeft = tile.left === leftEnd ? tile.right : tile.left;
        candidates.push({
          tile,
          end: 'LEFT',
          newLeft,
          newRight: rightEnd,
          score: 0,
          tacticalNotes: [],
        });
      }

      // Can place on RIGHT?
      if (tile.left === rightEnd || tile.right === rightEnd) {
        const newRight = tile.right === rightEnd ? tile.left : tile.right;
        candidates.push({
          tile,
          end: 'RIGHT',
          newLeft: leftEnd,
          newRight,
          score: 0,
          tacticalNotes: [],
        });
      }
    }

    if (candidates.length === 0) {
      return { action: 'PASS' };
    }

    // 5. Mythic Glory 100★ Multi-Factor Evaluation Engine
    const remainingHandAfter = (playedTileId: string) => hand.filter((t) => t.id !== playedTileId);

    for (const cand of candidates) {
      let score = 0;
      const tile = cand.tile;
      const pip = tile.left + tile.right;
      const isDouble = tile.left === tile.right;
      const remHand = remainingHandAfter(tile.id);
      const remPips = remHand.reduce((s, t) => s + t.left + t.right, 0);
      const openEndCreated = cand.end === 'LEFT' ? cand.newLeft : cand.newRight;

      // ==========================================
      // STRATEGY 1: COLOK SAKTI (INSTANT WIN)
      // ==========================================
      if (remHand.length === 0) {
        score += 500000; // Playing this tile WINS the game immediately!
        if (isDouble) score += 50000; // Colok Balak flair
        cand.score = score;
        cand.tacticalNotes.push('WIN_GAME_NOW');
        continue; // Unbeatable choice
      }

      // ==========================================
      // STRATEGY 2: DEADLOCK ("BUNTU MUTLAK") CALCULATOR
      // ==========================================
      // A deadlock occurs if both ends match number X and all 7 tiles of X are accounted for
      if (cand.newLeft === cand.newRight) {
        const deadNum = cand.newLeft;
        let visibleCount = 0;
        for (const b of game.board) {
          if (b.tile.left === deadNum || b.tile.right === deadNum) visibleCount++;
        }
        for (const t of hand) {
          if (t.left === deadNum || t.right === deadNum) visibleCount++;
        }

        if (visibleCount >= 7) {
          // 100% Guaranteed Deadlock!
          cand.tacticalNotes.push('GUARANTEED_BUNTU');

          if (isTeam) {
            // Team Battle: Estimate Team A vs Team B pips
            // If Bot has extremely low pips (e.g. <= 4), or our team is clearly ahead:
            const partnerKnowledge = partnerPlayer ? knowledgeMap.get(partnerPlayer.userId) : null;
            const partnerEstPips = partnerKnowledge ? (partnerKnowledge.cardCount * 3.5) : 10;
            const ourTeamPips = remPips + partnerEstPips;

            // Estimate opponent pips
            let oppTeamPips = 0;
            for (const p of players) {
              if (p.team !== botTeam) {
                const oppK = knowledgeMap.get(p.userId);
                oppTeamPips += (oppK?.cardCount ?? 4) * 4.5;
              }
            }

            if (ourTeamPips < oppTeamPips - 4 || remPips <= 3) {
              // FORCIBLY BUNTU! Tournament winning strike!
              score += 350000;
              cand.tacticalNotes.push('TACTICAL_BUNTU_WIN');
            } else if (ourTeamPips >= oppTeamPips || remPips > 10) {
              // REFUSE DEADLOCK! We would lose!
              score -= 350000;
              cand.tacticalNotes.push('AVOID_DEADLOCK_LOSS');
            }
          } else {
            // Solo Mode: Check if Bot has lowest pips
            // If Bot has 0..4 pips, very high chance to win deadlock!
            if (remPips <= 3) {
              score += 350000;
              cand.tacticalNotes.push('TACTICAL_BUNTU_WIN');
            } else if (remPips > 7) {
              score -= 350000;
              cand.tacticalNotes.push('AVOID_DEADLOCK_LOSS');
            } else {
              // 4..7 pips: evaluate unseen pips
              const avgUnseen = unseenTiles.reduce((s, t) => s + (t.left + t.right), 0) / Math.max(1, unseenTiles.length);
              if (remPips < avgUnseen * 1.5) {
                score += 150000;
              } else {
                score -= 150000;
              }
            }
          }
        }
      }

      // ==========================================
      // STRATEGY 3: 2V2 TEAM BATTLE SYNERGY
      // ==========================================
      if (isTeam && partnerPlayer) {
        const pk = knowledgeMap.get(partnerPlayer.userId);
        if (pk) {
          // If partner has only 1 card left, feeding partner's suit WINS THE GAME!
          if (pk.cardCount === 1) {
            // Check if partner can play on openEndCreated or the other end
            const partnerCanPlayCreated = !pk.passedSuits.has(openEndCreated);
            const otherEnd = cand.end === 'LEFT' ? cand.newRight : cand.newLeft;
            const partnerCanPlayOther = !pk.passedSuits.has(otherEnd);

            if (partnerCanPlayCreated || partnerCanPlayOther) {
              score += 120000; // Feed partner to close the game!
              cand.tacticalNotes.push('FEED_PARTNER_WIN');
            }
          }

          // If next player is partner:
          if (nextPlayer.userId === partnerPlayer.userId) {
            const partnerPassedCreated = pk.passedSuits.has(openEndCreated);
            const otherEnd = cand.end === 'LEFT' ? cand.newRight : cand.newLeft;
            const partnerPassedOther = pk.passedSuits.has(otherEnd);

            if (partnerPassedCreated && partnerPassedOther) {
              // Double block on partner! Disaster!
              score -= 40000;
              cand.tacticalNotes.push('BLOCKED_PARTNER_DISASTER');
            } else if (partnerPassedCreated) {
              // Creating an end partner passed on reduces partner options
              score -= 8000;
            } else {
              // Helping partner play smoothly
              score += 3500;
            }
          }
        }
      }

      // ==========================================
      // STRATEGY 4: CHOKEHOLD & OPPONENT STARVATION (KUNCI KAKI)
      // ==========================================
      const isNextOpponent = isTeam ? nextPlayer.team !== botTeam : true;
      if (isNextOpponent) {
        const oppK = knowledgeMap.get(nextPlayer.userId);
        if (oppK) {
          const otherEnd = cand.end === 'LEFT' ? cand.newRight : cand.newLeft;
          const oppPassedCreated = oppK.passedSuits.has(openEndCreated);
          const oppPassedOther = oppK.passedSuits.has(otherEnd);

          if (oppPassedCreated && oppPassedOther) {
            // FORCED PASS! Opponent has ZERO legal moves on both ends!
            score += 45000;
            cand.tacticalNotes.push('FORCED_OPPONENT_DOUBLE_PASS');
          } else if (oppPassedCreated) {
            score += 12000;
            cand.tacticalNotes.push('FORCED_OPPONENT_END_PASS');
          }

          // If opponent has 1 card left, NEVER give them what they need!
          if (oppK.cardCount === 1) {
            if (!oppPassedCreated) {
              // Opponent might win on this created end!
              score -= 30000;
              cand.tacticalNotes.push('DANGER_OPPONENT_CAN_WIN');
            }
          }
        }
      }

      // ==========================================
      // STRATEGY 5: GRANDMASTER BALAK MANAGEMENT
      // ==========================================
      if (isDouble) {
        // High Balaks (6-6, 5-5, 4-4) are catastrophic to hold late. Play them immediately!
        if (pip >= 10) {
          score += 18000; // Balak 6 and Balak 5 priority release
          cand.tacticalNotes.push('UNLOAD_HEAVY_BALAK');
        } else if (pip >= 8) {
          score += 9000; // Balak 4
        } else {
          // Low Balaks (0-0, 1-1, 2-2) are safe to hold (very few pips in deadlock).
          score += 4000;
        }
      }

      // ==========================================
      // STRATEGY 6: SUIT MONOPOLY & CONTROL
      // ==========================================
      // Count how many tiles of openEndCreated remain in bot hand
      const mySuitCount = remHand.filter(
        (t) => t.left === openEndCreated || t.right === openEndCreated
      ).length;

      if (mySuitCount >= 3) {
        score += 8500; // Absolute dominance of this suit
        cand.tacticalNotes.push('SUIT_MONOPOLY');
      } else if (mySuitCount === 2) {
        score += 4000;
      } else if (mySuitCount === 1) {
        score += 1500;
      } else {
        // 0 follow ups: risk of losing control of this end
        score -= 2000;
      }

      // ==========================================
      // STRATEGY 7: PIP UNLOADING HEURISTIC
      // ==========================================
      // Unloading heavy pips safely reduces deadlock vulnerability
      score += pip * 150;

      // ==========================================
      // STRATEGY 8: 2-PLY LOOKAHEAD SIMULATION
      // ==========================================
      // Simulate if bot will still have playable moves on next cycle
      const willHaveMove = remHand.some(
        (t) => t.left === cand.newLeft || t.right === cand.newLeft || t.left === cand.newRight || t.right === cand.newRight
      );
      if (willHaveMove) {
        score += 3500;
      } else {
        score -= 5000; // High risk of getting stuck on next turn
        cand.tacticalNotes.push('SELF_BLOCK_RISK');
      }

      cand.score = score;
    }

    // Sort descending by calculated Grandmaster score
    candidates.sort((a, b) => b.score - a.score);
    const bestMove = candidates[0];

    // Log tactical reasoning for debugging / audit
    // console.log(`[Mythic Glory 100★ Bot] Picked ${bestMove.tile.id} on ${bestMove.end} (Score: ${bestMove.score}, Notes: ${bestMove.tacticalNotes.join(',')})`);

    return {
      action: 'PLAY',
      tileId: bestMove.tile.id,
      end: bestMove.end,
    };
  }
}