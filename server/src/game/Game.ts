import {
  Card, Bid1, Bid1Action, TrumpSuit, GamePhase,
  GameStateView, PlayerView, TrickCard, CompletedTrick, HandRecord,
} from '../types';
import {
  createDeck, shuffle, totalTricks, compareBid, trickWinner,
} from './deck';
import { calcScore } from './scoring';

// ── Internal player representation ──────────────────────────────────────────
interface ServerPlayer {
  id: string;
  name: string;
  hand: Card[];
  bid1?: Bid1Action;
  bid2?: number;
  tricksTaken: number;
  score: number;
  isConnected: boolean;
}

// ── Game class ───────────────────────────────────────────────────────────────
export class WhistGame {
  readonly id: string;
  readonly maxPlayers: 3 | 4;
  readonly targetScore: number;

  players: ServerPlayer[] = [];
  phase: GamePhase = 'waiting';

  // deal / hand bookkeeping
  handNumber = 0;
  dealerIndex = 0;

  // phase-1 bidding
  currentPlayerIndex = 0;
  bid1Passed = new Set<string>();
  currentHighBid1?: Bid1;
  currentHighBidderId?: string;
  awaitingDeclarerConfirm = false;

  // phase-2 bidding
  bid2Order: string[] = [];
  bid2Cursor = 0;

  // trump / declarer
  declarerIndex?: number;
  trumpSuit?: TrumpSuit;

  // hand history
  handHistory: HandRecord[] = [];

  // card exchange (all-pass mechanic)
  exchangeRound = 0;
  exchangeSelections = new Map<string, Card[]>();

  // play
  currentTrick: TrickCard[] = [];
  completedTricks: CompletedTrick[] = [];
  trickLeaderIndex = 0;
  isOverGame?: boolean;

  constructor(id: string, maxPlayers: 3 | 4, targetScore = 13) {
    this.id = id;
    this.maxPlayers = maxPlayers;
    this.targetScore = targetScore;
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  addPlayer(id: string, name: string): boolean {
    if (this.players.length >= this.maxPlayers) return false;
    if (this.players.find(p => p.id === id)) return false;
    this.players.push({ id, name, hand: [], tricksTaken: 0, score: 0, isConnected: true });
    return true;
  }

  setConnected(id: string, connected: boolean): void {
    const p = this.players.find(p => p.id === id);
    if (p) p.isConnected = connected;
  }

  // ── Game lifecycle ─────────────────────────────────────────────────────────
  startGame(): void {
    this.handNumber = 0;
    this.dealerIndex = Math.floor(Math.random() * this.maxPlayers);
    this.startHand();
  }

  private startHand(): void {
    this.handNumber++;

    // Reset per-hand state
    for (const p of this.players) {
      p.hand = [];
      p.bid1 = undefined;
      p.bid2 = undefined;
      p.tricksTaken = 0;
    }
    this.trumpSuit = undefined;
    this.declarerIndex = undefined;
    this.currentHighBid1 = undefined;
    this.currentHighBidderId = undefined;
    this.bid1Passed = new Set();
    this.awaitingDeclarerConfirm = false;
    this.currentTrick = [];
    this.completedTricks = [];
    this.isOverGame = undefined;
    this.exchangeRound = 0;
    this.exchangeSelections = new Map();

    // Deal
    const deckSize = totalTricks(this.maxPlayers);
    const deck = shuffle(createDeck(this.maxPlayers));
    for (let i = 0; i < this.maxPlayers; i++) {
      this.players[i].hand = deck.slice(i * deckSize, (i + 1) * deckSize);
    }

    // Phase-1 starts from player left of dealer
    this.phase = 'bid1';
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.maxPlayers;
  }

  // ── Phase-1 bidding ────────────────────────────────────────────────────────
  get minBid1(): Bid1 {
    return { tricks: this.maxPlayers === 4 ? 5 : 6, suit: 'clubs' };
  }

  placeBid1(playerId: string, action: Bid1Action): { success: boolean; error?: string } {
    if (this.phase !== 'bid1') return err('Not in bidding phase 1');
    if (this.players[this.currentPlayerIndex].id !== playerId) return err('Not your turn');

    const player = this.players[this.currentPlayerIndex];

    // Declarer won Phase 1 and is choosing to confirm or raise
    if (this.awaitingDeclarerConfirm) {
      if (action.type === 'pass') {
        // Confirm current bid → proceed to Phase 2
        this.awaitingDeclarerConfirm = false;
        this.finalizeBid1();
      } else {
        if (compareBid(action.bid, this.currentHighBid1!) <= 0) {
          return err('Raise must be strictly higher than your current winning bid');
        }
        this.awaitingDeclarerConfirm = false;
        this.currentHighBid1 = action.bid;
        this.currentHighBidderId = playerId;
        player.bid1 = action;
        this.finalizeBid1();
      }
      return { success: true };
    }

    if (action.type === 'pass') {
      this.bid1Passed.add(playerId);
      player.bid1 = action;
    } else {
      if (this.currentHighBid1) {
        if (compareBid(action.bid, this.currentHighBid1) <= 0) {
          return err('Bid must be strictly higher than the current highest bid');
        }
      } else {
        if (compareBid(action.bid, this.minBid1) < 0) {
          return err(`Minimum opening bid is ${this.minBid1.tricks} ${this.minBid1.suit}`);
        }
      }
      this.currentHighBid1 = action.bid;
      this.currentHighBidderId = playerId;
      player.bid1 = action;
    }

    this.advanceBid1();
    return { success: true };
  }

  private advanceBid1(): void {
    const n = this.maxPlayers;
    const activePlayers = this.players.filter(p => !this.bid1Passed.has(p.id));

    // All passed – either exchange or full redeal
    if (activePlayers.length === 0) {
      if (this.exchangeRound >= 3) {
        this.startHand(); // all 3 exchanges exhausted → full redeal
      } else {
        this.startCardExchange();
      }
      return;
    }

    // Only one bidder left – they win; give them a chance to confirm or raise
    if (activePlayers.length === 1 && this.currentHighBid1) {
      this.awaitingDeclarerConfirm = true;
      this.currentPlayerIndex = this.players.findIndex(p => p.id === activePlayers[0].id);
      return;
    }

    // Find next active player
    let next = (this.currentPlayerIndex + 1) % n;
    while (this.bid1Passed.has(this.players[next].id)) {
      next = (next + 1) % n;
    }

    // Bidding came back to the current high bidder – give them confirm/raise chance
    if (this.currentHighBid1 && this.players[next].id === this.currentHighBidderId) {
      this.awaitingDeclarerConfirm = true;
      this.currentPlayerIndex = next;
      return;
    }

    this.currentPlayerIndex = next;
  }

  private finalizeBid1(): void {
    this.declarerIndex = this.players.findIndex(p => p.id === this.currentHighBidderId);
    this.trumpSuit = this.currentHighBid1!.suit;
    this.startBid2();
  }

  // ── Card exchange (all-pass mechanic) ──────────────────────────────────────
  private startCardExchange(): void {
    this.exchangeRound++;
    this.exchangeSelections = new Map();
    this.phase = 'cardExchange';
  }

  submitExchange(playerId: string, cardIndices: number[]): { success: boolean; error?: string } {
    if (this.phase !== 'cardExchange') return err('Not in exchange phase');
    if (cardIndices.length !== 3) return err('Must select exactly 3 cards');
    if (new Set(cardIndices).size !== 3) return err('Duplicate card indices');

    const player = this.players.find(p => p.id === playerId);
    if (!player) return err('Player not found');
    if (this.exchangeSelections.has(playerId)) return err('Already submitted exchange');

    for (const idx of cardIndices) {
      if (idx < 0 || idx >= player.hand.length) return err('Invalid card index');
    }

    // Remove selected cards from hand (descending order preserves other indices)
    const sortedDesc = [...cardIndices].sort((a, b) => b - a);
    const cards: Card[] = [];
    for (const idx of sortedDesc) {
      cards.unshift(player.hand.splice(idx, 1)[0]);
    }
    this.exchangeSelections.set(playerId, cards);

    if (this.exchangeSelections.size >= this.maxPlayers) {
      this.executeExchange();
    }
    return { success: true };
  }

  private executeExchange(): void {
    const n = this.maxPlayers;
    // Round 1 → right (+1), Round 2 → opposite (+2), Round 3 → left (+n−1)
    const offset = this.exchangeRound === 1 ? 1 : this.exchangeRound === 2 ? 2 : n - 1;

    for (let i = 0; i < n; i++) {
      const cards = this.exchangeSelections.get(this.players[i].id)!;
      const targetIdx = (i + offset) % n;
      this.players[targetIdx].hand.push(...cards);
    }
    this.exchangeSelections = new Map();

    // Reset bid1 state for a fresh bidding round on the same hands
    for (const p of this.players) p.bid1 = undefined;
    this.bid1Passed = new Set();
    this.currentHighBid1 = undefined;
    this.currentHighBidderId = undefined;
    this.awaitingDeclarerConfirm = false;
    this.phase = 'bid1';
    this.currentPlayerIndex = (this.dealerIndex + 1) % n;
  }

  // ── Phase-2 bidding ────────────────────────────────────────────────────────
  private startBid2(): void {
    this.phase = 'bid2';
    const n = this.maxPlayers;

    // Order: declarer first, then clockwise; the last player cannot make total = totalTricks
    const order: string[] = [];
    for (let i = 0; i < n; i++) {
      order.push(this.players[(this.declarerIndex! + i) % n].id);
    }

    this.bid2Order = order;
    this.bid2Cursor = 0;
    this.currentPlayerIndex = this.declarerIndex!;
  }

  /** The trick-count value the LAST phase-2 bidder is FORBIDDEN from bidding */
  get bid2ForbiddenValue(): number | undefined {
    if (this.phase !== 'bid2') return undefined;
    if (this.bid2Cursor !== this.bid2Order.length - 1) return undefined;
    const tt = totalTricks(this.maxPlayers);
    const soFar = this.players.reduce((s, p) => s + (p.bid2 ?? 0), 0);
    return tt - soFar;
  }

  placeBid2(playerId: string, tricks: number): { success: boolean; error?: string } {
    if (this.phase !== 'bid2') return err('Not in bidding phase 2');
    if (this.bid2Order[this.bid2Cursor] !== playerId) return err('Not your turn');
    if (tricks < 0) return err('Bid cannot be negative');

    const tt = totalTricks(this.maxPlayers);
    if (tricks > tt) return err(`Cannot bid more than ${tt} tricks`);

    const forbidden = this.bid2ForbiddenValue;
    if (forbidden !== undefined && tricks === forbidden) {
      return err(`You cannot bid ${forbidden} – that would make the total exactly ${tt}`);
    }

    const player = this.players.find(p => p.id === playerId)!;
    player.bid2 = tricks;
    this.bid2Cursor++;

    if (this.bid2Cursor >= this.bid2Order.length) {
      const totalBid = this.players.reduce((s, p) => s + (p.bid2 ?? 0), 0);
      this.isOverGame = totalBid > tt;
      this.startPlay();
    } else {
      this.currentPlayerIndex = this.players.findIndex(
        p => p.id === this.bid2Order[this.bid2Cursor]
      );
    }
    return { success: true };
  }

  // ── Play ───────────────────────────────────────────────────────────────────
  private startPlay(): void {
    this.phase = 'playing';
    this.currentPlayerIndex = this.declarerIndex!;
    this.trickLeaderIndex = this.declarerIndex!;
    this.currentTrick = [];
  }

  validCardIndices(playerId: string): number[] {
    const p = this.players.find(pl => pl.id === playerId);
    if (!p) return [];

    if (this.currentTrick.length === 0) {
      // Can lead anything
      return p.hand.map((_, i) => i);
    }

    const ledSuit = this.currentTrick[0].card.suit;
    const hasLed = p.hand.some(c => c.suit === ledSuit);
    if (hasLed) return p.hand.map((_, i) => i).filter(i => p.hand[i].suit === ledSuit);
    return p.hand.map((_, i) => i);
  }

  playCard(playerId: string, cardIndex: number): {
    success: boolean; error?: string; trickComplete?: boolean;
  } {
    if (this.phase !== 'playing') return err('Not in play phase');
    if (this.players[this.currentPlayerIndex].id !== playerId) return err('Not your turn');

    const player = this.players[this.currentPlayerIndex];
    if (cardIndex < 0 || cardIndex >= player.hand.length) return err('Invalid card index');

    const valid = this.validCardIndices(playerId);
    if (!valid.includes(cardIndex)) return err('Must follow suit');

    const card = player.hand.splice(cardIndex, 1)[0];
    this.currentTrick.push({ playerId, playerName: player.name, card });

    if (this.currentTrick.length < this.maxPlayers) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.maxPlayers;
      return { success: true, trickComplete: false };
    }

    // Trick complete
    const leadSuit = this.currentTrick[0].card.suit;
    const winnerId = trickWinner(
      this.currentTrick.map(tc => ({ playerId: tc.playerId, card: tc.card })),
      leadSuit,
      this.trumpSuit
    );
    const winner = this.players.find(p => p.id === winnerId)!;
    winner.tricksTaken++;

    this.completedTricks.push({
      cards: [...this.currentTrick],
      winnerId,
      winnerName: winner.name,
      leadSuit,
    });

    this.currentTrick = [];
    // Winner of the trick leads the next one
    this.trickLeaderIndex = this.players.findIndex(p => p.id === winnerId);

    if (player.hand.length === 0) {
      this.endHand();
      return { success: true, trickComplete: true };
    }

    this.currentPlayerIndex = this.trickLeaderIndex;
    return { success: true, trickComplete: true };
  }

  // ── Hand end ───────────────────────────────────────────────────────────────
  private endHand(): void {
    const record: HandRecord = {
      handNumber: this.handNumber,
      trumpSuit: this.trumpSuit!,
      isOverGame: this.isOverGame ?? false,
      results: [],
    };
    for (const p of this.players) {
      const delta = calcScore(p.bid2 ?? 0, p.tricksTaken, this.isOverGame ?? false);
      p.score += delta;
      record.results.push({
        playerId: p.id,
        playerName: p.name,
        bid2: p.bid2 ?? 0,
        tricksTaken: p.tricksTaken,
        scoreDelta: delta,
        scoreAfter: p.score,
      });
    }
    this.handHistory.push(record);
    this.phase = this.handNumber >= this.targetScore ? 'gameOver' : 'handEnd';
    if (this.phase === 'handEnd') {
      this.dealerIndex = (this.dealerIndex + 1) % this.maxPlayers;
    }
  }

  nextHand(): { success: boolean; error?: string } {
    if (this.phase !== 'handEnd') return err('Not at hand end');
    this.startHand();
    return { success: true };
  }

  // ── State for spectator (all hands revealed) ───────────────────────────────
  stateForSpectator(): GameStateView {
    const tt = totalTricks(this.maxPlayers);
    const playerViews: PlayerView[] = this.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      handSize: p.hand.length,
      bid1: p.bid1,
      bid2: p.bid2,
      tricksTaken: p.tricksTaken,
      score: p.score,
      isConnected: p.isConnected,
      isDealer: i === this.dealerIndex,
      isDeclarer: i === this.declarerIndex,
    }));
    const winner =
      this.phase === 'gameOver'
        ? [...playerViews].sort((a, b) => b.score - a.score)[0]
        : undefined;
    return {
      roomId: this.id,
      phase: this.phase,
      myHand: [],
      allHands: this.players.map(p => p.hand),
      isSpectator: true,
      players: playerViews,
      myIndex: -1,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      declarerIndex: this.declarerIndex,
      trumpSuit: this.trumpSuit,
      currentHighBid1: this.currentHighBid1,
      awaitingDeclarerConfirm: this.awaitingDeclarerConfirm || undefined,
      currentTrick: this.currentTrick,
      completedTricks: this.completedTricks,
      trickNumber: this.completedTricks.length + 1,
      handNumber: this.handNumber,
      maxPlayers: this.maxPlayers,
      totalTricks: tt,
      isOverGame: this.isOverGame,
      bid2ForbiddenValue: undefined,
      winner,
      targetScore: this.targetScore,
      handHistory: this.handHistory,
      exchangeRound: this.phase === 'cardExchange' ? this.exchangeRound : undefined,
      exchangePendingCount: this.phase === 'cardExchange' ? this.maxPlayers - this.exchangeSelections.size : undefined,
    };
  }

  // ── State for client ────────────────────────────────────────────────────────
  stateFor(playerId: string): GameStateView {
    const myIndex = this.players.findIndex(p => p.id === playerId);
    const tt = totalTricks(this.maxPlayers);

    const playerViews: PlayerView[] = this.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      handSize: p.hand.length,
      bid1: p.bid1,
      bid2: p.bid2,
      tricksTaken: p.tricksTaken,
      score: p.score,
      isConnected: p.isConnected,
      isDealer: i === this.dealerIndex,
      isDeclarer: i === this.declarerIndex,
    }));

    const winner =
      this.phase === 'gameOver'
        ? [...playerViews].sort((a, b) => b.score - a.score)[0]
        : undefined;

    return {
      roomId: this.id,
      phase: this.phase,
      myHand: myIndex >= 0 ? this.players[myIndex].hand : [],
      players: playerViews,
      myIndex,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      declarerIndex: this.declarerIndex,
      trumpSuit: this.trumpSuit,
      currentHighBid1: this.currentHighBid1,
      awaitingDeclarerConfirm: this.awaitingDeclarerConfirm || undefined,
      currentTrick: this.currentTrick,
      completedTricks: this.completedTricks,
      trickNumber: this.completedTricks.length + 1,
      handNumber: this.handNumber,
      maxPlayers: this.maxPlayers,
      totalTricks: tt,
      isOverGame: this.isOverGame,
      bid2ForbiddenValue: this.bid2ForbiddenValue,
      winner,
      targetScore: this.targetScore,
      handHistory: this.handHistory,
      validCardIndices:
        this.phase === 'playing' && this.players[this.currentPlayerIndex]?.id === playerId
          ? this.validCardIndices(playerId)
          : undefined,
      exchangeRound: this.phase === 'cardExchange' ? this.exchangeRound : undefined,
      exchangeSubmitted: this.phase === 'cardExchange' ? this.exchangeSelections.has(playerId) : undefined,
      exchangePendingCount: this.phase === 'cardExchange' ? this.maxPlayers - this.exchangeSelections.size : undefined,
    };
  }
}

function err(message: string) {
  return { success: false, error: message };
}
