/**
 * Auto-play bot script — spins up 4 socket connections and plays a full game.
 * Run:  node bots.mjs
 */
import { io } from 'socket.io-client';

const SERVER = 'http://localhost:3001';
const NAMES  = ['Alice', 'Bob', 'Carol', 'Dave'];
const TARGET = 100;
const DELAY  = ms => new Promise(r => setTimeout(r, ms));

// ── Suit helpers ─────────────────────────────────────────────────────────────
const SUIT_RANK   = { clubs: 1, diamonds: 2, hearts: 3, spades: 4, notrumps: 5 };
const RANK_VALUE  = { 2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13,A:14 };

function compareBid(a, b) {
  if (a.tricks !== b.tricks) return a.tricks - b.tricks;
  return SUIT_RANK[a.suit] - SUIT_RANK[b.suit];
}

function log(name, msg) {
  const now = new Date().toLocaleTimeString('en', { hour12: false });
  console.log(`[${now}] ${name.padEnd(6)}: ${msg}`);
}

// ── Bot logic ─────────────────────────────────────────────────────────────────
function createBot(name) {
  const sock = io(SERVER, { autoConnect: false });
  let state = null;

  sock.on('gameState', s => { state = s; });
  sock.on('error', ({ message }) => log(name, `⚠ ERROR: ${message}`));

  const myState = () => state;

  // Phase-1 bid: pick the suit we have the most of, bid minTricks+1 or pass if not a good hand
  async function doBid1() {
    const s = myState();
    if (!s || s.phase !== 'bid1') return;
    if (s.players[s.currentPlayerIndex]?.name !== name) return;

    await DELAY(600 + Math.random() * 400);

    const hand = s.myHand;
    const suitCount = { clubs:0, diamonds:0, hearts:0, spades:0 };
    for (const c of hand) suitCount[c.suit]++;

    // pick best suit
    const bestSuit = Object.entries(suitCount).sort((a,b)=>b[1]-a[1])[0][0];
    const bestCount = suitCount[bestSuit];

    const minTricks = s.maxPlayers === 4 ? 5 : 6;
    const currentHigh = s.currentHighBid1;

    // Only bid if we have 4+ cards in a suit; otherwise likely pass
    if (bestCount < 4 && currentHigh) {
      log(name, '→ Phase1 PASS (weak hand)');
      sock.emit('bid1', { action: { type: 'pass' } }, res => {
        if (!res.success) log(name, `bid1 pass rejected: ${res.error}`);
      });
      return;
    }

    // Figure out a valid bid
    let tricks = minTricks;
    let suit   = bestSuit;

    if (currentHigh) {
      // must beat current high
      tricks = currentHigh.tricks;
      suit   = bestSuit;
      const trial = { tricks, suit };
      if (compareBid(trial, currentHigh) <= 0) {
        tricks = currentHigh.tricks + 1;
      }
      if (tricks > s.totalTricks) {
        log(name, '→ Phase1 PASS (cannot outbid)');
        sock.emit('bid1', { action: { type: 'pass' } }, res => {
          if (!res.success) log(name, `bid1 pass rejected: ${res.error}`);
        });
        return;
      }
    }

    log(name, `→ Phase1 BID ${tricks} ${suit}`);
    sock.emit('bid1', { action: { type: 'bid', bid: { tricks, suit } } }, res => {
      if (!res.success) {
        log(name, `bid1 rejected: ${res.error} — passing`);
        sock.emit('bid1', { action: { type: 'pass' } }, () => {});
      }
    });
  }

  // Phase-2 bid: estimate tricks based on high cards
  async function doBid2() {
    const s = myState();
    if (!s || s.phase !== 'bid2') return;
    if (s.players[s.currentPlayerIndex]?.name !== name) return;

    await DELAY(500 + Math.random() * 400);

    const hand = s.myHand;
    const trump = s.trumpSuit;
    let estimate = 0;
    for (const c of hand) {
      const val = RANK_VALUE[c.rank];
      if (c.suit === trump && val >= 11) estimate++;       // J+ in trump
      else if (c.suit !== trump && val >= 13) estimate++;  // K+ in non-trump
    }

    // Clamp to valid range
    const max = s.totalTricks;
    estimate = Math.min(estimate, max);

    // Respect forbidden value
    if (estimate === s.bid2ForbiddenValue) {
      estimate = estimate === 0 ? 1 : estimate - 1;
    }
    // Re-check bounds after adjustment
    estimate = Math.max(0, Math.min(max, estimate));
    if (estimate === s.bid2ForbiddenValue) estimate = estimate + 1 <= max ? estimate + 1 : estimate - 1;

    log(name, `→ Phase2 BID ${estimate} tricks (trump: ${trump})`);
    sock.emit('bid2', { tricks: estimate }, res => {
      if (!res.success) {
        log(name, `bid2 rejected: ${res.error} — bidding 0`);
        const safe = (s.bid2ForbiddenValue === 0) ? 1 : 0;
        sock.emit('bid2', { tricks: safe }, () => {});
      }
    });
  }

  // Play a card — follow suit if possible, else play highest trump or lowest card
  async function doPlay() {
    const s = myState();
    if (!s || s.phase !== 'playing') return;
    if (s.players[s.currentPlayerIndex]?.name !== name) return;

    await DELAY(700 + Math.random() * 500);

    const valid = s.validCardIndices ?? [];
    if (valid.length === 0) return;

    const hand = s.myHand;
    const trump = s.trumpSuit === 'notrumps' ? null : s.trumpSuit;
    const leading = s.currentTrick.length === 0;

    let chosen = valid[0];

    if (leading) {
      // Lead highest card in longest suit (avoid trump early)
      const suits = {};
      for (const i of valid) {
        const c = hand[i];
        if (!suits[c.suit]) suits[c.suit] = [];
        suits[c.suit].push(i);
      }
      const nonTrump = Object.entries(suits).filter(([s]) => s !== trump);
      const target = nonTrump.length ? nonTrump.sort((a,b)=>b[1].length-a[1].length)[0][1] : valid;
      chosen = target.reduce((best, i) =>
        RANK_VALUE[hand[i].rank] > RANK_VALUE[hand[best].rank] ? i : best, target[0]);
    } else {
      // Play highest valid card (simple greedy)
      chosen = valid.reduce((best, i) =>
        RANK_VALUE[hand[i].rank] > RANK_VALUE[hand[best].rank] ? i : best, valid[0]);
    }

    const card = hand[chosen];
    log(name, `→ PLAY ${card.rank}${card.suit[0].toUpperCase()}`);
    sock.emit('playCard', { cardIndex: chosen }, res => {
      if (!res.success) {
        log(name, `playCard rejected: ${res.error}`);
        // fallback: play first valid
        sock.emit('playCard', { cardIndex: valid[0] }, () => {});
      }
    });
  }

  // Poll game state and act appropriately
  async function tick() {
    const s = myState();
    if (!s) return;

    const me = s.players[s.currentPlayerIndex];
    const isMyTurn = me?.name === name;

    if (isMyTurn) {
      if (s.phase === 'bid1')    await doBid1();
      if (s.phase === 'bid2')    await doBid2();
      if (s.phase === 'playing') await doPlay();
    }

    if (s.phase === 'handEnd') {
      // Only player[0] triggers next hand to avoid duplicate calls
      if (s.players[0]?.name === name) {
        await DELAY(2000);
        log(name, '→ Starting next hand…');
        sock.emit('nextHand', res => {
          if (!res.success) log(name, `nextHand rejected: ${res.error}`);
        });
      }
    }

    if (s.phase === 'gameOver') {
      const winner = s.winner;
      log(name, `🏆 GAME OVER — Winner: ${winner?.name} with ${winner?.score} pts`);
      if (name === NAMES[0]) {
        console.log('\n═══ FINAL SCORES ═══');
        [...s.players].sort((a,b)=>b.score-a.score).forEach((p,i)=>{
          const medals = ['🥇','🥈','🥉','4️⃣'];
          console.log(`${medals[i]} ${p.name}: ${p.score}`);
        });
      }
    }
  }

  sock.on('gameState', async () => {
    // Small delay then act so state is committed
    await DELAY(50);
    await tick();
  });

  return { sock, name };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🃏  Israeli Whist — 4 bot players starting…\n');

  const bots = NAMES.map(createBot);

  // Connect all bots
  for (const bot of bots) {
    bot.sock.connect();
    await DELAY(200);
  }

  // Bot 0 creates the room
  const [host, ...guests] = bots;
  let roomId;

  await new Promise(resolve => {
    host.sock.emit(
      'createRoom',
      { playerName: host.name, maxPlayers: 4, targetScore: TARGET },
      res => {
        if (!res.success) { console.error('Create failed:', res.error); process.exit(1); }
        roomId = res.roomId;
        log(host.name, `created room ${roomId}`);
        resolve();
      }
    );
  });

  // Guests join with a small delay each
  for (const bot of guests) {
    await DELAY(300);
    await new Promise(resolve => {
      bot.sock.emit('joinRoom', { roomId, playerName: bot.name }, res => {
        if (!res.success) { console.error(`${bot.name} join failed:`, res.error); process.exit(1); }
        log(bot.name, `joined room ${roomId}`);
        resolve();
      });
    });
  }

  console.log('\n--- Game will start automatically when 4th player joins ---\n');

  // Keep process alive until game over
  await new Promise(resolve => {
    let done = false;
    for (const bot of bots) {
      bot.sock.on('gameState', s => {
        if (s.phase === 'gameOver' && !done) {
          done = true;
          setTimeout(resolve, 3000);
        }
      });
    }
    // Safety timeout 10 min
    setTimeout(resolve, 10 * 60 * 1000);
  });

  console.log('\nBots disconnecting…');
  for (const bot of bots) bot.sock.disconnect();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
