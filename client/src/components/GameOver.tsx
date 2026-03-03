import { GameStateView } from '../types';

interface Props {
  state: GameStateView;
}

const CONFETTI = ['🎉', '🏆', '👑', '⭐', '🎊'];

export default function GameOver({ state }: Props) {
  const { players, myIndex, winner } = state;
  const me = players[myIndex];
  const iAmWinner = winner?.id === me?.id;
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-yellow-500/40 shadow-2xl shadow-yellow-500/10 p-8 w-full max-w-sm animate-bounce-in text-center">
        <div className="text-5xl mb-3">{iAmWinner ? '🏆' : '🎊'}</div>
        <h2 className="text-3xl font-black text-white mb-1">
          {iAmWinner ? 'You Win!' : `${winner?.name} Wins!`}
        </h2>
        <p className="text-slate-400 text-sm mb-6">Game finished · Final Scores</p>

        <div className="space-y-2 mb-6">
          {sorted.map((p, i) => {
            const medals = ['🥇', '🥈', '🥉', '4️⃣'];
            const isMe = p.id === me?.id;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 border
                  ${i === 0 ? 'border-yellow-500/50 bg-yellow-900/20' : isMe ? 'border-emerald-600/50 bg-emerald-900/20' : 'border-slate-700 bg-slate-800'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{medals[i] ?? ''}</span>
                  <span className={`font-semibold ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                    {p.name}
                  </span>
                </div>
                <span className={`text-xl font-black ${p.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.score}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-slate-400 text-sm mb-4">
          {CONFETTI[Math.floor(Math.random() * CONFETTI.length)]} Thanks for playing!
        </p>

        <button
          className="btn-primary w-full"
          onClick={() => window.location.reload()}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
