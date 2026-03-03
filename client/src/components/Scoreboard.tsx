import { PlayerView, TRUMP_LABEL, TrumpSuit } from '../types';

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
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-700 overflow-hidden text-sm w-full">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <span className="text-slate-300 font-semibold text-xs uppercase tracking-wider">Scores · Hand {handNumber}</span>
        {trumpSuit && (
          <span className="text-xs font-medium text-yellow-400">
            {TRUMP_LABEL[trumpSuit]}
            {isOverGame !== undefined && (
              <span className={`ml-2 ${isOverGame ? 'text-orange-400' : 'text-sky-400'}`}>
                {isOverGame ? 'Over' : 'Under'}
              </span>
            )}
          </span>
        )}
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-xs text-slate-500 uppercase">
            <th className="px-3 pt-2 pb-1 text-left">Player</th>
            <th className="px-2 pt-2 pb-1 text-center">Bid1</th>
            <th className="px-2 pt-2 pb-1 text-center">Bid2</th>
            <th className="px-2 pt-2 pb-1 text-center">Won</th>
            <th className="px-3 pt-2 pb-1 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, rank) => {
            const isMe = players[myIndex]?.id === p.id;
            const bid2Done = p.bid2 !== undefined;
            const tricksMet = bid2Done && p.bid2 === p.tricksTaken;

            return (
              <tr
                key={p.id}
                className={`border-t border-slate-800 ${isMe ? 'bg-emerald-900/20' : ''}`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {rank === 0 && <span className="text-yellow-400">👑</span>}
                    <span className={`font-medium truncate max-w-[80px] ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                      {p.name}
                    </span>
                    <div className="flex gap-0.5">
                      {p.isDealer && <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded">D</span>}
                      {p.isDeclarer && <span className="text-[10px] bg-yellow-800 text-yellow-300 px-1 rounded">★</span>}
                    </div>
                    {!p.isConnected && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Disconnected" />}
                  </div>
                </td>
                <td className="px-2 py-2 text-center text-slate-400 text-xs">
                  {p.bid1 ? (p.bid1.type === 'pass' ? '—' : `${p.bid1.bid.tricks}${TRUMP_LABEL[p.bid1.bid.suit][0]}`) : '…'}
                </td>
                <td className="px-2 py-2 text-center font-bold">
                  {bid2Done ? (
                    <span className={p.bid2 === 0 ? 'text-purple-400' : 'text-white'}>{p.bid2}</span>
                  ) : '…'}
                </td>
                <td className="px-2 py-2 text-center">
                  {p.tricksTaken > 0 || bid2Done ? (
                    <span className={`font-bold ${tricksMet ? 'text-emerald-400' : p.tricksTaken > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                      {p.tricksTaken}/{totalTricks}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${p.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.score > 0 ? '+' : ''}{p.score}
                    </span>
                    <div className="h-1 rounded-full bg-slate-700 w-16 mt-1">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${(handNumber / targetScore) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-right text-xs text-slate-500 border-t border-slate-800">
        Round {handNumber} of {targetScore}
      </div>
    </div>
  );
}
