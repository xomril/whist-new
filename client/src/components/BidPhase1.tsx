import { useState } from 'react';
import { Bid1, TrumpSuit, TRUMP_LABEL } from '../types';
import { socket } from '../socket';

const TRUMP_SUITS: TrumpSuit[] = ['clubs', 'diamonds', 'hearts', 'spades', 'notrumps'];

const SUIT_COLOR: Record<TrumpSuit, string> = {
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  notrumps: 'text-blue-600',
};

const SUIT_BG: Record<TrumpSuit, string> = {
  clubs: 'bg-gray-100 border-gray-400 hover:bg-gray-200',
  spades: 'bg-gray-100 border-gray-400 hover:bg-gray-200',
  hearts: 'bg-red-50 border-red-300 hover:bg-red-100',
  diamonds: 'bg-red-50 border-red-300 hover:bg-red-100',
  notrumps: 'bg-blue-50 border-blue-300 hover:bg-blue-100',
};

interface Props {
  minTricks: number;
  maxTricks: number;
  currentHighBid?: Bid1;
  isMyTurn: boolean;
  onError: (msg: string) => void;
}

export default function BidPhase1({ minTricks, maxTricks, currentHighBid, isMyTurn, onError }: Props) {
  const [selectedSuit, setSelectedSuit] = useState<TrumpSuit>('clubs');
  const [selectedTricks, setSelectedTricks] = useState(minTricks);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!isMyTurn) return;
    setLoading(true);
    socket.emit('bid1', { action: { type: 'bid', bid: { tricks: selectedTricks, suit: selectedSuit } } }, res => {
      setLoading(false);
      if (!res.success) onError(res.error ?? 'Invalid bid');
    });
  };

  const pass = () => {
    if (!isMyTurn) return;
    setLoading(true);
    socket.emit('bid1', { action: { type: 'pass' } }, res => {
      setLoading(false);
      if (!res.success) onError(res.error ?? 'Cannot pass');
    });
  };

  return (
    <div className="bg-slate-900/95 rounded-2xl p-5 border border-slate-700 shadow-2xl w-full max-w-xs">
      <h3 className="text-white font-bold text-center mb-1 text-base">Phase 1 · Choose Trump</h3>
      {currentHighBid && (
        <p className="text-center text-xs text-slate-400 mb-3">
          Current high bid:{' '}
          <span className={`font-bold ${SUIT_COLOR[currentHighBid.suit]}`}>
            {currentHighBid.tricks} {TRUMP_LABEL[currentHighBid.suit]}
          </span>
        </p>
      )}
      {!currentHighBid && (
        <p className="text-center text-xs text-slate-500 mb-3">No bids yet — min {minTricks} tricks</p>
      )}

      {isMyTurn ? (
        <>
          {/* Suit picker */}
          <div className="grid grid-cols-5 gap-1 mb-4">
            {TRUMP_SUITS.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSuit(s)}
                className={`rounded-lg border-2 py-2 text-center transition-all text-xs font-bold
                  ${SUIT_BG[s]} ${SUIT_COLOR[s]}
                  ${selectedSuit === s ? 'ring-2 ring-yellow-400 scale-105 shadow-md' : ''}`}
                title={TRUMP_LABEL[s]}
              >
                {s === 'notrumps' ? 'NT' : TRUMP_LABEL[s][0]}
              </button>
            ))}
          </div>

          {/* Tricks stepper */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 font-bold text-lg text-white flex items-center justify-center transition-colors"
              onClick={() => setSelectedTricks(t => Math.max(minTricks, t - 1))}
            >−</button>
            <span className="text-white font-bold text-2xl w-10 text-center">{selectedTricks}</span>
            <button
              className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 font-bold text-lg text-white flex items-center justify-center transition-colors"
              onClick={() => setSelectedTricks(t => Math.min(maxTricks, t + 1))}
            >+</button>
          </div>
          <p className="text-center text-xs text-slate-400 mb-3">
            tricks with <span className={`font-bold ${SUIT_COLOR[selectedSuit]}`}>{TRUMP_LABEL[selectedSuit]}</span>
          </p>

          <div className="flex gap-2">
            <button
              className="btn-primary flex-1 text-sm py-2"
              onClick={submit}
              disabled={loading}
            >
              Bid {selectedTricks} {TRUMP_LABEL[selectedSuit]}
            </button>
            <button
              className="btn-secondary text-sm py-2 px-4"
              onClick={pass}
              disabled={loading}
            >
              Pass
            </button>
          </div>
        </>
      ) : (
        <div className="text-center text-slate-400 py-4 animate-pulse text-sm">
          Waiting for player to bid…
        </div>
      )}
    </div>
  );
}
