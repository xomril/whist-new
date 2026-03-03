import { GameStateView, TRUMP_LABEL } from '../types';
import { calcDisplayScore } from '../utils/scoring';
import { socket } from '../socket';

interface Props {
  state: GameStateView;
  onError: (msg: string) => void;
}

export default function HandSummary({ state, onError }: Props) {
  const { players, myIndex, trumpSuit, isOverGame, totalTricks, targetScore } = state;
  const me = players[myIndex];

  const handleNext = () => {
    socket.emit('nextHand', res => {
      if (!res.success) onError(res.error ?? 'Failed to start next hand');
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-6 w-full max-w-sm animate-bounce-in">
        <h2 className="text-xl font-bold text-center text-white mb-1">Hand {state.handNumber} Over</h2>
        {trumpSuit && (
          <p className="text-center text-sm text-slate-400 mb-4">
            Trump: <span className="text-yellow-400 font-semibold">{TRUMP_LABEL[trumpSuit]}</span>
            {' · '}
            <span className={isOverGame ? 'text-orange-400' : 'text-sky-400'}>
              {isOverGame ? 'Over game' : 'Under game'}
            </span>
          </p>
        )}

        <div className="space-y-2 mb-5">
          {[...players]
            .sort((a, b) => {
              const dA = calcDisplayScore(a.bid2 ?? 0, a.tricksTaken, isOverGame ?? false);
              const dB = calcDisplayScore(b.bid2 ?? 0, b.tricksTaken, isOverGame ?? false);
              return dB - dA;
            })
            .map(p => {
              const bid = p.bid2 ?? 0;
              const taken = p.tricksTaken;
              const roundScore = calcDisplayScore(bid, taken, isOverGame ?? false);
              const isMe = p.id === me?.id;
              const hit = bid === taken;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg px-4 py-2.5 border
                    ${isMe ? 'border-emerald-600 bg-emerald-900/20' : 'border-slate-700 bg-slate-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                      {p.name}
                    </span>
                    {p.isDeclarer && <span className="text-xs text-yellow-400">★</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400">
                      bid <span className="text-white font-bold">{bid}</span>,
                      took <span className={hit ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{taken}</span>
                    </span>
                    <span className={`font-bold ${roundScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {roundScore > 0 ? '+' : ''}{roundScore}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Running totals */}
        <div className="bg-slate-800 rounded-lg px-4 py-3 mb-5 border border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Total Scores</p>
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm mb-1">
                <span className={p.id === me?.id ? 'text-emerald-400' : 'text-white'}>{p.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-slate-700 rounded-full">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(0, (p.score / targetScore) * 100))}%` }}
                    />
                  </div>
                  <span className={`font-bold w-10 text-right ${p.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.score}
                  </span>
                </div>
              </div>
            ))}
          <p className="text-xs text-slate-500 mt-2 text-right">Goal: {targetScore} pts</p>
        </div>

        {!state.isSpectator && (
          <button className="btn-primary w-full" onClick={handleNext}>
            Deal Next Hand →
          </button>
        )}
        {state.isSpectator && (
          <p className="text-center text-slate-400 text-sm animate-pulse">Waiting for a player to deal next hand…</p>
        )}
      </div>
    </div>
  );
}
