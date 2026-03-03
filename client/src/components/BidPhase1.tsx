import { useState } from 'react';
import { Bid1, TrumpSuit } from '../types';
import { socket } from '../socket';
import { useT } from '../i18n';
import { sfxBid } from '../sounds';

const TRUMP_SUITS: TrumpSuit[] = ['clubs', 'diamonds', 'hearts', 'spades', 'notrumps'];

const SUIT_COLOR: Record<TrumpSuit, string> = {
  clubs: 'text-gray-900', spades: 'text-gray-900',
  hearts: 'text-red-600', diamonds: 'text-red-600',
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
  const { t, tTrump } = useT();
  const [selectedSuit, setSelectedSuit] = useState<TrumpSuit>('clubs');
  const [selectedTricks, setSelectedTricks] = useState(minTricks);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!isMyTurn) return;
    setLoading(true);
    socket.emit('bid1', { action: { type: 'bid', bid: { tricks: selectedTricks, suit: selectedSuit } } }, res => {
      setLoading(false);
      if (!res.success) onError(res.error ?? 'Invalid bid');
      else sfxBid();
    });
  };

  const pass = () => {
    if (!isMyTurn) return;
    setLoading(true);
    socket.emit('bid1', { action: { type: 'pass' } }, res => {
      setLoading(false);
      if (!res.success) onError(res.error ?? 'Cannot pass');
      else sfxBid();
    });
  };

  return (
    <div className="bg-slate-900/95 rounded-2xl p-5 border border-slate-700 shadow-2xl w-full max-w-xs">
      <h3 className="text-white font-bold text-center mb-1 text-base">{t('bid1Title')}</h3>
      {currentHighBid ? (
        <p className="text-center text-xs text-slate-400 mb-3">
          {t('currentHighBid')}{' '}
          <span className={`font-bold ${SUIT_COLOR[currentHighBid.suit]}`}>
            {currentHighBid.tricks} {tTrump(currentHighBid.suit)}
          </span>
        </p>
      ) : (
        <p className="text-center text-xs text-slate-500 mb-3">{t('noBidsYet', minTricks)}</p>
      )}

      {isMyTurn ? (
        <>
          <div className="grid grid-cols-5 gap-1 mb-4">
            {TRUMP_SUITS.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSuit(s)}
                className={`rounded-lg border-2 py-2 text-center transition-all text-xs font-bold
                  ${SUIT_BG[s]} ${SUIT_COLOR[s]}
                  ${selectedSuit === s ? 'ring-2 ring-yellow-400 scale-105 shadow-md' : ''}`}
                title={tTrump(s)}
              >
                {s === 'notrumps' ? 'NT' : tTrump(s)[0] === '♣' || tTrump(s)[0] === '♦' || tTrump(s)[0] === '♥' || tTrump(s)[0] === '♠' ? tTrump(s)[0] : tTrump(s).slice(0, 2)}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 font-bold text-lg text-white flex items-center justify-center transition-colors"
              onClick={() => setSelectedTricks(t_ => Math.max(minTricks, t_ - 1))}
            >−</button>
            <span className="text-white font-bold text-2xl w-10 text-center">{selectedTricks}</span>
            <button
              className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 font-bold text-lg text-white flex items-center justify-center transition-colors"
              onClick={() => setSelectedTricks(t_ => Math.min(maxTricks, t_ + 1))}
            >+</button>
          </div>
          <p className="text-center text-xs text-slate-400 mb-3">
            {t('tricksWith')} <span className={`font-bold ${SUIT_COLOR[selectedSuit]}`}>{tTrump(selectedSuit)}</span>
          </p>

          <div className="flex gap-2">
            <button className="btn-primary flex-1 text-sm py-2" onClick={submit} disabled={loading}>
              {t('btnBid', selectedTricks, tTrump(selectedSuit))}
            </button>
            <button className="btn-secondary text-sm py-2 px-4" onClick={pass} disabled={loading}>
              {t('btnPass')}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center text-slate-400 py-4 animate-pulse text-sm">{t('waitingBid')}</div>
      )}
    </div>
  );
}
