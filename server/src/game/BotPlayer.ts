import { WhistGame } from './Game';
import { Bid1Action, Card, Suit, TrumpSuit } from '../types';

const RANK_VALUE: Record<string, number> = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,
  '9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,
};
const SUIT_BID_RANK: Record<string, number> = {
  clubs:1, diamonds:2, hearts:3, spades:4, notrumps:5,
};
const ALL_SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

function compareBid(a: {tricks:number;suit:string}, b: {tricks:number;suit:string}) {
  if (a.tricks !== b.tricks) return a.tricks - b.tricks;
  return SUIT_BID_RANK[a.suit] - SUIT_BID_RANK[b.suit];
}

function rv(card: Card) { return RANK_VALUE[card.rank]; }

// ── Trick estimation ─────────────────────────────────────────────────────────
// Returns the expected number of tricks this hand can win given a trump suit.
function estimateTricks(hand: Card[], trump: Suit | null): number {
  const bySuit: Partial<Record<Suit, Card[]>> = {};
  for (const c of hand) {
    if (!bySuit[c.suit]) bySuit[c.suit] = [];
    bySuit[c.suit]!.push(c);
  }

  let total = 0;

  for (const suit of ALL_SUITS) {
    const cards = (bySuit[suit] ?? []).slice().sort((a, b) => rv(b) - rv(a));
    const len = cards.length;
    const isTrump = suit === trump;

    // Honor tricks
    for (let i = 0; i < cards.length; i++) {
      const val = rv(cards[i]);
      if (val === 14) {
        total += 1.0;                              // Ace always wins
      } else if (val === 13) {
        total += len >= 2 ? 0.85 : 0.35;          // King: protected vs bare
      } else if (val === 12) {
        total += len >= 3 ? 0.55 : len === 2 ? 0.25 : 0.1;
      } else if (val === 11) {
        total += len >= 4 ? 0.3 : 0.1;
      }
      // Long trump tricks beyond 4
      if (isTrump && i >= 4) total += 0.7;
    }

    // Ruffing potential: short side suits let us use small trumps
    if (trump && !isTrump) {
      if (len === 0) total += 1.2;   // void: guaranteed ruff
      else if (len === 1) total += 0.7;  // singleton: likely ruff
      else if (len === 2) total += 0.25; // doubleton: possible ruff
    }
  }

  return Math.min(total, hand.length);
}

// ── Card exchange decision ────────────────────────────────────────────────────
export function chooseExchangeCards(game: WhistGame, botId: string): number[] {
  const player = game.players.find(p => p.id === botId)!;
  // Pass the 3 lowest-value cards
  return player.hand
    .map((card, i) => ({ i, val: RANK_VALUE[card.rank] }))
    .sort((a, b) => a.val - b.val)
    .slice(0, 3)
    .map(x => x.i);
}

// ── Phase-1 bid decision ─────────────────────────────────────────────────────
export function chooseBid1(game: WhistGame, botId: string): Bid1Action {
  // When the bot won Phase 1 and is asked to confirm or raise, always confirm
  if (game.awaitingDeclarerConfirm) return { type: 'pass' };

  const player = game.players.find(p => p.id === botId)!;
  const hand = player.hand;
  const minTricks = game.maxPlayers === 4 ? 5 : 6;
  const currentHigh = game.currentHighBid1;

  // Evaluate expected tricks for each possible trump suit
  let bestSuit: TrumpSuit = 'clubs';
  let bestExpected = -1;

  for (const suit of ([...ALL_SUITS, 'notrumps'] as TrumpSuit[])) {
    const trump = suit === 'notrumps' ? null : suit;
    const expected = estimateTricks(hand, trump);
    // Notrumps needs a very strong hand
    const adjusted = suit === 'notrumps' ? expected - 1 : expected;
    if (adjusted > bestExpected) {
      bestExpected = adjusted;
      bestSuit = suit;
    }
  }

  const canWin = Math.floor(bestExpected);

  if (currentHigh) {
    // Only raise if we genuinely expect to cover the new bid
    const minNeeded = currentHigh.tricks + 1;
    if (canWin < minNeeded) return { type: 'pass' };

    // Bid just enough to outbid
    const tryBid = { tricks: currentHigh.tricks, suit: bestSuit };
    const finalBid = compareBid(tryBid, currentHigh) <= 0
      ? { tricks: currentHigh.tricks + 1, suit: bestSuit }
      : tryBid;

    if (finalBid.tricks > canWin) return { type: 'pass' };
    return { type: 'bid', bid: { tricks: finalBid.tricks, suit: finalBid.suit as TrumpSuit } };
  }

  // Opening bid: only if hand is strong enough
  if (canWin < minTricks) return { type: 'pass' };

  // Open conservatively at the minimum, or one above if very strong
  const openTricks = canWin >= minTricks + 2 ? minTricks + 1 : minTricks;
  return { type: 'bid', bid: { tricks: openTricks, suit: bestSuit } };
}

// ── Phase-2 bid decision ─────────────────────────────────────────────────────
export function chooseBid2(game: WhistGame, botId: string): number {
  const player = game.players.find(p => p.id === botId)!;
  const hand = player.hand;
  const trump = game.trumpSuit;
  const effectiveTrump = trump === 'notrumps' ? null : (trump ?? null);
  const tt = hand.length + game.completedTricks.length;

  let estimate = Math.round(estimateTricks(hand, effectiveTrump));
  estimate = Math.max(0, Math.min(tt, estimate));

  // Avoid forbidden value
  const forbidden = game.bid2ForbiddenValue;
  if (estimate === forbidden) {
    const lower = estimate - 1;
    const higher = estimate + 1;
    if (lower >= 0 && lower !== forbidden) estimate = lower;
    else if (higher <= tt && higher !== forbidden) estimate = higher;
  }

  return Math.max(0, Math.min(tt, estimate));
}

// ── Card play decision ───────────────────────────────────────────────────────
export function chooseCard(game: WhistGame, botId: string): number {
  const valid = game.validCardIndices(botId);
  if (valid.length === 1) return valid[0];

  const player = game.players.find(p => p.id === botId)!;
  const hand = player.hand;
  const trump: Suit | null = game.trumpSuit === 'notrumps' ? null : (game.trumpSuit ?? null) as Suit | null;
  const trick = game.currentTrick;
  const leading = trick.length === 0;

  const needMore = player.tricksTaken < (player.bid2 ?? 0);
  const satisfied = player.tricksTaken >= (player.bid2 ?? 0);

  if (leading) {
    return leadCard(hand, valid, trump, needMore);
  } else {
    return followCard(hand, valid, trump, trick, needMore, satisfied);
  }
}

function rankOfIdx(hand: Card[], i: number) { return RANK_VALUE[hand[i].rank]; }

function leadCard(
  hand: Card[], valid: number[], trump: Suit | null, needMore: boolean
): number {
  if (needMore) {
    // Lead a strong non-trump card (A or K) first
    const nonTrump = valid.filter(i => hand[i].suit !== trump);
    const strong = nonTrump.filter(i => rankOfIdx(hand, i) >= 13);
    if (strong.length > 0) {
      return strong.reduce((a, b) => rankOfIdx(hand, a) > rankOfIdx(hand, b) ? a : b);
    }
    // Otherwise lead highest available
    return valid.reduce((a, b) => rankOfIdx(hand, a) > rankOfIdx(hand, b) ? a : b);
  } else {
    // Don't need tricks: lead lowest non-trump to avoid accidentally winning
    const nonTrump = valid.filter(i => hand[i].suit !== trump);
    const pool = nonTrump.length > 0 ? nonTrump : valid;
    return pool.reduce((a, b) => rankOfIdx(hand, a) < rankOfIdx(hand, b) ? a : b);
  }
}

function followCard(
  hand: Card[],
  valid: number[],
  trump: Suit | null,
  trick: { card: Card }[],
  needMore: boolean,
  satisfied: boolean
): number {
  const ledSuit = trick[0].card.suit;
  const mustFollow = valid.some(i => hand[i].suit === ledSuit);

  // Determine current trick winner rank
  const trickCards = trick.map(t => t.card);
  const trumpsPlayed = trump ? trickCards.filter(c => c.suit === trump) : [];
  const currentWinRank = trumpsPlayed.length > 0
    ? Math.max(...trumpsPlayed.map(c => RANK_VALUE[c.rank]))
    : Math.max(...trickCards.filter(c => c.suit === ledSuit).map(c => RANK_VALUE[c.rank]));
  const winnerIsTrump = trumpsPlayed.length > 0;

  if (mustFollow) {
    // Partition into cards that beat the current winner vs. losers
    const winners = valid.filter(i => {
      const c = hand[i];
      if (winnerIsTrump) return c.suit === trump && rv(c) > currentWinRank;
      return c.suit === ledSuit && rv(c) > currentWinRank;
    });

    if (needMore && winners.length > 0) {
      // Win with the cheapest winning card
      return winners.reduce((a, b) => rankOfIdx(hand, a) < rankOfIdx(hand, b) ? a : b);
    }
    // Can't or don't want to win: throw lowest card
    return valid.reduce((a, b) => rankOfIdx(hand, a) < rankOfIdx(hand, b) ? a : b);
  } else {
    // Void in led suit
    const trumpCards = trump ? valid.filter(i => hand[i].suit === trump) : [];
    const nonTrump = valid.filter(i => hand[i].suit !== trump);

    if (needMore && trumpCards.length > 0) {
      if (winnerIsTrump) {
        // Only over-ruff if possible
        const overRuff = trumpCards.filter(i => rankOfIdx(hand, i) > currentWinRank);
        if (overRuff.length > 0) {
          return overRuff.reduce((a, b) => rankOfIdx(hand, a) < rankOfIdx(hand, b) ? a : b);
        }
      } else {
        // No trump in trick yet: ruff with lowest trump
        return trumpCards.reduce((a, b) => rankOfIdx(hand, a) < rankOfIdx(hand, b) ? a : b);
      }
    }

    // Discard: throw lowest non-trump, or lowest trump if no choice
    const discard = nonTrump.length > 0 ? nonTrump : valid;
    return discard.reduce((a, b) => rankOfIdx(hand, a) < rankOfIdx(hand, b) ? a : b);
  }
}
