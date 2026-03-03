import { TrickCard, CompletedTrick } from '../types';
import CardComponent from './CardComponent';
import { useT } from '../i18n';

interface Props {
  currentTrick: TrickCard[];
  lastTrick?: CompletedTrick;
  maxPlayers: number;
  playerNames: string[];
  myIndex: number;
}

export default function TrickArea({ currentTrick, lastTrick, playerNames, myIndex }: Props) {
  const { t } = useT();
  const trickToShow = currentTrick.length > 0 ? currentTrick : (lastTrick?.cards ?? []);
  const isLast = currentTrick.length === 0 && !!lastTrick;

  return (
    <div className="relative flex flex-col items-center gap-2">
      {isLast && lastTrick && (
        <div className="bg-yellow-500/90 text-black text-xs font-bold px-4 py-1 rounded-full shadow-lg">
          {t('wonTrick', lastTrick.winnerName)}
        </div>
      )}

      {trickToShow.length === 0 ? (
        <div className="text-slate-500 text-sm italic py-4">{t('noCardsYet')}</div>
      ) : (
        <div className="flex flex-wrap gap-3 items-end justify-center">
          {trickToShow.map((tc, i) => {
            const isMe = playerNames[myIndex] === tc.playerName;
            const isWinner = isLast && lastTrick?.winnerId === tc.playerId;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5 animate-bounce-in">
                <CardComponent
                  card={tc.card}
                  small
                  className={isWinner ? 'ring-2 ring-yellow-400' : ''}
                />
                <span className={`text-xs font-semibold truncate max-w-[64px] text-center px-1.5 py-0.5 rounded-full
                  ${isWinner ? 'bg-yellow-500/20 text-yellow-300' : isMe ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {tc.playerName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
