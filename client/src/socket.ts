import { io, Socket } from 'socket.io-client';
import { GameStateView, RoomInfo, Bid1Action } from './types';

export interface ServerToClientEvents {
  roomUpdated: (data: { room: RoomInfo }) => void;
  gameState: (state: GameStateView) => void;
  error: (data: { message: string }) => void;
  kicked: (data: { reason: string }) => void;
}

export interface ClientToServerEvents {
  addBots: (
    data: { roomId: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  spectate: (
    data: { roomId: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  createRoom: (
    data: { playerName: string; maxPlayers: 3 | 4; targetScore: number },
    callback: (result: { success: boolean; roomId?: string; error?: string }) => void
  ) => void;
  joinRoom: (
    data: { roomId: string; playerName: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  bid1: (
    data: { action: Bid1Action },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  bid2: (
    data: { tricks: number },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  playCard: (
    data: { cardIndex: number },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  nextHand: (
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  submitExchange: (
    data: { cardIndices: number[] },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
  kickPlayer: (
    data: { roomId: string; targetId: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;
}

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: true,
});
