import { useState } from 'react';
import { socket } from '../socket';

interface Props {
  onCreated: (name: string, roomId: string) => void;
  onJoined: (name: string, roomId: string) => void;
  onSpectate: (roomId: string) => void;
  onError: (msg: string) => void;
}

export default function Lobby({ onCreated, onJoined, onSpectate, onError }: Props) {
  const [tab, setTab] = useState<'create' | 'join' | 'watch'>('create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<3 | 4>(4);
  const [targetScore, setTargetScore] = useState(13);
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) { onError('Please enter your name'); return; }
    setLoading(true);
    socket.emit('createRoom', { playerName: name.trim(), maxPlayers, targetScore }, res => {
      setLoading(false);
      if (res.success && res.roomId) onCreated(name.trim(), res.roomId);
      else onError(res.error ?? 'Failed to create room');
    });
  };

  const handleJoin = () => {
    if (!name.trim()) { onError('Please enter your name'); return; }
    if (!roomCode.trim()) { onError('Please enter a room code'); return; }
    setLoading(true);
    socket.emit('joinRoom', { roomId: roomCode.trim().toUpperCase(), playerName: name.trim() }, res => {
      setLoading(false);
      if (res.success) onJoined(name.trim(), roomCode.trim().toUpperCase());
      else onError(res.error ?? 'Failed to join room');
    });
  };

  const handleWatch = () => {
    if (!roomCode.trim()) { onError('Please enter a room code'); return; }
    setLoading(true);
    socket.emit('spectate', { roomId: roomCode.trim().toUpperCase() }, res => {
      setLoading(false);
      if (res.success) onSpectate(roomCode.trim().toUpperCase());
      else onError(res.error ?? 'Failed to spectate');
    });
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🃏</div>
        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
          Israeli Whist
        </h1>
        <p className="text-emerald-300 mt-2 text-lg">Online Multiplayer Card Game</p>
        <div className="flex gap-4 justify-center mt-3 text-2xl">
          <span title="Clubs">♣</span>
          <span className="suit-red" title="Diamonds">♦</span>
          <span className="suit-red" title="Hearts">♥</span>
          <span title="Spades">♠</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-6 border border-slate-700">
          {(['create', 'join', 'watch'] as const).map(t => (
            <button
              key={t}
              className={`flex-1 py-3 font-semibold transition-colors text-sm capitalize
                ${tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              onClick={() => setTab(t)}
            >
              {t === 'watch' ? '👁 Watch' : t === 'create' ? 'Create' : 'Join'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Name</label>
            <input
              className="field"
              placeholder="Enter your name..."
              value={name}
              maxLength={20}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') tab === 'create' ? handleCreate() : handleJoin(); }}
            />
          </div>

          {tab === 'create' ? (
            <>
              {/* Players */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Players</label>
                <div className="flex gap-3">
                  {([3, 4] as const).map(n => (
                    <button
                      key={n}
                      onClick={() => setMaxPlayers(n)}
                      className={`flex-1 py-2.5 rounded-lg border font-semibold transition-all ${
                        maxPlayers === n
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                          : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {n} Players
                    </button>
                  ))}
                </div>
              </div>

              {/* Rounds */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Rounds: <span className="text-emerald-400 font-bold">{targetScore}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  step={1}
                  value={targetScore}
                  onChange={e => setTargetScore(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5 (short)</span>
                  <span>20 (long)</span>
                </div>
              </div>

              <button className="btn-primary w-full mt-2" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </>
          ) : tab === 'join' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Room Code</label>
                <input
                  className="field uppercase tracking-widest text-center text-xl font-bold"
                  placeholder="ABC123"
                  value={roomCode}
                  maxLength={6}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                />
              </div>
              <button className="btn-primary w-full mt-2" onClick={handleJoin} disabled={loading}>
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </>
          ) : (
            // Watch tab
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Room Code</label>
                <input
                  className="field uppercase tracking-widest text-center text-xl font-bold"
                  placeholder="ABC123"
                  value={roomCode}
                  maxLength={6}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleWatch(); }}
                />
              </div>
              <p className="text-slate-500 text-xs text-center">
                Watch a live game — all cards visible, no actions
              </p>
              <button className="w-full mt-2 py-2 px-6 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50" onClick={handleWatch} disabled={loading}>
                {loading ? 'Connecting...' : '👁 Watch Game'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rules summary */}
      <div className="mt-8 max-w-md w-full bg-slate-900/60 rounded-xl p-5 border border-slate-700/50 text-sm text-slate-400">
        <h3 className="text-slate-200 font-semibold mb-2">How to play</h3>
        <ul className="space-y-1 list-disc list-inside">
          <li><span className="text-slate-300">Phase 1:</span> Bid to win the trump suit (highest bid wins)</li>
          <li><span className="text-slate-300">Phase 2:</span> Each player bids how many tricks they'll take</li>
          <li><span className="text-slate-300">Exact bid:</span> +10 + bid² points</li>
          <li><span className="text-slate-300">Wrong bid:</span> -10 × difference</li>
          <li><span className="text-slate-300">Zero bid success:</span> +50 (under) / +25 (over)</li>
        </ul>
      </div>
    </div>
  );
}
