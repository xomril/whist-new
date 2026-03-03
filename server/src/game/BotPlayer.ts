import { WhistGame } from './Game';
import { Bid1Action } from '../types';

const RANK_VALUE: Record<string, number> = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,
  '9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,
};
const SUIT_BID_RANK: Record<string, number> = {
  clubs:1, diamonds:2, hearts:3, spades:4, notrumps:5,
};

function compareBid(a:{tricks:number;suit:string}, b:{tricks:number;suit:string}) {
  if (a.tricks !== b.tricks) return a.tricks - b.tricks;
  return SUIT_BID_RANK[a.suit] - SUIT_BID_RANK[b.suit];
}

// ── Phase-1 bid decision ─────────────────────────────────────────────────────
export function chooseBid1(game: WhistGame, botId: string): Bid1Action {
  const player = game.players.find(p => p.id === botId)!;
  const hand = player.hand;

  // Count cards per suit
  const suitCount: Record<string,number> = { clubs:0, diamonds:0, hearts:0, spades:0 };
  for (const c of hand) suitCount[c.suit]++;

  const bestSuit = Object.entries(suitCount).sort((a,b) => b[1]-a[1])[0][0];
  const bestCount = suitCount[bestSuit];

  const minTricks = game.maxPlayers === 4 ? 5 : 6;
  const currentHigh = game.currentHighBid1;

  // Weak hand with an existing bid → pass
  if (bestCount < 4 && currentHigh) {
    return { type: 'pass' };
  }

  // Build a trial bid
  let tricks = minTricks;
  let suit   = bestSuit;

  if (currentHigh) {
    tricks = currentHigh.tricks;
    suit   = bestSuit;
    // Must strictly outbid
    if (compareBid({ tricks, suit }, currentHigh) <= 0) {
      tricks = currentHigh.tricks + 1;
    }
    if (tricks > game.players[0].hand.length + game.completedTricks.length) {
      return { type: 'pass' };
    }
  }

  return { type: 'bid', bid: { tricks, suit: suit as any } };
}

// ── Phase-2 bid decision ─────────────────────────────────────────────────────
export function chooseBid2(game: WhistGame, botId: string): number {
  const player = game.players.find(p => p.id === botId)!;
  const hand = player.hand;
  const trump = game.trumpSuit;

  const effectiveTrump = trump === 'notrumps' ? null : trump;
  let estimate = 0;
  for (const c of hand) {
    const val = RANK_VALUE[c.rank];
    if (effectiveTrump && c.suit === effectiveTrump && val >= 11) estimate++;
    else if (val >= 13) estimate++;
  }

  const tt = game.players[0].hand.length + game.completedTricks.length;
  estimate = Math.min(estimate, tt);

  const forbidden = game.bid2ForbiddenValue;
  if (estimate === forbidden) {
    estimate = estimate > 0 ? estimate - 1 : estimate + 1;
  }
  estimate = Math.max(0, Math.min(tt, estimate));
  if (estimate === forbidden) {
    estimate = estimate + 1 <= tt ? estimate + 1 : estimate - 1;
  }

  return Math.max(0, estimate);
}

// ── Card play decision ───────────────────────────────────────────────────────
export function chooseCard(game: WhistGame, botId: string): number {
  const valid = game.validCardIndices(botId);
  if (valid.length === 0) return 0;

  const player = game.players.find(p => p.id === botId)!;
  const hand = player.hand;
  const trump: string | null = game.trumpSuit === 'notrumps' ? null : (game.trumpSuit ?? null);
  const leading = game.currentTrick.length === 0;

  if (leading) {
    // Lead highest card in longest non-trump suit
    const suits: Record<string, number[]> = {};
    for (const i of valid) {
      const s = hand[i].suit;
      if (!suits[s]) suits[s] = [];
      suits[s].push(i);
    }
    const nonTrump = Object.entries(suits).filter(([s]) => s !== trump);
    const pool = nonTrump.length
      ? nonTrump.sort((a,b) => b[1].length - a[1].length)[0][1]
      : valid;
    return pool.reduce((best, i) =>
      RANK_VALUE[hand[i].rank] > RANK_VALUE[hand[best].rank] ? i : best, pool[0]);
  }

  // Following: play highest valid card (greedy)
  return valid.reduce((best, i) =>
    RANK_VALUE[hand[i].rank] > RANK_VALUE[hand[best].rank] ? i : best, valid[0]);
}
