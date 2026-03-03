import { useState, useEffect } from 'react';
import { socket } from './socket';
import { GameStateView, RoomInfo } from './types';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import SpectatorBoard from './components/SpectatorBoard';

type View = 'lobby' | 'waiting' | 'game' | 'spectate';

export default function App() {
  const [view, setView] = useState<View>('lobby');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<GameStateView | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    socket.on('roomUpdated', ({ room: r }) => {
      setRoom(r);
      if (r.status === 'waiting') setView('waiting');
    });

    socket.on('gameState', state => {
      setGameState(state);
      setView('game');
    });

    socket.on('error', ({ message }) => showToast(message));

    return () => {
      socket.off('roomUpdated');
      socket.off('gameState');
      socket.off('error');
    };
  }, []);

  const handleCreated = (name: string, rid: string) => {
    setPlayerName(name);
    setRoomId(rid);
    setView('waiting');
  };

  const handleJoined = (name: string, rid: string) => {
    setPlayerName(name);
    setRoomId(rid);
  };

  const handleSpectate = (rid: string) => {
    setRoomId(rid);
    setView('spectate');
  };

  return (
    <div className="min-h-screen felt-table flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-700 text-white
                        px-6 py-3 rounded-xl shadow-xl animate-bounce-in text-sm font-medium">
          {toast}
        </div>
      )}

      {view === 'lobby' && (
        <Lobby
          onCreated={handleCreated}
          onJoined={handleJoined}
          onSpectate={handleSpectate}
          onError={showToast}
        />
      )}

      {view === 'waiting' && room && (
        <WaitingRoom room={room} playerName={playerName} roomId={roomId} onError={showToast} />
      )}

      {view === 'game' && gameState && !gameState.isSpectator && (
        <GameBoard
          state={gameState}
          playerName={playerName}
          onError={showToast}
        />
      )}

      {(view === 'spectate' || (view === 'game' && gameState?.isSpectator)) && gameState && (
        <SpectatorBoard state={gameState} onError={showToast} />
      )}
    </div>
  );
}
