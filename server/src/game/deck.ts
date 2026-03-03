import { Card, Suit, Rank, TrumpSuit } from '../types';

export const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export const RANKS: Rank[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
];

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/** Higher = outranks in bidding (clubs lowest, notrumps highest) */
export const SUIT_BID_RANK: Record<TrumpSuit, number> = {
  clubs: 1, diamonds: 2, hearts: 3, spades: 4, notrumps: 5,
};

export function createDeck(numPlayers: 3 | 4): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      // 3-player game: remove 2♣ so 51 cards ÷ 3 = 17 each
      if (numPlayers === 3 && suit === 'clubs' && rank === '2') continue;
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns total tricks per hand */
export function totalTricks(numPlayers: 3 | 4): number {
  return numPlayers === 4 ? 13 : 17;
}

/**
 * Returns >0 if bid `a` outbids `b`, <0 if `b` outbids `a`, 0 if equal.
 */
export function compareBid(
  a: { tricks: number; suit: TrumpSuit },
  b: { tricks: number; suit: TrumpSuit }
): number {
  if (a.tricks !== b.tricks) return a.tricks - b.tricks;
  return SUIT_BID_RANK[a.suit] - SUIT_BID_RANK[b.suit];
}

/** Returns the winning player ID for the completed trick */
export function trickWinner(
  trick: { playerId: string; card: Card }[],
  leadSuit: Suit,
  trump: TrumpSuit | undefined
): string {
  const effectiveTrump = trump === 'notrumps' ? undefined : trump;

  let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const c = trick[i].card;
    const b = best.card;

    const cTrump = effectiveTrump && c.suit === effectiveTrump;
    const bTrump = effectiveTrump && b.suit === effectiveTrump;
    const cLed = c.suit === leadSuit;
    const bLed = b.suit === leadSuit;

    if (cTrump && bTrump) {
      if (RANK_VALUE[c.rank] > RANK_VALUE[b.rank]) best = trick[i];
    } else if (cTrump) {
      best = trick[i];
    } else if (!bTrump && cLed && bLed) {
      if (RANK_VALUE[c.rank] > RANK_VALUE[b.rank]) best = trick[i];
    } else if (!bTrump && cLed) {
      best = trick[i];
    }
  }
  return best.playerId;
}
