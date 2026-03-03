import { useState } from 'react';
import { GameStateView, PlayerView, SUIT_SYMBOL, TRUMP_LABEL } from '../types';
import { socket } from '../socket';
import CardComponent, { CardBack } from './CardComponent';
import BidPhase1 from './BidPhase1';
import BidPhase2 from './BidPhase2';
import TrickArea from './TrickArea';
import Scoreboard from './Scoreboard';
import HandSummary from './HandSummary';
import GameOver from './GameOver';

interface Props {
  state: GameStateView;
  playerName: string;
  onError: (msg: string) => void;
}

// ── Small badge shown above each opponent position ─────────────────────────
function OpponentInfo({ player, isActive, totalTricks }: { player: PlayerView; isActive: boolean; totalTricks: number }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all
      ${isActive ? 'border-yellow-400 bg-yellow-400/10 animate-pulse-glow' : 'border-slate-700 bg-slate-900/60'}`}>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="text-white font-semibold text-sm max-w-[80px] truncate">{player.name}</span>
        {player.isDealer && <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded">D</span>}
        {player.isDeclarer && <span className="text-[10px] bg-yellow-800 text-yellow-300 px-1 rounded">★</span>}
      </div>
      <div className="flex gap-2 text-xs text-slate-400">
        {player.bid2 !== undefined && (
          <span>bid <span className="text-white font-bold">{player.bid2}</span></span>
        )}
        {player.tricksTaken > 0 && (
          <span className="text-emerald-400 font-bold">✓{player.tricksTaken}</span>
        )}
      </div>
      <div className="hand-fan flex mt-1">
        {Array.from({ length: player.handSize }).map((_, i) => (
          <CardBack key={i} tiny />
        ))}
      </div>
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────
export default function GameBoard({ state, onError }: Props) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const {
    phase, myHand, players, myIndex, currentPlayerIndex,
    trumpSuit, currentHighBid1, currentTrick, completedTricks,
    totalTricks, trickNumber, handNumber, bid2ForbiddenValue,
  } = state;

  const isMyTurn = myIndex === currentPlayerIndex;
  const me = players[myIndex];
  const lastTrick = completedTricks[completedTricks.length - 1];

  // Sort hand by suit (♠♥♦♣) then rank (2→A), keeping original server indices
  const SUIT_ORDER: Record<string, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
  const RANK_ORDER: Record<string, number> = {
    '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12,
  };
  const sortedHand = myHand
    .map((card, originalIndex) => ({ card, originalIndex }))
    .sort((a, b) => {
      const sd = SUIT_ORDER[a.card.suit] - SUIT_ORDER[b.card.suit];
      return sd !== 0 ? sd : RANK_ORDER[a.card.rank] - RANK_ORDER[b.card.rank];
    });

  // Arrange opponents relative to me
  const opponents: { player: PlayerView; position: 'top' | 'left' | 'right' }[] = [];
  const n = players.length;
  if (n === 4) {
    const positions: ('left' | 'top' | 'right')[] = ['left', 'top', 'right'];
    for (let i = 0; i < 3; i++) {
      opponents.push({ player: players[(myIndex + i + 1) % n], position: positions[i] });
    }
  } else {
    // 3 players
    opponents.push(
      { player: players[(myIndex + 1) % n], position: 'left' },
      { player: players[(myIndex + 2) % n], position: 'right' }
    );
  }

  const opTop = opponents.find(o => o.position === 'top')?.player;
  const opLeft = opponents.find(o => o.position === 'left')?.player;
  const opRight = opponents.find(o => o.position === 'right')?.player;

  // Play a card
  const handlePlayCard = (idx: number) => {
    if (phase !== 'playing' || !isMyTurn) return;
    const valid = state.validCardIndices ?? [];
    if (!valid.includes(idx)) { onError('You must follow the led suit'); return; }

    if (selectedCardIndex === idx) {
      // Double-click / second tap → confirm play
      socket.emit('playCard', { cardIndex: idx }, res => {
        if (!res.success) onError(res.error ?? 'Cannot play that card');
        setSelectedCardIndex(null);
      });
    } else {
      setSelectedCardIndex(idx);
    }
  };

  const confirmPlay = () => {
    if (selectedCardIndex === null) return;
    socket.emit('playCard', { cardIndex: selectedCardIndex }, res => {
      if (!res.success) onError(res.error ?? 'Cannot play that card');
      setSelectedCardIndex(null);
    });
  };

  const minBidTricks = state.maxPlayers === 4 ? 5 : 6;

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-700/50 text-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">Hand <span className="text-white font-bold">{handNumber}</span> / {state.targetScore}</span>
          {trumpSuit && (
            <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-700/50 px-2 py-0.5 rounded-full font-semibold">
              Trump: {TRUMP_LABEL[trumpSuit]}
            </span>
          )}
          {state.isOverGame !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
              ${state.isOverGame ? 'bg-orange-900/40 text-orange-300 border-orange-700/50' : 'bg-sky-900/40 text-sky-300 border-sky-700/50'}`}>
              {state.isOverGame ? 'Over' : 'Under'}
            </span>
          )}
          {phase === 'playing' && (
            <span className="text-slate-400">Trick <span className="text-white font-bold">{trickNumber}</span>/{totalTricks}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Phase label */}
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
            ${phase === 'bid1' ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50' :
              phase === 'bid2' ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50' :
              phase === 'playing' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' :
              'bg-slate-800 text-slate-400 border border-slate-600'
            }`}>
            {phase === 'bid1' ? '🎯 Trump Bid' :
             phase === 'bid2' ? '🔢 Trick Bid' :
             phase === 'playing' ? '🃏 Playing' :
             phase}
          </span>
          <button
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-600 transition-colors"
            onClick={() => setShowScoreboard(s => !s)}
          >
            {showScoreboard ? 'Hide' : 'Scores'}
          </button>
        </div>
      </div>

      {/* ── Main table layout ── */}
      <div className="flex-1 flex flex-col items-center justify-between py-3 px-4 relative min-h-0 overflow-hidden">

        {/* ── TOP opponent ── */}
        {opTop && (
          <div className="flex-shrink-0">
            <OpponentInfo
              player={opTop}
              isActive={players[currentPlayerIndex]?.id === opTop.id}
              totalTricks={totalTricks}
            />
          </div>
        )}

        {/* ── Middle row: left | center | right ── */}
        <div className="flex items-center justify-center gap-4 flex-1 min-h-0 w-full">
          {/* Left opponent */}
          {opLeft && (
            <div className="flex-shrink-0">
              <OpponentInfo
                player={opLeft}
                isActive={players[currentPlayerIndex]?.id === opLeft.id}
                totalTricks={totalTricks}
              />
            </div>
          )}

          {/* Center: trick area + bidding */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3 min-w-0">
            {/* Trick area */}
            <div className="bg-felt-dark/80 rounded-2xl p-4 min-w-[200px] min-h-[140px] flex items-center justify-center shadow-inner border border-felt-dark/40">
              <TrickArea
                currentTrick={currentTrick}
                lastTrick={lastTrick}
                maxPlayers={n}
                playerNames={players.map(p => p.name)}
                myIndex={myIndex}
              />
            </div>

            {/* Bidding panels */}
            {(phase === 'bid1' || phase === 'bid2') && (
              <div className="flex items-center justify-center">
                {phase === 'bid1' ? (
                  <BidPhase1
                    minTricks={minBidTricks}
                    maxTricks={totalTricks}
                    currentHighBid={currentHighBid1}
                    isMyTurn={isMyTurn}
                    onError={onError}
                  />
                ) : (
                  <BidPhase2
                    totalTricks={totalTricks}
                    forbiddenValue={isMyTurn ? bid2ForbiddenValue : undefined}
                    isMyTurn={isMyTurn}
                    onError={onError}
                  />
                )}
              </div>
            )}

            {/* Whose turn indicator during play */}
            {phase === 'playing' && !isMyTurn && (
              <div className="bg-slate-900/80 rounded-lg px-4 py-2 border border-slate-700 text-sm text-slate-300 animate-pulse">
                <span className="text-emerald-400 font-semibold">{players[currentPlayerIndex]?.name}</span>'s turn
              </div>
            )}

            {/* Confirm play button */}
            {phase === 'playing' && isMyTurn && selectedCardIndex !== null && (
              <button className="btn-primary animate-slide-up px-8 py-2.5" onClick={confirmPlay}>
                Play Card ✓
              </button>
            )}

            {phase === 'playing' && isMyTurn && selectedCardIndex === null && (
              <div className="text-emerald-400 font-semibold text-sm animate-pulse">
                Your turn — select a card
              </div>
            )}
          </div>

          {/* Right opponent */}
          {opRight && (
            <div className="flex-shrink-0">
              <OpponentInfo
                player={opRight}
                isActive={players[currentPlayerIndex]?.id === opRight.id}
                totalTricks={totalTricks}
              />
            </div>
          )}
        </div>

        {/* ── MY INFO + HAND ── */}
        <div className="flex-shrink-0 w-full flex flex-col items-center gap-2">
          {/* My info bar */}
          {me && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-sm
              ${isMyTurn && phase === 'playing' ? 'border-yellow-400 bg-yellow-400/10 animate-pulse-glow' : 'border-slate-700 bg-slate-900/60'}`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 font-bold">{me.name}</span>
                {me.isDealer && <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded">D</span>}
                {me.isDeclarer && <span className="text-[10px] bg-yellow-800 text-yellow-300 px-1 rounded">★ Declarer</span>}
              </div>
              <div className="flex gap-3 text-slate-400 text-xs">
                <span>Score: <span className={`font-bold ${me.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{me.score}</span></span>
                {me.bid2 !== undefined && (
                  <span>Bid: <span className="text-white font-bold">{me.bid2}</span></span>
                )}
                {me.tricksTaken > 0 && (
                  <span>Won: <span className={`font-bold ${me.tricksTaken === me.bid2 ? 'text-emerald-400' : 'text-orange-400'}`}>{me.tricksTaken}</span></span>
                )}
              </div>
              {trumpSuit && (
                <span className="text-xs text-slate-500">
                  Trump: <span className="font-medium text-yellow-400">{SUIT_SYMBOL[trumpSuit as never] ?? trumpSuit}</span>
                </span>
              )}
            </div>
          )}

          {/* My hand — sorted by suit then rank */}
          {sortedHand.length > 0 && (
            <div className="hand-fan flex items-end justify-center pb-1 overflow-visible">
              {sortedHand.map(({ card, originalIndex }) => {
                const isPlayable = phase === 'playing' && isMyTurn && (state.validCardIndices?.includes(originalIndex) ?? false);
                const isSelected = selectedCardIndex === originalIndex;
                const isDisabled = phase === 'playing' && isMyTurn && !isPlayable;

                return (
                  <CardComponent
                    key={`${card.rank}-${card.suit}-${originalIndex}`}
                    card={card}
                    selected={isSelected}
                    playable={isPlayable && !isSelected}
                    disabled={isDisabled}
                    onClick={() => handlePlayCard(originalIndex)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Scoreboard overlay ── */}
        {showScoreboard && (
          <div className="absolute top-0 right-0 z-30 w-64 p-2" onClick={e => e.stopPropagation()}>
            <Scoreboard
              players={players}
              myIndex={myIndex}
              trumpSuit={trumpSuit}
              targetScore={state.targetScore}
              isOverGame={state.isOverGame}
              handNumber={handNumber}
              totalTricks={totalTricks}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {phase === 'handEnd' && (
        <HandSummary state={state} onError={onError} />
      )}
      {phase === 'gameOver' && (
        <GameOver state={state} />
      )}
    </div>
  );
}
