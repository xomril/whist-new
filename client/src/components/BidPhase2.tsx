import { useState } from 'react';
import { socket } from '../socket';

interface Props {
  totalTricks: number;
  forbiddenValue?: number;
  isMyTurn: boolean;
  onError: (msg: string) => void;
}

export default function BidPhase2({ totalTricks, forbiddenValue, isMyTurn, onError }: Props) {
  const [bid, setBid] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!isMyTurn) return;
    if (bid === forbiddenValue) {
      onError(`You cannot bid ${forbiddenValue} — it would make the total exactly ${totalTricks}`);
      return;
    }
    setLoading(true);
    socket.emit('bid2', { tricks: bid }, res => {
      setLoading(false);
      if (!res.success) onError(res.error ?? 'Invalid bid');
    });
  };

  const buttons = Array.from({ length: totalTricks + 1 }, (_, i) => i);

  return (
    <div className="bg-slate-900/95 rounded-2xl p-5 border border-slate-700 shadow-2xl w-full max-w-xs">
      <h3 className="text-white font-bold text-center mb-1 text-base">Phase 2 · Bid Tricks</h3>
      <p className="text-center text-xs text-slate-400 mb-3">
        How many tricks will you take?
        {forbiddenValue !== undefined && (
          <span className="block text-red-400 mt-0.5">Cannot bid {forbiddenValue}</span>
        )}
      </p>

      {isMyTurn ? (
        <>
          {/* Grid of bid buttons */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {buttons.map(n => {
              const isForbidden = n === forbiddenValue;
              const isSelected = n === bid;
              return (
                <button
                  key={n}
                  disabled={isForbidden}
                  onClick={() => setBid(n)}
                  className={`w-9 h-9 rounded-lg font-bold text-sm transition-all border
                    ${isForbidden
                      ? 'bg-red-900/30 border-red-700 text-red-500 cursor-not-allowed line-through opacity-50'
                      : isSelected
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-md scale-110 ring-2 ring-yellow-400'
                      : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                    }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <button
            className="btn-primary w-full text-sm py-2"
            onClick={submit}
            disabled={loading || bid === forbiddenValue}
          >
            Bid {bid} trick{bid !== 1 ? 's' : ''}
          </button>
        </>
      ) : (
        <div className="text-center text-slate-400 py-4 animate-pulse text-sm">
          Waiting for player to bid…
        </div>
      )}
    </div>
  );
}
