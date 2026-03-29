import { useState } from 'react';
import { socket } from '../socket';
import { useT, LangToggle } from '../i18n';

interface Props {
  onCreated: (name: string, roomId: string) => void;
  onJoined: (name: string, roomId: string) => void;
  onSpectate: (roomId: string) => void;
  onError: (msg: string) => void;
  initialRoomCode?: string;
}

export default function Lobby({ onCreated, onJoined, onSpectate, onError, initialRoomCode = '' }: Props) {
  const { t } = useT();
  const [tab, setTab] = useState<'create' | 'join' | 'watch'>(initialRoomCode ? 'join' : 'create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [maxPlayers, setMaxPlayers] = useState<3 | 4>(4);
  const [targetScore, setTargetScore] = useState(13);
  const [loading, setLoading] = useState(false);
  const [watchPassword, setWatchPassword] = useState('');

  const handleCreate = () => {
    if (!name.trim()) { onError(t('placeholderName')); return; }
    setLoading(true);
    socket.emit('createRoom', { playerName: name.trim(), maxPlayers, targetScore }, res => {
      setLoading(false);
      if (res.success && res.roomId) onCreated(name.trim(), res.roomId);
      else onError(res.error ?? 'Failed to create room');
    });
  };

  const handleJoin = () => {
    if (!name.trim()) { onError(t('placeholderName')); return; }
    if (!roomCode.trim()) { onError(t('labelRoomCode')); return; }
    setLoading(true);
    socket.emit('joinRoom', { roomId: roomCode.trim().toUpperCase(), playerName: name.trim() }, res => {
      setLoading(false);
      if (res.success) onJoined(name.trim(), roomCode.trim().toUpperCase());
      else onError(res.error ?? 'Failed to join room');
    });
  };

  const handleWatch = () => {
    if (!roomCode.trim()) { onError(t('labelRoomCode')); return; }
    setLoading(true);
    socket.emit('spectate', { roomId: roomCode.trim().toUpperCase(), password: watchPassword.trim() || undefined }, res => {
      setLoading(false);
      if (res.success) onSpectate(roomCode.trim().toUpperCase());
      else onError(res.error ?? 'Failed to spectate');
    });
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-end w-full max-w-md mb-2">
          <LangToggle />
        </div>
        <div className="text-6xl mb-4">🃏</div>
        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
          {t('title')}
        </h1>
        <p className="text-emerald-300 mt-2 text-lg">{t('subtitle')}</p>
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
          {(['create', 'join', 'watch'] as const).map(tab_ => (
            <button
              key={tab_}
              className={`flex-1 py-3 font-semibold transition-colors text-sm
                ${tab === tab_ ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              onClick={() => setTab(tab_)}
            >
              {tab_ === 'watch' ? t('tabWatch') : tab_ === 'create' ? t('tabCreate') : t('tabJoin')}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('labelName')}</label>
            <input
              className="field"
              placeholder={t('placeholderName')}
              value={name}
              maxLength={20}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') tab === 'create' ? handleCreate() : handleJoin(); }}
            />
          </div>

          {tab === 'create' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('labelPlayers')}</label>
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
                      {t('nPlayers', n)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t('labelRounds', targetScore)}
                </label>
                <input
                  type="range" min={5} max={20} step={1}
                  value={targetScore}
                  onChange={e => setTargetScore(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{t('roundsShort')}</span>
                  <span>{t('roundsLong')}</span>
                </div>
              </div>

              <button className="btn-primary w-full mt-2" onClick={handleCreate} disabled={loading}>
                {loading ? t('btnCreating') : t('btnCreate')}
              </button>
            </>
          ) : tab === 'join' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('labelRoomCode')}</label>
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
                {loading ? t('btnJoining') : t('btnJoin')}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('labelRoomCode')}</label>
                <input
                  className="field uppercase tracking-widest text-center text-xl font-bold"
                  placeholder="ABC123"
                  value={roomCode}
                  maxLength={6}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleWatch(); }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password (if required)</label>
                <input
                  className="field"
                  placeholder="Leave empty if no password"
                  type="password"
                  value={watchPassword}
                  onChange={e => setWatchPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleWatch(); }}
                />
              </div>
              <p className="text-slate-500 text-xs text-center">{t('watchHint')}</p>
              <button
                className="w-full mt-2 py-2 px-6 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                onClick={handleWatch} disabled={loading}
              >
                {loading ? t('btnConnecting') : t('btnWatch')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rules summary */}
      <div className="mt-8 max-w-md w-full bg-slate-900/60 rounded-xl p-5 border border-slate-700/50 text-sm text-slate-400">
        <h3 className="text-slate-200 font-semibold mb-2">{t('howToPlay')}</h3>
        <ul className="space-y-1 list-disc list-inside">
          <li><span className="text-slate-300">{t('rule1Label')}</span> {t('rule1')}</li>
          <li><span className="text-slate-300">{t('rule2Label')}</span> {t('rule2')}</li>
          <li><span className="text-slate-300">{t('rule3Label')}</span> {t('rule3')}</li>
          <li><span className="text-slate-300">{t('rule4Label')}</span> {t('rule4')}</li>
          <li><span className="text-slate-300">{t('rule5Label')}</span> {t('rule5')}</li>
        </ul>
      </div>
    </div>
  );
}
