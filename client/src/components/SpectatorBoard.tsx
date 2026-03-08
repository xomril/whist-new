import { GameStateView, PlayerView, SUIT_SYMBOL } from '../types';
import CardComponent from './CardComponent';
import TrickArea from './TrickArea';
import Scoreboard from './Scoreboard';
import HandSummary from './HandSummary';
import GameOver from './GameOver';
import { useT, LangToggle } from '../i18n';
import HistoryModal from './HistoryModal';
import { useState } from 'react';

interface Props {
  state: GameStateView;
  onError: (msg: string) => void;
}

function PlayerPanel({
  player,
  hand,
  isActive,
  position,
  totalTricks,
}: {
  player: PlayerView;
  hand: import('../types').Card[];
  isActive: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
  totalTricks: number;
}) {
  const horizontal = position === 'top' || position === 'bottom';

  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${
        position === 'left' || position === 'right' ? 'max-w-[160px]' : ''
      }`}
    >
      {/* Name badge */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold
          ${isActive ? 'border-yellow-400 bg-yellow-400/15 text-yellow-300 animate-pulse-glow' : 'border-slate-600 bg-slate-900/70 text-slate-300'}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${player.isConnected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        {player.name}
        {player.isDealer && <span className="bg-slate-700 text-slate-300 px-1 rounded text-[9px]">D</span>}
        {player.isDeclarer && <span className="bg-yellow-800 text-yellow-300 px-1 rounded text-[9px]">★</span>}
        {player.bid2 !== undefined && (
          <span className="text-slate-400">bid <span className="text-white font-bold">{player.bid2}</span></span>
        )}
        {player.tricksTaken > 0 && (
          <span className={player.tricksTaken === player.bid2 ? 'text-emerald-400 font-bold' : 'text-orange-400'}>
            ✓{player.tricksTaken}
          </span>
        )}
        <span className={`font-bold ml-1 ${player.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {player.score}
        </span>
      </div>

      {/* Cards */}
      <div className="hand-fan flex flex-row items-end">
        {hand.map((card, i) => (
          <CardComponent
            key={`${card.rank}-${card.suit}-${i}`}
            card={card}
            tiny
          />
        ))}
      </div>
    </div>
  );
}

export default function SpectatorBoard({ state, onError }: Props) {
  const { t, tTrump } = useT();
  const [showHistory, setShowHistory] = useState(false);
  const {
    players, allHands, currentPlayerIndex, currentTrick,
    completedTricks, trumpSuit, phase, handNumber, totalTricks,
  } = state;

  if (!allHands) return <div className="text-white text-center mt-20">Waiting for game data…</div>;

  const lastTrick = completedTricks[completedTricks.length - 1];

  // Assign positions for up to 4 players
  const positions: ('bottom' | 'left' | 'top' | 'right')[] =
    players.length === 4
      ? ['bottom', 'left', 'top', 'right']
      : ['bottom', 'left', 'right'];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-700/50 text-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-purple-400 font-semibold border border-purple-700/50 bg-purple-900/30 px-2 py-0.5 rounded-full">
            {t('spectating')}
          </span>
          <span className="text-slate-400">{t('handOf', handNumber, state.targetScore)}</span>
          {trumpSuit && (
            <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-700/50 px-2 py-0.5 rounded-full font-semibold">
              {t('trump', tTrump(trumpSuit))}
            </span>
          )}
          {state.isOverGame !== undefined && (
            <span className={`px-2 py-0.5 rounded-full border text-xs font-medium
              ${state.isOverGame ? 'bg-orange-900/40 text-orange-300 border-orange-700/50' : 'bg-sky-900/40 text-sky-300 border-sky-700/50'}`}>
              {state.isOverGame ? t('over') : t('under')}
            </span>
          )}
          {phase === 'playing' && (
            <span className="text-slate-400">{t('trick', state.trickNumber, totalTricks)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-600 transition-colors text-xs"
            onClick={() => setShowHistory(true)}
          >
            {t('historyBtn')}
          </button>
          <LangToggle />
          <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold
            ${phase === 'bid1' ? 'bg-purple-900/40 text-purple-300 border-purple-700/50' :
              phase === 'cardExchange' ? 'bg-amber-900/40 text-amber-300 border-amber-700/50' :
              phase === 'bid2' ? 'bg-blue-900/40 text-blue-300 border-blue-700/50' :
              phase === 'playing' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' :
              'bg-slate-800 text-slate-400 border-slate-600'}`}>
            {phase === 'bid1' ? t('phase1Bid') : phase === 'cardExchange' ? t('exchangeRoundLabel') : phase === 'bid2' ? t('phase2Bid') : phase === 'playing' ? t('phasePlay') : phase}
          </span>
          {phase === 'playing' && (
            <span className="text-slate-300">{t('sTurn', players[currentPlayerIndex]?.name ?? '')}</span>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3 min-h-0">
        {/* Left column */}
        <div className="flex flex-col justify-center">
          {players[1] && (
            <PlayerPanel
              player={players[1]}
              hand={allHands[1] ?? []}
              isActive={currentPlayerIndex === 1}
              position="left"
              totalTricks={totalTricks}
            />
          )}
        </div>

        {/* Center column */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Top player */}
          {players[2] && (
            <div className="flex justify-center">
              <PlayerPanel
                player={players[2]}
                hand={allHands[2] ?? []}
                isActive={currentPlayerIndex === 2}
                position="top"
                totalTricks={totalTricks}
              />
            </div>
          )}

          {/* Center trick */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="bg-felt-dark/80 rounded-2xl p-5 min-w-[200px] min-h-[140px] flex items-center justify-center shadow-inner border border-felt-dark/40">
              <TrickArea
                currentTrick={currentTrick}
                lastTrick={lastTrick}
                maxPlayers={players.length}
                playerNames={players.map(p => p.name)}
                myIndex={-1}
              />
            </div>

            {/* Bid phase info */}
            {(phase === 'bid1' || phase === 'bid2') && (
              <div className="bg-slate-900/80 rounded-xl border border-slate-700 px-5 py-3 text-center">
                <p className="text-slate-300 text-sm">
                  {phase === 'bid1' ? t('phase1Info') : t('phase2Info')}
                </p>
                <p className="text-emerald-400 font-semibold mt-1">
                  {t('turnToBid', players[currentPlayerIndex]?.name ?? '')}
                </p>
                {state.currentHighBid1 && phase === 'bid1' && (
                  <p className="text-yellow-400 text-xs mt-1">
                    {t('currentHigh', state.currentHighBid1.tricks, tTrump(state.currentHighBid1.suit))}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bottom player */}
          {players[0] && (
            <div className="flex justify-center">
              <PlayerPanel
                player={players[0]}
                hand={allHands[0] ?? []}
                isActive={currentPlayerIndex === 0}
                position="bottom"
                totalTricks={totalTricks}
              />
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col justify-between gap-3">
          {players[3] && (
            <div className="flex justify-center mt-auto mb-auto">
              <PlayerPanel
                player={players[3]}
                hand={allHands[3] ?? []}
                isActive={currentPlayerIndex === 3}
                position="right"
                totalTricks={totalTricks}
              />
            </div>
          )}
          {/* Scoreboard on the right */}
          <div className="w-52 flex-shrink-0">
            <Scoreboard
              players={players}
              myIndex={-1}
              trumpSuit={trumpSuit}
              targetScore={state.targetScore}
              isOverGame={state.isOverGame}
              handNumber={handNumber}
              totalTricks={totalTricks}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {phase === 'handEnd' && <HandSummary state={state} onError={onError} />}
      {phase === 'gameOver' && <GameOver state={state} />}
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
