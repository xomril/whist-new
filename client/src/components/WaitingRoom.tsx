import { useState } from 'react';
import { RoomInfo } from '../types';
import { socket } from '../socket';
import { useT, LangToggle } from '../i18n';

function ZoomLinkSection({ room, isHost, onError }: { room: RoomInfo; isHost: boolean; onError: (m: string) => void }) {
  const [draft, setDraft] = useState(room.zoomLink ?? '');

  const save = () => {
    socket.emit('setZoomLink', { roomId: room.id, link: draft }, res => {
      if (!res.success) onError(res.error ?? 'Failed to save link');
    });
  };

  if (isHost) {
    return (
      <div className="mb-5">
        <label className="block text-xs font-medium text-slate-400 mb-1.5">📹 Zoom / Meet link (optional)</label>
        <div className="flex gap-2">
          <input
            className="field flex-1 text-sm"
            placeholder="https://zoom.us/j/..."
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') save(); }}
          />
          {room.zoomLink && (
            <a
              href={room.zoomLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Join
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!room.zoomLink) return null;
  return (
    <div className="mb-5">
      <a
        href={room.zoomLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-700/80 hover:bg-blue-600 border border-blue-500/60 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        📹 Join Zoom / Meet
      </a>
    </div>
  );
}

interface Props {
  room: RoomInfo;
  playerName: string;
  roomId: string;
  onError: (msg: string) => void;
}

export default function WaitingRoom({ room, onError }: Props) {
  const { t } = useT();
  const [addingBots, setAddingBots] = useState(false);
  const isHost = room.hostId === socket.id;
  const emptySlots = room.maxPlayers - room.players.length;

  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const copyCode = () => {
    navigator.clipboard.writeText(room.id).catch(() => {});
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAddBots = () => {
    setAddingBots(true);
    socket.emit('addBots', { roomId: room.id }, res => {
      setAddingBots(false);
      if (!res.success) onError(res.error ?? 'Failed to add bots');
    });
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">{t('waitingRoom')}</h2>
          <LangToggle />
        </div>

        {/* Room code */}
        <div
          className="bg-slate-800 rounded-xl p-5 text-center mb-3 cursor-pointer hover:bg-slate-700 transition-colors border border-slate-600 group"
          onClick={copyCode}
          title="Click to copy code"
        >
          <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">{t('labelRoomCode')}</p>
          <p className="text-4xl font-black tracking-widest text-emerald-400 font-mono">{room.id}</p>
          <p className="text-xs text-slate-500 mt-2 group-hover:text-slate-400 transition-colors">
            {copied === 'code' ? '✓ Copied!' : 'Click to copy'}
          </p>
        </div>

        {/* Share link */}
        <button
          className="w-full mb-6 py-2 px-4 rounded-xl text-sm font-medium border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
          onClick={copyLink}
        >
          {copied === 'link' ? '✓ Link copied!' : '🔗 Copy invite link'}
        </button>

        {/* Zoom link */}
        <ZoomLinkSection room={room} isHost={isHost} onError={onError} />

        {/* Players */}
        <div className="space-y-2 mb-6">
          {room.players.map((p, i) => {
            const isBot = p.name.startsWith('🤖');
            const canKick = isHost && p.id !== socket.id;
            return (
              <div key={p.id} className={`flex items-center gap-3 rounded-lg px-4 py-3 border
                ${isBot ? 'bg-blue-900/20 border-blue-700/50' : 'bg-slate-800 border-slate-700'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${isBot ? 'bg-blue-700' : 'bg-emerald-700'}`}>
                  {isBot ? '🤖' : p.name[0]?.toUpperCase()}
                </div>
                <span className="text-white font-medium flex-1">{p.name}</span>
                <div className="flex gap-1.5 items-center">
                  {i === 0 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                      {t('tagHost')}
                    </span>
                  )}
                  {isBot && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                      {t('tagBot')}
                    </span>
                  )}
                  {canKick && (
                    <button
                      className="text-xs bg-red-900/40 hover:bg-red-700/60 text-red-400 hover:text-white px-2 py-0.5 rounded-full border border-red-700/50 transition-colors font-medium"
                      onClick={() => {
                        socket.emit('kickPlayer', { roomId: room.id, targetId: p.id }, res => {
                          if (!res.success) onError(res.error ?? 'Failed to kick player');
                        });
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3 border border-dashed border-slate-600">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-500">?</div>
              <span className="text-slate-500 italic">{t('waitingEllipsis')}</span>
            </div>
          ))}
        </div>

        {isHost && emptySlots > 0 && (
          <button
            className="w-full mb-4 py-3 px-6 rounded-xl font-semibold transition-all border
              bg-blue-700/80 hover:bg-blue-600 border-blue-500/60 text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
            onClick={handleAddBots}
            disabled={addingBots}
          >
            {addingBots ? <><span className="animate-spin">⚙</span>{t('waitingEllipsis')}</> : t('fillBots')}
          </button>
        )}

        <div className="text-center text-slate-400 text-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            {t('playersStatus', room.players.length, room.maxPlayers)}
            {room.players.length < room.maxPlayers
              ? ` — ${t('waitingEllipsis')}`
              : ` — ${t('startingSoon')}`}
          </div>
          <p className="mt-2 text-slate-500">
            {t('rounds', room.targetScore)}
          </p>
        </div>
      </div>
    </div>
  );
}
