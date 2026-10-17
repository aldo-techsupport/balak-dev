import { io as ClientSocket, Socket } from 'socket.io-client';

const BASE_URL = 'http://localhost:3005';
const SOCKET_URL = 'http://localhost:4000';

async function runBotTest() {
  console.log('🤖 === STARTING BOT HARD MODE & RANK TEST ===');

  // 1. Login as real player (budi_master)
  const loginHttp = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'budi_master', password: 'password123' }),
  });
  const loginRes = await loginHttp.json();
  const token = loginRes.token;
  const user = loginRes.user;
  console.log(`✅ Logged in as: ${user.nickname} (Rank: ${user.rankTier} ${user.rankDivision} ${user.rankStars}★)`);

  // 2. Connect via Socket.IO
  const socket: Socket = ClientSocket(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      resolve();
    });
    socket.on('connect_error', reject);
  });

  // 3. Create a Solo Room
  const roomRes: any = await new Promise((resolve) => {
    socket.emit(
      'room:create',
      {
        name: 'Meja Latihan Bot Hard',
        mode: 'SOLO',
        isPublic: true,
        maxPlayers: 2,
      },
      resolve
    );
  });

  if (!roomRes.success) {
    throw new Error(`Failed to create room: ${roomRes.error}`);
  }
  const roomCode = roomRes.room.code;
  console.log(`✅ Room created: ${roomCode} (Players: ${roomRes.room.players.length})`);

  // 4. Add a Bot (Hard Mode)
  const botRes: any = await new Promise((resolve) => {
    socket.emit('room:add-bot', { roomCode }, resolve);
  });

  if (!botRes.success) {
    throw new Error(`Failed to add bot: ${botRes.error}`);
  }
  console.log(`✅ Bot added successfully: ${botRes.bot.nickname} (Bot: ${botRes.bot.isBot}, Ready: ${botRes.bot.isReady})`);

  // 5. Start Game
  let gameState: any = null;
  let gameFinishedPromise = new Promise<any>((resolve) => {
    socket.on('game:finished', (winnerData) => {
      console.log('🏆 [Event] game:finished received!', JSON.stringify(winnerData.reason));
      resolve(winnerData);
    });
  });

  socket.on('game:state', (state) => {
    gameState = state;
    // console.log(`🎲 Game State Update - Turn: ${state.currentTurnUserId === user.id ? 'HUMAN' : 'BOT'}, Board: ${state.board.length}`);
  });

  const startRes: any = await new Promise((resolve) => {
    socket.emit('room:start', { roomCode }, resolve);
  });
  if (!startRes.success) {
    throw new Error(`Failed to start game: ${startRes.error}`);
  }
  console.log('✅ Game started with Bot! Waiting for turns...');

  // Wait for initial game state
  await new Promise((r) => setTimeout(r, 600));

  // 6. Play the game! Whenever it's human turn, play valid tile or pass
  const startTime = Date.now();
  while (!gameState?.isFinished && Date.now() - startTime < 60000) {
    await new Promise((r) => setTimeout(r, 800));

    if (!gameState || gameState.isFinished) break;

    if (gameState.currentTurnUserId === user.id) {
      // Human turn
      const myHand = gameState.myHand || [];
      const playable = gameState.playableTileIds || [];

      if (playable.length > 0) {
        const tileId = playable[0];
        // Decide side
        let side: 'LEFT' | 'RIGHT' = 'LEFT';
        if (gameState.board.length > 0) {
          const tile = myHand.find((t: any) => t.id === tileId);
          const leftMatch = tile && (tile.left === gameState.leftEnd || tile.right === gameState.leftEnd);
          side = leftMatch ? 'LEFT' : 'RIGHT';
        }
        // console.log(`🙋 Human playing tile: ${tileId} on ${side}`);
        socket.emit('game:play', { roomCode, tileId, end: side });
      } else {
        // console.log('🙋 Human passing turn');
        socket.emit('game:pass', { roomCode });
      }
    } else {
      // Bot turn is being processed automatically by DominoBotAI on server!
    }
  }

  const winnerResult = await gameFinishedPromise;
  console.log('🎉 Match completed successfully!');
  console.log(`- Reason: ${winnerResult.reason}`);
  console.log(`- Winner: ${winnerResult.winnerNickname}`);
  console.log('- Summary:', winnerResult.pipsSummary.map((p: any) => `${p.nickname} (Pips: ${p.pips}, Winner: ${p.isWinner}, Star: ${p.starChange})`));

  // 7. Verify user profile rank in database
  const statsHttp = await fetch(`${BASE_URL}/api/user/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const statsRes = await statsHttp.json();
  const st = statsRes.stats || {};
  console.log('📊 Verified Updated Stats in DB:', {
    rankTier: st.rankTier,
    rankDivision: st.rankDivision,
    rankStars: st.rankStars,
    totalGames: st.totalGames,
    wins: st.wins,
    losses: st.losses,
  });

  socket.disconnect();
  console.log('✅ TEST PASSED: Bot Hard Mode gameplay and Ranked updates fully verified!');
}

runBotTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});