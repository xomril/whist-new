import { WhistGame } from './game/Game';
import { RoomInfo } from './types';

interface Room {
  id: string;
  hostId: string;
  playerIds: string[];
  playerNames: Map<string, string>;
  maxPlayers: 3 | 4;
  targetScore: number;
  game?: WhistGame;
  spectatorIds: Set<string>;
  botIds: Set<string>;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRoom = new Map<string, string>(); // socketId → roomId

  // ── Create / join ──────────────────────────────────────────────────────────
  createRoom(
    hostId: string,
    hostName: string,
    maxPlayers: 3 | 4,
    targetScore: number
  ): string {
    const roomId = this.genCode();
    this.rooms.set(roomId, {
      id: roomId,
      hostId,
      playerIds: [hostId],
      playerNames: new Map([[hostId, hostName]]),
      maxPlayers,
      targetScore,
      spectatorIds: new Set(),
      botIds: new Set(),
    });
    this.playerRoom.set(hostId, roomId);
    return roomId;
  }

  joinRoom(
    rawRoomId: string,
    playerId: string,
    playerName: string
  ): { success: boolean; error?: string; roomId?: string } {
    const roomId = rawRoomId.toUpperCase().trim();
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.game) return { success: false, error: 'Game already in progress' };
    if (room.playerIds.length >= room.maxPlayers) return { success: false, error: 'Room is full' };
    if (room.playerIds.includes(playerId)) return { success: false, error: 'Already in room' };

    room.playerIds.push(playerId);
    room.playerNames.set(playerId, playerName);
    this.playerRoom.set(playerId, roomId);

    return { success: true, roomId };
  }

  isFull(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    return !!room && room.playerIds.length === room.maxPlayers;
  }

  // ── Game ───────────────────────────────────────────────────────────────────
  startGame(roomId: string): WhistGame | null {
    const room = this.rooms.get(roomId);
    if (!room || room.playerIds.length < 2) return null;

    room.game = new WhistGame(roomId, room.maxPlayers, room.targetScore);
    for (const pid of room.playerIds) {
      room.game.addPlayer(pid, room.playerNames.get(pid)!);
    }
    room.game.startGame();
    return room.game;
  }

  getGame(roomId: string): WhistGame | undefined {
    return this.rooms.get(roomId)?.game;
  }

  getGameByPlayer(playerId: string): WhistGame | undefined {
    const roomId = this.playerRoom.get(playerId);
    return roomId ? this.getGame(roomId) : undefined;
  }

  getRoomId(playerId: string): string | undefined {
    return this.playerRoom.get(playerId);
  }

  getRoomInfo(roomId: string): RoomInfo | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    return {
      id: room.id,
      hostId: room.hostId,
      players: room.playerIds.map(id => ({ id, name: room.playerNames.get(id)! })),
      maxPlayers: room.maxPlayers,
      status: room.game ? 'playing' : 'waiting',
      targetScore: room.targetScore,
    };
  }

  // ── Bots ───────────────────────────────────────────────────────────────────
  addBots(roomId: string, hostId: string): { success: boolean; error?: string; botIds?: string[] } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== hostId) return { success: false, error: 'Only the host can add bots' };
    if (room.game) return { success: false, error: 'Game already in progress' };

    const botNames = ['🤖 Alpha', '🤖 Beta', '🤖 Gamma'];
    const needed = room.maxPlayers - room.playerIds.length;
    const botIds: string[] = [];

    for (let i = 0; i < needed; i++) {
      const botId = `bot-${roomId}-${i}`;
      const botName = botNames[i] ?? `🤖 Bot${i + 1}`;
      room.playerIds.push(botId);
      room.playerNames.set(botId, botName);
      room.botIds.add(botId);
      this.playerRoom.set(botId, roomId);
      botIds.push(botId);
    }

    return { success: true, botIds };
  }

  isBot(roomId: string, playerId: string): boolean {
    return this.rooms.get(roomId)?.botIds.has(playerId) ?? false;
  }

  getBotIds(roomId: string): string[] {
    return [...(this.rooms.get(roomId)?.botIds ?? [])];
  }

  // ── Spectate ───────────────────────────────────────────────────────────────
  spectate(rawRoomId: string, socketId: string): { success: boolean; error?: string; roomId?: string } {
    const roomId = rawRoomId.toUpperCase().trim();
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (!room.game) return { success: false, error: 'Game has not started yet' };
    room.spectatorIds.add(socketId);
    this.playerRoom.set(socketId, roomId);
    return { success: true, roomId };
  }

  getSpectatorIds(roomId: string): string[] {
    return [...(this.rooms.get(roomId)?.spectatorIds ?? [])];
  }

  isSpectator(socketId: string): boolean {
    const roomId = this.playerRoom.get(socketId);
    if (!roomId) return false;
    return this.rooms.get(roomId)?.spectatorIds.has(socketId) ?? false;
  }

  // ── Kick ───────────────────────────────────────────────────────────────────
  removePlayer(roomId: string, hostId: string, targetId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== hostId) return { success: false, error: 'Only the host can kick players' };
    if (room.game) return { success: false, error: 'Cannot kick during a game' };
    if (targetId === hostId) return { success: false, error: 'Cannot kick yourself' };
    if (!room.playerIds.includes(targetId)) return { success: false, error: 'Player not in room' };

    room.playerIds = room.playerIds.filter(id => id !== targetId);
    room.playerNames.delete(targetId);
    room.botIds.delete(targetId);
    this.playerRoom.delete(targetId);
    return { success: true };
  }

  // ── Disconnect / reconnect ─────────────────────────────────────────────────
  disconnect(playerId: string): void {
    const roomId = this.playerRoom.get(playerId);
    if (!roomId) return;
    this.rooms.get(roomId)?.game?.setConnected(playerId, false);
  }

  reconnect(playerId: string): string | undefined {
    const roomId = this.playerRoom.get(playerId);
    if (!roomId) return undefined;
    this.rooms.get(roomId)?.game?.setConnected(playerId, true);
    return roomId;
  }

  getPlayerName(roomId: string, playerId: string): string | undefined {
    return this.rooms.get(roomId)?.playerNames.get(playerId);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private genCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return this.rooms.has(code) ? this.genCode() : code;
  }
}
