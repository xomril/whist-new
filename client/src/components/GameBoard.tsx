import { useEffect, useRef, useState } from 'react';
import { GameStateView, PlayerView, SUIT_SYMBOL } from '../types';
import { socket } from '../socket';
import { useT, LangToggle } from '../i18n';
import { sfxPlayCard, sfxTurnReminder } from '../sounds';
import CardComponent, { CardBack } from './CardComponent';
import BidPhase1 from './BidPhase1';
import BidPhase2 from './BidPhase2';
import CardExchange from './CardExchange';
import TrickArea from './TrickArea';
import Scoreboard from './Scoreboard';
import HandSummary from './HandSummary';
import GameOver from './GameOver';
import HistoryModal from './HistoryModal';

interface Props {
  state: GameStateView;
  playerName: string;
  zoomLink?: string;
  onError: (msg: string) => void;
}

// ── Small badge shown above each opponent position ─────────────────────────
function OpponentInfo({ player, isActive, totalTricks, isHost, roomId, onError }: {
  player: PlayerView; isActive: boolean; totalTricks: number;
  isHost: boolean; roomId: string; onError: (msg: string) => void;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all
      ${isActive ? 'border-yellow-400 bg-yellow-400/10 animate-pulse-glow' : 'border-slate-700 bg-slate-900/60'}`}>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="text-white font-semibold text-sm max-w-[80px] truncate">{player.name}</span>
        <span className={`text-xs font-bold ${player.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{player.score}</span>
        {player.clownCount === 1 && <span title="Got cut once">🤡</span>}
        {player.clownCount >= 2 && <span title={`Got cut ${player.clownCount} times`} className="text-xs">🤡×{player.clownCount}</span>}
        {player.isDealer && <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded">D</span>}
        {player.isDeclarer && <span className="text-[10px] bg-yellow-800 text-yellow-300 px-1 rounded">★</span>}
        {isHost && (
          <button
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors
              ${player.isConnected
                ? 'bg-slate-700/50 hover:bg-red-700/70 text-slate-500 hover:text-white border-slate-600/50 hover:border-red-700/50'
                : 'bg-red-900/50 hover:bg-red-700/70 text-red-400 hover:text-white border-red-700/50'}`}
            title="Kick (allow rejoin)"
            onClick={() => socket.emit('kickFromGame', { roomId, targetId: player.id }, res => {
              if (!res.success) onError(res.error ?? 'Failed to kick');
            })}
          >
            ✕
          </button>
        )}
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
export default function GameBoard({ state, zoomLink, onError }: Props) {
  const { t, tTrump } = useT();
  const isHost = state.hostId === socket.id;
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [exchangeSelected, setExchangeSelected] = useState<number[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLastTrick, setShowLastTrick] = useState(false);
  const [showTurnReminder, setShowTurnReminder] = useState(false);
  const [receivedCards, setReceivedCards] = useState<{ cards: import('../types').Card[]; fromName: string } | null>(null);
  const handAfterSubmitRef = useRef<import('../types').Card[] | null>(null);
  const exchangeRoundRef = useRef<number>(1);

  const {
    phase, myHand, players, myIndex, currentPlayerIndex,
    trumpSuit, currentHighBid1, currentTrick, completedTricks,
    totalTricks, trickNumber, handNumber, bid2ForbiddenValue,
  } = state;

  const isMyTurn = myIndex === currentPlayerIndex;

  // 30-second idle reminder
  useEffect(() => {
    const activeTurnPhases = ['bid1', 'bid2', 'playing', 'cardExchange'];
    if (!isMyTurn || state.isSpectator || !activeTurnPhases.includes(phase)) {
      setShowTurnReminder(false);
      return;
    }
    setShowTurnReminder(false); // reset on every new turn
    const id = setTimeout(() => {
      setShowTurnReminder(true);
      sfxTurnReminder();
    }, 30_000);
    return () => clearTimeout(id);
  }, [isMyTurn, currentPlayerIndex, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  // Track the hand right after submitting exchange (3 given cards already removed server-side)
  useEffect(() => {
    if (phase === 'cardExchange' && state.exchangeSubmitted && !handAfterSubmitRef.current) {
      handAfterSubmitRef.current = [...myHand];
      exchangeRoundRef.current = state.exchangeRound ?? 1;
    }
    // When exchange completes and bid1 starts, diff to find received cards
    if (phase === 'bid1' && handAfterSubmitRef.current) {
      const prev = handAfterSubmitRef.current;
      const received = myHand.filter(c => !prev.some((pc: import('../types').Card) => pc.rank === c.rank && pc.suit === c.suit));
      if (received.length > 0) {
        const n = players.length;
        const offset = exchangeRoundRef.current === 1 ? 1 : exchangeRoundRef.current === 2 ? 2 : n - 1;
        const sourceIndex = (myIndex + n - offset) % n;
        const fromName = players[sourceIndex]?.name ?? '';
        setReceivedCards({ cards: received, fromName });
      }
      handAfterSubmitRef.current = null;
    }
  }, [phase, state.exchangeSubmitted]); // eslint-disable-line react-hooks/exhaustive-deps

  const me = players[myIndex];
  const lastTrick = completedTricks[completedTricks.length - 1];

  // Sort hand by suit (♠♥♦♣) then rank (2→A), keeping original server indices
  const SUIT_ORDER: Record<string, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
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
        else sfxPlayCard();
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
      else sfxPlayCard();
      setSelectedCardIndex(null);
    });
  };

  const handleExchangeToggle = (idx: number) => {
    setExchangeSelected(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleExchangeSubmit = () => {
    socket.emit('submitExchange', { cardIndices: exchangeSelected }, res => {
      if (!res.success) onError(res.error ?? 'Cannot submit exchange');
      else setExchangeSelected([]);
    });
  };

  const minBidTricks = state.maxPlayers === 4 ? 5 : 6;

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-700/50 text-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">{t('handOf', handNumber, state.targetScore)}</span>
          {trumpSuit && (
            <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-700/50 px-2 py-0.5 rounded-full font-semibold">
              {t('trump', tTrump(trumpSuit))}
            </span>
          )}
          {state.isOverGame !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
              ${state.isOverGame ? 'bg-orange-900/40 text-orange-300 border-orange-700/50' : 'bg-sky-900/40 text-sky-300 border-sky-700/50'}`}>
              {state.isOverGame ? t('over') : t('under')}
            </span>
          )}
          {phase === 'playing' && (
            <span className="text-slate-400">{t('trick', trickNumber, totalTricks)}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Phase label */}
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
            ${phase === 'bid1' ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50' :
              phase === 'cardExchange' ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50' :
              phase === 'bid2' ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50' :
              phase === 'playing' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' :
              'bg-slate-800 text-slate-400 border border-slate-600'
            }`}>
            {phase === 'bid1' ? t('phase1Bid') :
             phase === 'cardExchange' ? t('exchangeRoundLabel') :
             phase === 'bid2' ? t('phase2Bid') :
             phase === 'playing' ? t('phasePlay') :
             phase}
          </span>
          <LangToggle />
          {zoomLink && (
            <a
              href={zoomLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded border text-xs font-semibold bg-blue-700/80 hover:bg-blue-600 border-blue-500/60 text-white transition-colors"
            >
              📹 Zoom
            </a>
          )}
          {isHost && players.find(p => p.id === state.hostId)?.name === 'Omri' && (
            <button
              className={`px-2 py-0.5 rounded border text-xs font-semibold transition-colors
                ${state.cheatMode
                  ? 'bg-yellow-500/30 border-yellow-500/60 text-yellow-300 hover:bg-yellow-500/20'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              title="Debug mode: you get A K Q J of ♠♥ every hand"
              onClick={() => socket.emit('toggleCheatMode', { roomId: state.roomId }, () => {})}
            >
              {state.cheatMode ? '🃏 Debug ON' : '🃏 Debug'}
            </button>
          )}
          {lastTrick && (
            <button
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-600 transition-colors"
              onClick={() => setShowLastTrick(s => !s)}
            >
              {t('lastTrickBtn')}
            </button>
          )}
          <button
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-600 transition-colors"
            onClick={() => setShowHistory(true)}
          >
            {t('historyBtn')}
          </button>
          <button
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-600 transition-colors"
            onClick={() => setShowScoreboard(s => !s)}
          >
            {t('colScore')}
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
              isHost={isHost}
              roomId={state.roomId}
              onError={onError}
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
                isHost={isHost}
                roomId={state.roomId}
                onError={onError}
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
                    isDeclarerConfirm={state.awaitingDeclarerConfirm && isMyTurn}
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
                {t('sTurn', players[currentPlayerIndex]?.name ?? '')}
              </div>
            )}

            {phase === 'playing' && isMyTurn && selectedCardIndex !== null && (
              <button className="btn-primary animate-slide-up px-8 py-2.5" onClick={confirmPlay}>
                ✓
              </button>
            )}

            {phase === 'playing' && isMyTurn && selectedCardIndex === null && (
              <div className="text-emerald-400 font-semibold text-sm animate-pulse">
                {t('turnToBid', me?.name ?? '')}
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
                isHost={isHost}
                roomId={state.roomId}
                onError={onError}
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
                {me.clownCount === 1 && <span title="Got cut once">🤡</span>}
                {me.clownCount >= 2 && <span title={`Got cut ${me.clownCount} times`} className="text-xs">🤡×{me.clownCount}</span>}
                {me.isDealer && <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded">D</span>}
                {me.isDeclarer && <span className="text-[10px] bg-yellow-800 text-yellow-300 px-1 rounded">★ Declarer</span>}
              </div>
              <div className="flex gap-3 text-slate-400 text-xs">
                <span>{t('colScore')}: <span className={`font-bold ${me.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{me.score}</span></span>
                {me.bid2 !== undefined && (
                  <span>{t('colBid2')}: <span className="text-white font-bold">{me.bid2}</span></span>
                )}
                {me.tricksTaken > 0 && (
                  <span>{t('colWon')}: <span className={`font-bold ${me.tricksTaken === me.bid2 ? 'text-emerald-400' : 'text-orange-400'}`}>{me.tricksTaken}</span></span>
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

        {/* ── Last trick overlay ── */}
        {showLastTrick && lastTrick && (
          <div className="absolute top-0 left-0 z-30 p-2" onClick={() => setShowLastTrick(false)}>
            <div className="bg-slate-900/95 border border-slate-600 rounded-xl p-4 shadow-2xl min-w-[200px]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('lastTrickBtn')}</span>
                <button className="text-slate-500 hover:text-white text-xs" onClick={() => setShowLastTrick(false)}>✕</button>
              </div>
              <div className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-3 py-1 rounded-full text-center mb-3">
                {t('wonTrick', lastTrick.winnerName)}
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {lastTrick.cards.map((tc, i) => {
                  const isWinner = tc.playerId === lastTrick.winnerId;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <CardComponent
                        card={tc.card}
                        small
                        className={isWinner ? 'ring-2 ring-yellow-400' : ''}
                      />
                      <span className={`text-xs font-semibold truncate max-w-[64px] text-center px-1.5 py-0.5 rounded-full
                        ${isWinner ? 'bg-yellow-500/20 text-yellow-300' : 'text-slate-400'}`}>
                        {tc.playerName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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

      {/* ── Turn reminder banner ── */}
      {showTurnReminder && (
        <div className="fixed top-4 left-1/2 z-50 flex items-center gap-3
          bg-orange-500 text-white font-bold px-5 py-3 rounded-2xl shadow-2xl
          border-2 border-orange-300 animate-urgent-pulse">
          <span className="text-xl">⏰</span>
          <span className="text-sm">{t('turnReminderMsg')}</span>
          <button
            className="ml-2 text-orange-200 hover:text-white text-xs underline"
            onClick={() => setShowTurnReminder(false)}
          >
            {t('turnReminderDismiss')}
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {/* ── Received cards overlay ── */}
      {receivedCards && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setReceivedCards(null)}>
          <div className="bg-slate-900 border border-emerald-500/60 rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-emerald-400 font-bold text-lg mb-0.5">You received!</div>
              <div className="text-slate-400 text-sm">from <span className="text-white font-semibold">{receivedCards.fromName}</span></div>
            </div>
            <div className="flex gap-3 justify-center mb-5">
              {receivedCards.cards.map((card, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <CardComponent card={card} className="ring-2 ring-emerald-400 shadow-lg shadow-emerald-900/40" />
                </div>
              ))}
            </div>
            <button
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors text-sm"
              onClick={() => setReceivedCards(null)}
            >
              Got it ✓
            </button>
          </div>
        </div>
      )}

      {phase === 'cardExchange' && !state.isSpectator && (
        <CardExchange
          state={state}
          selectedIndices={exchangeSelected}
          onToggle={handleExchangeToggle}
          onSubmit={handleExchangeSubmit}
          onError={onError}
        />
      )}
      {phase === 'handEnd' && (
        <HandSummary state={state} onError={onError} />
      )}
      {phase === 'gameOver' && (
        <GameOver state={state} />
      )}
      {showHistory && (
        <HistoryModal
          history={state.handHistory}
          players={players}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
