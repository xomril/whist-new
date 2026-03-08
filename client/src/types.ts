// Mirror of server/src/types.ts (keep in sync)

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type TrumpSuit = Suit | 'notrumps';
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export interface Card { suit: Suit; rank: Rank }

export interface Bid1 { tricks: number; suit: TrumpSuit }

export type Bid1Action =
  | { type: 'bid'; bid: Bid1 }
  | { type: 'pass' };

export interface TrickCard { playerId: string; playerName: string; card: Card }

export interface CompletedTrick {
  cards: TrickCard[];
  winnerId: string;
  winnerName: string;
  leadSuit: Suit;
}

export type GamePhase =
  | 'waiting' | 'bid1' | 'cardExchange' | 'bid2' | 'playing' | 'handEnd' | 'gameOver';

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

export interface GameStateView {
  roomId: string;
  phase: GamePhase;
  myHand: Card[];
  /** All hands revealed — spectator only */
  allHands?: Card[][];
  isSpectator?: boolean;
  players: PlayerView[];
  myIndex: number;  // -1 for spectators
  currentPlayerIndex: number;
  dealerIndex: number;
  declarerIndex?: number;
  trumpSuit?: TrumpSuit;
  currentHighBid1?: Bid1;
  awaitingDeclarerConfirm?: boolean;
  currentTrick: TrickCard[];
  completedTricks: CompletedTrick[];
  trickNumber: number;
  handNumber: number;
  maxPlayers: number;
  totalTricks: number;
  isOverGame?: boolean;
  bid2ForbiddenValue?: number;
  winner?: PlayerView;
  targetScore: number;
  validCardIndices?: number[];
  handHistory: HandRecord[];
  exchangeRound?: number;
  exchangeSubmitted?: boolean;
  exchangePendingCount?: number;
}

export interface RoomInfo {
  id: string;
  hostId: string;
  players: { id: string; name: string }[];
  maxPlayers: 3 | 4;
  status: 'waiting' | 'playing';
  targetScore: number;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
};

export const SUIT_COLOR: Record<Suit, string> = {
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
};

export const TRUMP_LABEL: Record<TrumpSuit, string> = {
  clubs: '♣ Clubs', diamonds: '♦ Diamonds',
  hearts: '♥ Hearts', spades: '♠ Spades', notrumps: 'No Trumps',
};
