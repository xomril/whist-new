import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import { GameStateView, RoomInfo } from './types';
import { LanguageProvider } from './i18n';
import { sfxDeal, sfxTrickWon, sfxTrickComplete, sfxGameWon, sfxGameLost } from './sounds';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import SpectatorBoard from './components/SpectatorBoard';

type View = 'lobby' | 'waiting' | 'game' | 'spectate';

function AppInner() {
  const [view, setView] = useState<View>('lobby');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<GameStateView | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Read ?room= from URL to pre-fill join form
  const initialRoomCode = new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? '';

  const prevState = useRef<GameStateView | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Sound triggers on game state changes
  useEffect(() => {
    if (!gameState) return;
    const prev = prevState.current;

    if (prev) {
      // New hand dealt
      if (gameState.handNumber > prev.handNumber) {
        sfxDeal();
      }

      // Trick completed
      if (gameState.completedTricks.length > prev.completedTricks.length) {
        const latest = gameState.completedTricks[gameState.completedTricks.length - 1];
        const myId = gameState.players[gameState.myIndex]?.id;
        if (latest?.winnerId === myId) {
          sfxTrickWon();
        } else {
          sfxTrickComplete();
        }
      }

      // Game over
      if (gameState.phase === 'gameOver' && prev.phase !== 'gameOver') {
        const myId = gameState.players[gameState.myIndex]?.id;
        if (gameState.winner?.id === myId) {
          sfxGameWon();
        } else {
          sfxGameLost();
        }
      }
    }

    prevState.current = gameState;
  }, [gameState]);

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

    socket.on('kicked', ({ reason }) => {
      setGameState(null);
      setRoom(null);
      setView('lobby');
      history.replaceState(null, '', window.location.pathname);
      showToast(reason);
    });

    return () => {
      socket.off('roomUpdated');
      socket.off('gameState');
      socket.off('error');
      socket.off('kicked');
    };
  }, []);

  const handleCreated = (name: string, rid: string) => {
    setPlayerName(name);
    setRoomId(rid);
    history.replaceState(null, '', `?room=${rid}`);
    setView('waiting');
  };

  const handleJoined = (name: string, rid: string) => {
    setPlayerName(name);
    setRoomId(rid);
    history.replaceState(null, '', `?room=${rid}`);
  };

  const handleSpectate = (rid: string) => {
    setRoomId(rid);
    setView('spectate');
  };

  return (
    <div className="min-h-screen felt-table flex flex-col">
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
          initialRoomCode={initialRoomCode}
        />
      )}

      {view === 'waiting' && room && (
        <WaitingRoom room={room} playerName={playerName} roomId={roomId} onError={showToast} />
      )}

      {view === 'game' && gameState && !gameState.isSpectator && (
        <GameBoard state={gameState} playerName={playerName} zoomLink={room?.zoomLink} onError={showToast} />
      )}

      {(view === 'spectate' || (view === 'game' && gameState?.isSpectator)) && gameState && (
        <SpectatorBoard state={gameState} onError={showToast} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}
