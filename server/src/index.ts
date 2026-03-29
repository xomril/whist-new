import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { RoomManager } from './RoomManager';
import { ServerToClientEvents, ClientToServerEvents } from './types';
import { chooseBid1, chooseBid2, chooseCard, chooseExchangeCards } from './game/BotPlayer';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    // In production the client is served from the same origin, so allow all.
    // Set CLIENT_URL env var to restrict to a specific domain if needed.
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new RoomManager();

// Serve built client in production.
// In Docker the layout is:  /app/server/dist/index.js  →  /app/client/dist/
// In local dev (ts-node):   /server/src/index.ts       →  /client/dist/
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// ── Helper: push updated game state to every player + spectator in a room ────
function broadcastState(roomId: string) {
  const game = rooms.getGame(roomId);
  if (!game) return;
  const info = rooms.getRoomInfo(roomId);
  // Skip bots when broadcasting — they have no socket
  for (const { id } of info?.players ?? []) {
    if (!rooms.isBot(roomId, id)) {
      const state = game.stateFor(id);
      state.hostId = info?.hostId;
      state.cheatMode = rooms.isCheatMode(roomId);
      state.spectatorPasswordSet = rooms.hasSpectatorPassword(roomId);
      if (state.cheatMode && id === info?.hostId) {
        state.allHands = game.players.map(p => p.hand);
      }
      io.to(id).emit('gameState', state);
    }
  }
  for (const sid of rooms.getSpectatorIds(roomId)) {
    io.to(sid).emit('gameState', game.stateForSpectator());
  }
}

// ── Bot turn scheduling ───────────────────────────────────────────────────────
function scheduleBotTurn(roomId: string) {
  const game = rooms.getGame(roomId);
  if (!game) return;
  if (game.phase === 'gameOver' || game.phase === 'waiting' || game.phase === 'handEnd') return;

  // Card exchange: all bots act simultaneously (not sequential)
  if (game.phase === 'cardExchange') {
    const info = rooms.getRoomInfo(roomId);
    for (const { id } of info?.players ?? []) {
      if (!rooms.isBot(roomId, id)) continue;
      if (game.exchangeSelections.has(id)) continue;
      const botId = id;
      const delay = 700 + Math.random() * 500;
      setTimeout(() => {
        const g = rooms.getGame(roomId);
        if (!g || g.phase !== 'cardExchange' || g.exchangeSelections.has(botId)) return;
        const result = g.submitExchange(botId, chooseExchangeCards(g, botId));
        if (result.success) {
          broadcastState(roomId);
          scheduleBotTurn(roomId);
        }
      }, delay);
    }
    return;
  }

  const currentId = game.players[game.currentPlayerIndex]?.id;
  if (!currentId || !rooms.isBot(roomId, currentId)) return;

  const delay = 700 + Math.random() * 500;
  setTimeout(() => {
    const g = rooms.getGame(roomId);
    if (!g) return;
    // Confirm it's still this bot's turn (state may have changed)
    if (g.players[g.currentPlayerIndex]?.id !== currentId) return;

    let result: { success: boolean; error?: string } = { success: false };

    if (g.phase === 'bid1') {
      result = g.placeBid1(currentId, chooseBid1(g, currentId));
    } else if (g.phase === 'bid2') {
      result = g.placeBid2(currentId, chooseBid2(g, currentId));
    } else if (g.phase === 'playing') {
      result = g.playCard(currentId, chooseCard(g, currentId));
    }

    if (result.success) {
      broadcastState(roomId);
      // Chain next bot turn if needed
      scheduleBotTurn(roomId);
    }
  }, delay);
}

// ── Socket handlers ──────────────────────────────────────────────────────────
io.on('connection', socket => {
  socket.join(socket.id);

  // ── Create room ─────────────────────────────────────────────────────────────
  socket.on('createRoom', ({ playerName, maxPlayers, targetScore }, cb) => {
    try {
      const roomId = rooms.createRoom(socket.id, playerName, maxPlayers, targetScore ?? 100);
      socket.join(roomId);
      cb({ success: true, roomId });
      io.to(roomId).emit('roomUpdated', { room: rooms.getRoomInfo(roomId)! });
    } catch (e) {
      cb({ success: false, error: String(e) });
    }
  });

  // ── Join room ────────────────────────────────────────────────────────────────
  socket.on('joinRoom', ({ roomId: raw, playerName }, cb) => {
    const result = rooms.joinRoom(raw, socket.id, playerName);
    if (!result.success) { cb(result); return; }

    const roomId = result.roomId!;
    socket.join(roomId);
    cb({ success: true });

    // Rejoining a game in progress — send game state directly
    if (result.rejoined) {
      broadcastState(roomId);
      return;
    }

    io.to(roomId).emit('roomUpdated', { room: rooms.getRoomInfo(roomId)! });

    if (rooms.isFull(roomId)) {
      rooms.startGame(roomId);
      broadcastState(roomId);
      scheduleBotTurn(roomId);
    }
  });

  // ── Add bots ─────────────────────────────────────────────────────────────────
  socket.on('addBots', ({ roomId }, cb) => {
    const result = rooms.addBots(roomId, socket.id);
    if (!result.success) { cb(result); return; }

    cb({ success: true });
    io.to(roomId).emit('roomUpdated', { room: rooms.getRoomInfo(roomId)! });

    if (rooms.isFull(roomId)) {
      rooms.startGame(roomId);
      broadcastState(roomId);
      scheduleBotTurn(roomId);
    }
  });

  // ── Spectate ─────────────────────────────────────────────────────────────────
  socket.on('spectate', ({ roomId: raw, password }, cb) => {
    const result = rooms.spectate(raw, socket.id, password);
    if (!result.success) { cb(result); return; }
    socket.join(result.roomId!);
    cb({ success: true });
    const game = rooms.getGame(result.roomId!);
    if (game) socket.emit('gameState', game.stateForSpectator());
  });

  // ── Set spectator password ────────────────────────────────────────────────────
  socket.on('setSpectatorPassword', ({ roomId, password }, cb) => {
    const result = rooms.setSpectatorPassword(roomId, socket.id, password);
    cb(result);
  });

  // ── Phase-1 bid ──────────────────────────────────────────────────────────────
  socket.on('bid1', ({ action }, cb) => {
    const roomId = rooms.getRoomId(socket.id);
    if (!roomId) { cb({ success: false, error: 'Not in a room' }); return; }
    const game = rooms.getGame(roomId);
    if (!game) { cb({ success: false, error: 'No game in progress' }); return; }

    const result = game.placeBid1(socket.id, action);
    cb(result);
    if (result.success) { broadcastState(roomId); scheduleBotTurn(roomId); }
  });

  // ── Phase-2 bid ──────────────────────────────────────────────────────────────
  socket.on('bid2', ({ tricks }, cb) => {
    const roomId = rooms.getRoomId(socket.id);
    if (!roomId) { cb({ success: false, error: 'Not in a room' }); return; }
    const game = rooms.getGame(roomId);
    if (!game) { cb({ success: false, error: 'No game in progress' }); return; }

    const result = game.placeBid2(socket.id, tricks);
    cb(result);
    if (result.success) { broadcastState(roomId); scheduleBotTurn(roomId); }
  });

  // ── Play card ────────────────────────────────────────────────────────────────
  socket.on('playCard', ({ cardIndex }, cb) => {
    const roomId = rooms.getRoomId(socket.id);
    if (!roomId) { cb({ success: false, error: 'Not in a room' }); return; }
    const game = rooms.getGame(roomId);
    if (!game) { cb({ success: false, error: 'No game in progress' }); return; }

    const result = game.playCard(socket.id, cardIndex);
    cb(result);
    if (result.success) { broadcastState(roomId); scheduleBotTurn(roomId); }
  });

  // ── Submit exchange ───────────────────────────────────────────────────────────
  socket.on('submitExchange', ({ cardIndices }, cb) => {
    const roomId = rooms.getRoomId(socket.id);
    if (!roomId) { cb({ success: false, error: 'Not in a room' }); return; }
    const game = rooms.getGame(roomId);
    if (!game) { cb({ success: false, error: 'No game in progress' }); return; }

    const result = game.submitExchange(socket.id, cardIndices);
    cb(result);
    if (result.success) { broadcastState(roomId); scheduleBotTurn(roomId); }
  });

  // ── Next hand ────────────────────────────────────────────────────────────────
  socket.on('nextHand', cb => {
    const roomId = rooms.getRoomId(socket.id);
    if (!roomId) { cb({ success: false, error: 'Not in a room' }); return; }
    const game = rooms.getGame(roomId);
    if (!game) { cb({ success: false, error: 'No game in progress' }); return; }

    const result = game.nextHand();
    cb(result);
    if (result.success) { broadcastState(roomId); scheduleBotTurn(roomId); }
  });

  // ── Zoom link ────────────────────────────────────────────────────────────────
  socket.on('setZoomLink', ({ roomId, link }, cb) => {
    const result = rooms.setZoomLink(roomId, socket.id, link);
    if (!result.success) { cb(result); return; }
    cb({ success: true });
    io.to(roomId).emit('roomUpdated', { room: rooms.getRoomInfo(roomId)! });
  });

  // ── Cheat mode ───────────────────────────────────────────────────────────────
  socket.on('toggleCheatMode', ({ roomId }, cb) => {
    const result = rooms.toggleCheatMode(roomId, socket.id);
    if (!result.success) { cb(result); return; }
    cb(result);
    broadcastState(roomId);
  });

  // ── Kick from game ───────────────────────────────────────────────────────────
  socket.on('kickFromGame', ({ roomId, targetId }, cb) => {
    const result = rooms.kickFromGame(roomId, socket.id, targetId);
    if (!result.success) { cb(result); return; }

    cb({ success: true });
    io.to(targetId).emit('kicked', { reason: 'You were removed from the game. Rejoin with the same name.' });
    broadcastState(roomId);
  });

  // ── Kick player ──────────────────────────────────────────────────────────────
  socket.on('kickPlayer', ({ roomId, targetId }, cb) => {
    const result = rooms.removePlayer(roomId, socket.id, targetId);
    if (!result.success) { cb(result); return; }

    cb({ success: true });
    io.to(targetId).emit('kicked', { reason: 'You were removed from the room by the host' });
    io.to(roomId).emit('roomUpdated', { room: rooms.getRoomInfo(roomId)! });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const roomId = rooms.getRoomId(socket.id);
    rooms.disconnect(socket.id);
    if (roomId) broadcastState(roomId);
  });
});

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, () => console.log(`🃏  Whist server on http://localhost:${PORT}`));
