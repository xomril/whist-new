import { PlayerView, TrumpSuit, SUIT_SYMBOL } from '../types';
import { useT } from '../i18n';

const SUIT_COLOR: Record<string, string> = {
  spades:   'text-slate-900',
  clubs:    'text-slate-900',
  hearts:   'text-red-500',
  diamonds: 'text-red-500',
  notrumps: 'text-slate-400',
};

interface Props {
  players: PlayerView[];
  myIndex: number;
  trumpSuit?: TrumpSuit;
  targetScore: number;
  isOverGame?: boolean;
  handNumber: number;
  totalTricks: number;
}

export default function Scoreboard({ players, myIndex, trumpSuit, targetScore, isOverGame, handNumber, totalTricks }: Props) {
  const { t, tTrump } = useT();
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-700 overflow-hidden text-sm w-full">
      <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <span className="text-slate-300 font-semibold text-xs uppercase tracking-wider">
          {t('scoresHeader', handNumber)}
        </span>
        {trumpSuit && (
          <span className="text-xs font-medium text-yellow-400">
            {tTrump(trumpSuit)}
            {isOverGame !== undefined && (
              <span className={`ml-2 ${isOverGame ? 'text-orange-400' : 'text-sky-400'}`}>
                {isOverGame ? t('over') : t('under')}
              </span>
            )}
          </span>
        )}
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-xs text-slate-500 uppercase">
            <th className="px-2 pt-2 pb-1 text-left">{t('colPlayer')}</th>
            <th className="px-1 pt-2 pb-1 text-center">{t('colBid1')}</th>
            <th className="px-1 pt-2 pb-1 text-center">{t('colBid2')}</th>
            <th className="px-1 pt-2 pb-1 text-center">{t('colWon')}</th>
            <th className="px-2 pt-2 pb-1 text-right">{t('colScore')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, rank) => {
            const isMe = players[myIndex]?.id === p.id;
            const bid2Done = p.bid2 !== undefined;
            const tricksMet = bid2Done && p.bid2 === p.tricksTaken;

            return (
              <tr key={p.id} className={`border-t border-slate-800 ${isMe ? 'bg-emerald-900/20' : ''}`}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    {rank === 0 && <span className="text-yellow-400">👑</span>}
                    <span className={`font-medium truncate max-w-[90px] ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                      {p.name}
                    </span>
                    <div className="flex gap-0.5">
                      {p.isDealer && <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded">D</span>}
                      {p.isDeclarer && <span className="text-[10px] bg-yellow-800 text-yellow-300 px-1 rounded">★</span>}
                    </div>
                    {!p.isConnected && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </div>
                </td>
                <td className="px-1 py-1.5 text-center text-slate-400 text-xs">
                  {p.bid1
                    ? p.bid1.type === 'pass'
                      ? '—'
                      : <span className="inline-flex items-baseline gap-0.5">
                          <span>{p.bid1.bid.tricks}</span>
                          <span className={`text-2xl leading-none font-bold ${SUIT_COLOR[p.bid1.bid.suit] ?? 'text-slate-400'}`}>
                            {SUIT_SYMBOL[p.bid1.bid.suit as never] ?? 'NT'}
                          </span>
                        </span>
                    : '…'}
                </td>
                <td className="px-1 py-1.5 text-center font-bold">
                  {bid2Done ? <span className={p.bid2 === 0 ? 'text-purple-400' : 'text-white'}>{p.bid2}</span> : '…'}
                </td>
                <td className="px-1 py-1.5 text-center">
                  {p.tricksTaken > 0 || bid2Done ? (
                    <span className={`font-bold ${tricksMet ? 'text-emerald-400' : p.tricksTaken > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                      {p.tricksTaken}/{totalTricks}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-2 py-1.5 text-right font-bold">
                  <span className={p.score >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {p.score > 0 ? '+' : ''}{p.score}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-right text-xs text-slate-500 border-t border-slate-800">
        {t('roundOf', handNumber, targetScore)}
      </div>
    </div>
  );
}
