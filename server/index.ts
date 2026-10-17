import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { registerSocketHandlers } from './socket';
import { roomManager } from './roomManager';

const PORT = parseInt(process.env.PORT || '4000', 10);

const server = http.createServer((req, res) => {
  // Simple CORS and HTTP request handling for standalone endpoints
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  if (req.url === '/api/rooms') {
    const publicRooms = roomManager.getPublicRooms();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rooms: publicRooms }));
    return;
  }

  if (req.url === '/api/admin/rooms' && req.method === 'GET') {
    const allRooms = roomManager.getAllRoomsDetailed();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rooms: allRooms }));
    return;
  }

  if (req.url === '/api/admin/rooms/close' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { roomCode } = JSON.parse(body || '{}');
        if (!roomCode) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'roomCode required' }));
          return;
        }
        const result = roomManager.forceCloseRoom(roomCode);
        if (result.success && result.room) {
          io.to(roomCode).emit('room:closed_by_admin', { message: 'Meja ini telah ditutup oleh Administrator.' });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, roomCode }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

registerSocketHandlers(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  🎲 GAPLE 3D MULTIPLAYER ENGINE ONLINE ON PORT ${PORT}`);
  console.log(`  🌐 WebSocket endpoint: ws://0.0.0.0:${PORT}`);
  console.log(`====================================================`);
});
