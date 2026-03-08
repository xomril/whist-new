import { useT } from '../i18n';
import { GameStateView } from '../types';
import CardComponent from './CardComponent';

interface Props {
  state: GameStateView;
  selectedIndices: number[];
  onToggle: (idx: number) => void;
  onSubmit: () => void;
  onError: (msg: string) => void;
}

const SUIT_ORDER: Record<string, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
const RANK_ORDER: Record<string, number> = {
  '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12,
};

export default function CardExchange({ state, selectedIndices, onToggle, onSubmit, onError }: Props) {
  const { t } = useT();
  const { myHand, myIndex, players, exchangeRound = 1, exchangeSubmitted, exchangePendingCount = 0, maxPlayers } = state;

  // Direction offset: Round 1 = right (+1), Round 2 = opposite (+2), Round 3 = left (+n-1)
  const offset = exchangeRound === 1 ? 1 : exchangeRound === 2 ? 2 : maxPlayers - 1;
  const targetIndex = (myIndex + offset) % maxPlayers;
  const targetName = players[targetIndex]?.name ?? '';

  const directionLabel =
    exchangeRound === 1 ? t('exchangeDirectionRight') :
    exchangeRound === 2 ? t('exchangeDirectionOpposite') :
    t('exchangeDirectionLeft');

  const sortedHand = myHand
    .map((card, originalIndex) => ({ card, originalIndex }))
    .sort((a, b) => {
      const sd = SUIT_ORDER[a.card.suit] - SUIT_ORDER[b.card.suit];
      return sd !== 0 ? sd : RANK_ORDER[a.card.rank] - RANK_ORDER[b.card.rank];
    });

  const handleCardClick = (idx: number) => {
    if (exchangeSubmitted) return;
    if (selectedIndices.includes(idx)) {
      onToggle(idx); // deselect
    } else if (selectedIndices.length < 3) {
      onToggle(idx); // select
    } else {
      onError('You can only select 3 cards to pass');
    }
  };

  const handleSubmit = () => {
    if (selectedIndices.length !== 3) {
      onError('Select exactly 3 cards to pass');
      return;
    }
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-600 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-4 p-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-amber-400 font-bold text-lg mb-1">
            {t('exchangeRoundLabel')}
          </div>
          <div className="text-white font-semibold text-base">
            {t('exchangeTitle', exchangeRound)}
          </div>
          <div className="text-slate-300 text-sm mt-1">{directionLabel}</div>
          <div className="text-slate-400 text-xs mt-0.5">
            {t('exchangePassTo', targetName)}
          </div>
        </div>

        {exchangeSubmitted ? (
          // Waiting state
          <div className="text-center py-6">
            <div className="text-emerald-400 font-semibold text-base animate-pulse">
              {t('exchangeWaiting', exchangePendingCount, exchangePendingCount === 1 ? '' : 's')}
            </div>
            {myHand.length > 0 && (
              <div className="mt-4">
                <p className="text-slate-500 text-xs mb-2">Your remaining hand:</p>
                <div className="hand-fan flex items-end justify-center overflow-visible">
                  {sortedHand.map(({ card, originalIndex }) => (
                    <CardComponent
                      key={`${card.rank}-${card.suit}-${originalIndex}`}
                      card={card}
                      selected={false}
                      playable={false}
                      disabled={true}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Selection state
          <>
            <div className="text-center text-sm">
              <span className={`font-semibold ${selectedIndices.length === 3 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {t('exchangeSelected', selectedIndices.length)}
              </span>
              {selectedIndices.length < 3 && (
                <span className="text-slate-500 ml-2 text-xs">{t('exchangeSelectHint')}</span>
              )}
            </div>

            {/* Hand */}
            <div className="hand-fan flex items-end justify-center overflow-visible py-2">
              {sortedHand.map(({ card, originalIndex }) => {
                const isSelected = selectedIndices.includes(originalIndex);
                const isDisabled = !isSelected && selectedIndices.length >= 3;
                return (
                  <CardComponent
                    key={`${card.rank}-${card.suit}-${originalIndex}`}
                    card={card}
                    selected={isSelected}
                    playable={!isDisabled}
                    disabled={isDisabled}
                    onClick={() => handleCardClick(originalIndex)}
                  />
                );
              })}
            </div>

            <button
              className={`btn-primary py-3 text-base font-bold transition-all
                ${selectedIndices.length === 3 ? '' : 'opacity-40 cursor-not-allowed'}`}
              onClick={handleSubmit}
              disabled={selectedIndices.length !== 3}
            >
              {t('exchangeSubmitBtn')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
