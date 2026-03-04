// ── Card primitives ──────────────────────────────────────────────────────────
export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type TrumpSuit = Suit | 'notrumps';
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// ── Bidding ──────────────────────────────────────────────────────────────────
export interface Bid1 {
  tricks: number;
  suit: TrumpSuit;
}

export type Bid1Action =
  | { type: 'bid'; bid: Bid1 }
  | { type: 'pass' };

// ── Trick ────────────────────────────────────────────────────────────────────
export interface TrickCard {
  playerId: string;
  playerName: string;
  card: Card;
}

export interface CompletedTrick {
  cards: TrickCard[];
  winnerId: string;
  winnerName: string;
  leadSuit: Suit;
}

// ── Hand history ─────────────────────────────────────────────────────────────
export interface HandRecord {
  handNumber: number;
  trumpSuit: TrumpSuit;
  isOverGame: boolean;
  results: {
    playerId: string;
    playerName: string;
    bid2: number;
    tricksTaken: number;
    scoreDelta: number;
    scoreAfter: number;
  }[];
}

// ── Game phase ───────────────────────────────────────────────────────────────
export type GamePhase =
  | 'waiting'   // lobby / not started
  | 'bid1'      // phase-1 bidding: choose trump + trick count
  | 'bid2'      // phase-2 bidding: each player bids how many tricks
  | 'playing'   // playing tricks
  | 'handEnd'   // hand finished, review scores
  | 'gameOver'; // game finished

// ── Per-player view sent to client ──────────────────────────────────────────
export interface PlayerView {
  id: string;
  name: string;
  handSize: number;
  bid1?: Bid1Action;
  bid2?: number;
  tricksTaken: number;
  score: number;
  isConnected: boolean;
  isDealer: boolean;
  isDeclarer: boolean;
}

// ── Full game-state view sent to each client ─────────────────────────────────
export interface GameStateView {
  roomId: string;
  phase: GamePhase;
  myHand: Card[];
  /** All hands revealed (spectator mode only, myIndex === -1) */
  allHands?: Card[][];
  isSpectator?: boolean;
  players: PlayerView[];
  myIndex: number;  // -1 for spectators
  currentPlayerIndex: number;
  dealerIndex: number;
  declarerIndex?: number;
  trumpSuit?: TrumpSuit;
  currentHighBid1?: Bid1;
  currentTrick: TrickCard[];
  completedTricks: CompletedTrick[];
  trickNumber: number;
  handNumber: number;
  maxPlayers: number;
  totalTricks: number;
  isOverGame?: boolean;
  /** The trick-count the last phase-2 bidder is FORBIDDEN to bid */
  bid2ForbiddenValue?: number;
  winner?: PlayerView;
  targetScore: number;
  validCardIndices?: number[];
  handHistory: HandRecord[];
}

// ── Room info sent to lobby ──────────────────────────────────────────────────
export interface RoomInfo {
  id: string;
  hostId: string;
  players: { id: string; name: string }[];
  maxPlayers: 3 | 4;
  status: 'waiting' | 'playing';
  targetScore: number;
}

// ── Socket event maps ────────────────────────────────────────────────────────
export interface ServerToClientEvents {
  roomUpdated: (data: { room: RoomInfo }) => void;
  gameState: (state: GameStateView) => void;
  error: (data: { message: string }) => void;
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
  nextHand: (callback: (result: { success: boolean; error?: string }) => void) => void;
}
