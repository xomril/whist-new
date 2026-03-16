import { HandRecord, TrumpSuit } from '../types';
import { useT } from '../i18n';

interface Props {
  history: HandRecord[];
  players: { id: string; name: string }[];
  onClose: () => void;
}

export default function HistoryModal({ history, players, onClose }: Props) {
  const { t, tTrump } = useT();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-white font-bold text-base">{t('historyTitle')}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-sm px-3 py-1 rounded border border-slate-600 hover:border-slate-400"
          >
            {t('historyClose')}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {history.length === 0 && (
            <p className="text-slate-400 text-center py-8 text-sm">No completed hands yet.</p>
          )}

          {[...history].reverse().map(hand => (
            <div key={hand.handNumber} className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
              {/* Hand header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-slate-300 text-xs font-semibold">
                  {t('historyHand')} {hand.handNumber}
                </span>
                <span className="text-yellow-300 text-xs font-medium">
                  {t('historyTrump')}: {tTrump(hand.trumpSuit)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                  ${hand.isOverGame
                    ? 'bg-orange-900/40 text-orange-300 border-orange-700/50'
                    : 'bg-sky-900/40 text-sky-300 border-sky-700/50'}`}>
                  {hand.isOverGame ? t('historyOver') : t('historyUnder')}
                </span>
              </div>

              {/* Results table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700/50">
                    <th className="text-left px-4 py-1.5">{t('historyPlayer')}</th>
                    <th className="text-center px-2 py-1.5">{t('historyBid')}</th>
                    <th className="text-center px-2 py-1.5">{t('historyTook')}</th>
                    <th className="text-center px-2 py-1.5">{t('historyDelta')}</th>
                    <th className="text-right px-4 py-1.5">{t('historyTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {hand.results.map(r => {
                    const hit = r.bid2 === r.tricksTaken;
                    const positive = r.scoreDelta >= 0;
                    return (
                      <tr key={r.playerId} className="border-b border-slate-700/30 last:border-0">
                        <td className="px-4 py-2 text-slate-200 font-medium">{r.playerName}</td>
                        <td className="px-2 py-2 text-center text-slate-300">{r.bid2}</td>
                        <td className={`px-2 py-2 text-center font-semibold ${hit ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {r.tricksTaken}
                        </td>
                        <td className={`px-2 py-2 text-center font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {positive ? '+' : ''}{r.scoreDelta}
                        </td>
                        <td className={`px-4 py-2 text-right font-bold ${r.scoreAfter >= 0 ? 'text-white' : 'text-red-400'}`}>
                          {r.scoreAfter}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
