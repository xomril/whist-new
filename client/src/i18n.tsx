import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TrumpSuit } from './types';

export type Lang = 'en' | 'he';

const T = {
  en: {
    // Lobby
    title: 'Israeli Whist',
    subtitle: 'Online Multiplayer Card Game',
    tabCreate: 'Create',
    tabJoin: 'Join',
    tabWatch: '👁 Watch',
    labelName: 'Your Name',
    placeholderName: 'Enter your name...',
    labelPlayers: 'Players',
    nPlayers: '{0} Players',
    labelRounds: 'Rounds: {0}',
    roundsShort: '5 (short)',
    roundsLong: '20 (long)',
    btnCreate: 'Create Room',
    btnCreating: 'Creating...',
    labelRoomCode: 'Room Code',
    btnJoin: 'Join Room',
    btnJoining: 'Joining...',
    watchHint: 'Watch a live game — all cards visible, no actions',
    btnWatch: '👁 Watch Game',
    btnConnecting: 'Connecting...',
    howToPlay: 'How to play',
    rule1Label: 'Phase 1:',
    rule1: 'Bid to win the trump suit (highest bid wins)',
    rule2Label: 'Phase 2:',
    rule2: "Each player bids how many tricks they'll take",
    rule3Label: 'Exact bid:',
    rule3: '+10 + bid² points',
    rule4Label: 'Wrong bid:',
    rule4: '-10 × difference',
    rule5Label: 'Zero bid success:',
    rule5: '+50 (down) / +30 (up); fail: -50/-30 +10 per extra trick',
    // WaitingRoom
    waitingRoom: 'Waiting Room',
    playersStatus: '{0}/{1} players joined',
    waitingEllipsis: 'waiting…',
    startingSoon: 'starting soon!',
    rounds: 'Rounds: {0}',
    fillBots: '🤖 Fill with Bots',
    tagHost: 'Host',
    tagBot: 'Bot',
    waitingForHost: 'Waiting for host to start the game',
    // GameBoard top bar
    handOf: 'Hand {0} / {1}',
    trump: 'Trump: {0}',
    over: 'UP',
    under: 'DOWN',
    trick: 'Trick {0}/{1}',
    // BidPhase1
    bid1Title: 'Phase 1 · Choose Trump',
    currentHighBid: 'Current high bid:',
    noBidsYet: 'No bids yet — min {0} tricks',
    tricksWith: 'tricks with',
    btnBid: 'Bid {0} {1}',
    btnPass: 'Pass',
    btnConfirmBid: 'Confirm ✓',
    declarerConfirmTitle: 'You won the bid!',
    declarerConfirmHint: 'Confirm your bid or raise it higher',
    waitingBid: 'Waiting for player to bid…',
    waitingDeclarerConfirm: 'Waiting for declarer to confirm or raise…',
    // BidPhase2
    bid2Title: 'Phase 2 · Bid Tricks',
    bid2Question: 'How many tricks will you take?',
    cannotBid: 'Cannot bid {0}',
    btnBidTricks: 'Bid {0} trick{1}',
    // TrickArea
    noCardsYet: 'No cards played yet',
    wonTrick: '{0} won the trick!',
    // Scoreboard
    scoresHeader: 'Scores · Hand {0}',
    colPlayer: 'Player',
    colBid1: 'Bid1',
    colBid2: 'Bid2',
    colWon: 'Won',
    colScore: 'Score',
    roundOf: 'Round {0} of {1}',
    // HandSummary
    handOver: 'Hand {0} Over',
    totalScores: 'Total Scores',
    dealNextHand: 'Deal Next Hand →',
    waitingDeal: 'Waiting for a player to deal next hand…',
    bidLabel: 'bid',
    tookLabel: 'took',
    overGame: 'UP game',
    underGame: 'DOWN game',
    // GameOver
    youWin: 'You Win!',
    xWins: '{0} Wins!',
    afterHands: 'After {0} hands · Final Scores',
    playAgain: 'Play Again',
    thanksPlaying: 'Thanks for playing!',
    // Spectator
    spectating: '👁 Spectating',
    phase1Bid: '🎯 Trump Bid',
    phase2Bid: '🔢 Trick Bid',
    phasePlay: '🃏 Playing',
    phase1Info: '🎯 Phase 1 — bidding for trump',
    phase2Info: '🔢 Phase 2 — bidding trick count',
    turnToBid: "{0}'s turn to bid",
    currentHigh: 'Current high: {0} {1}',
    sTurn: "{0}'s turn",
    // Trump suit names
    trump_clubs: '♣ Clubs',
    trump_diamonds: '♦ Diamonds',
    trump_hearts: '♥ Hearts',
    trump_spades: '♠ Spades',
    trump_notrumps: 'No Trumps',
    // History modal
    historyBtn: 'History',
    lastTrickBtn: 'Last Trick',
    historyTitle: 'Round History',
    historyHand: 'Hand',
    historyTrump: 'Trump',
    historyType: 'Type',
    historyPlayer: 'Player',
    historyBid: 'Bid',
    historyTook: 'Took',
    historyDelta: '±',
    historyTotal: 'Total',
    historyOver: 'UP',
    historyUnder: 'DOWN',
    historyClose: 'Close',
    // Turn reminder
    turnReminderMsg: "It's your turn — don't forget to play!",
    turnReminderDismiss: 'OK',
    // Card exchange
    exchangeTitle: 'Card Exchange — Round {0} of 3',
    exchangeDirectionRight: 'Pass 3 cards to the player on your Right',
    exchangeDirectionOpposite: 'Pass 3 cards to the player Opposite you',
    exchangeDirectionLeft: 'Pass 3 cards to the player on your Left',
    exchangePassTo: 'Passing to: {0}',
    exchangeSelectHint: 'Select exactly 3 cards from your hand',
    exchangeSelected: '{0}/3 cards selected',
    exchangeSubmitBtn: 'Pass Cards',
    exchangeWaiting: 'Cards sent — waiting for {0} more player{1}…',
    exchangeRoundLabel: 'All players passed — exchanging cards',
    // Language toggle
    switchLang: 'עברית',
  },
  he: {
    // Lobby
    title: 'וויסט ישראלי',
    subtitle: 'משחק קלפים מרובה משתתפים',
    tabCreate: 'צור',
    tabJoin: 'הצטרף',
    tabWatch: '👁 צפה',
    labelName: 'שמך',
    placeholderName: 'הכנס את שמך...',
    labelPlayers: 'שחקנים',
    nPlayers: '{0} שחקנים',
    labelRounds: 'סיבובים: {0}',
    roundsShort: '5 (קצר)',
    roundsLong: '20 (ארוך)',
    btnCreate: 'צור חדר',
    btnCreating: 'יוצר...',
    labelRoomCode: 'קוד חדר',
    btnJoin: 'הצטרף לחדר',
    btnJoining: 'מצטרף...',
    watchHint: 'צפה במשחק חי — כל הקלפים גלויים, ללא פעולות',
    btnWatch: '👁 צפה במשחק',
    btnConnecting: 'מתחבר...',
    howToPlay: 'איך משחקים',
    rule1Label: 'שלב 1:',
    rule1: 'הצע כדי לזכות בצבע השליט (ההצעה הגבוהה ביותר מנצחת)',
    rule2Label: 'שלב 2:',
    rule2: 'כל שחקן מציע כמה לקיחות ייקח',
    rule3Label: 'הצעה מדויקת:',
    rule3: '+10 + הצעה² נקודות',
    rule4Label: 'הצעה שגויה:',
    rule4: '-10 × הפרש',
    rule5Label: 'הצעת אפס:',
    rule5: '+50 (מתחת) / +25 (מעל)',
    // WaitingRoom
    waitingRoom: 'חדר המתנה',
    playersStatus: '{0}/{1} שחקנים הצטרפו',
    waitingEllipsis: 'ממתין...',
    startingSoon: 'מתחיל בקרוב!',
    rounds: 'סיבובים: {0}',
    fillBots: '🤖 מלא בבוטים',
    tagHost: 'מארח',
    tagBot: 'בוט',
    waitingForHost: 'ממתין למארח להתחיל את המשחק',
    // GameBoard top bar
    handOf: 'יד {0} / {1}',
    trump: 'שליט: {0}',
    over: 'UP',
    under: 'DOWN',
    trick: 'לקיחה {0}/{1}',
    // BidPhase1
    bid1Title: 'שלב 1 · בחר שליט',
    currentHighBid: 'הצעה גבוהה נוכחית:',
    noBidsYet: 'אין הצעות — מינימום {0} לקיחות',
    tricksWith: 'לקיחות עם',
    btnBid: 'הצע {0} {1}',
    btnPass: 'פס',
    btnConfirmBid: 'אשר ✓',
    declarerConfirmTitle: 'זכית בהצעה!',
    declarerConfirmHint: 'אשר את הצעתך או העלה אותה',
    waitingBid: 'ממתין להצעה...',
    waitingDeclarerConfirm: 'ממתין לממצהיר לאשר או להעלות...',
    // BidPhase2
    bid2Title: 'שלב 2 · הצע לקיחות',
    bid2Question: 'כמה לקיחות תיקח?',
    cannotBid: 'אסור להציע {0}',
    btnBidTricks: 'הצע {0} לקיחות',
    // TrickArea
    noCardsYet: 'טרם שוחקו קלפים',
    wonTrick: '{0} זכה בלקיחה!',
    // Scoreboard
    scoresHeader: 'ניקוד · יד {0}',
    colPlayer: 'שחקן',
    colBid1: 'שלב 1',
    colBid2: 'שלב 2',
    colWon: 'זכה',
    colScore: 'ניקוד',
    roundOf: 'סיבוב {0} מתוך {1}',
    // HandSummary
    handOver: 'יד {0} הסתיימה',
    totalScores: 'ניקוד כולל',
    dealNextHand: '← חלק יד הבאה',
    waitingDeal: 'ממתין לחלוקת יד הבאה...',
    bidLabel: 'הציע',
    tookLabel: 'לקח',
    overGame: 'משחק UP',
    underGame: 'משחק DOWN',
    // GameOver
    youWin: 'ניצחת!',
    xWins: '{0} ניצח!',
    afterHands: 'אחרי {0} ידות · ניקוד סופי',
    playAgain: 'שחק שוב',
    thanksPlaying: 'תודה שיחקת!',
    // Spectator
    spectating: '👁 צופה',
    phase1Bid: '🎯 הצעת שליט',
    phase2Bid: '🔢 הצעת לקיחות',
    phasePlay: '🃏 משחק',
    phase1Info: '🎯 שלב 1 — הצעה לשליט',
    phase2Info: '🔢 שלב 2 — הצעת לקיחות',
    turnToBid: 'תור של {0} להציע',
    currentHigh: 'הצעה גבוהה: {0} {1}',
    sTurn: 'תור של {0}',
    // Trump suit names
    trump_clubs: '♣ תלתן',
    trump_diamonds: '♦ יהלום',
    trump_hearts: '♥ לבבות',
    trump_spades: '♠ עלה',
    trump_notrumps: 'ללא שליט',
    // History modal
    historyBtn: 'היסטוריה',
    lastTrickBtn: 'תרגיל אחרון',
    historyTitle: 'היסטוריית סיבובים',
    historyHand: 'יד',
    historyTrump: 'שליט',
    historyType: 'סוג',
    historyPlayer: 'שחקן',
    historyBid: 'הצעה',
    historyTook: 'לקח',
    historyDelta: '±',
    historyTotal: 'סה"כ',
    historyOver: 'UP',
    historyUnder: 'DOWN',
    historyClose: 'סגור',
    // Turn reminder
    turnReminderMsg: 'תורך — אל תשכח לשחק!',
    turnReminderDismiss: 'אוקיי',
    // Card exchange
    exchangeTitle: 'חלפת קלפים — סיבוב {0} מתוך 3',
    exchangeDirectionRight: 'העבר 3 קלפים לשחקן מימינך',
    exchangeDirectionOpposite: 'העבר 3 קלפים לשחקן מולך',
    exchangeDirectionLeft: 'העבר 3 קלפים לשחקן משמאלך',
    exchangePassTo: 'מעביר ל: {0}',
    exchangeSelectHint: 'בחר בדיוק 3 קלפים מהיד שלך',
    exchangeSelected: '{0}/3 קלפים נבחרו',
    exchangeSubmitBtn: 'העבר קלפים',
    exchangeWaiting: 'קלפים נשלחו — ממתין ל-{0} שחקנ{1} נוסף{1}…',
    exchangeRoundLabel: 'כל השחקנים פסו — מחליפים קלפים',
    // Language toggle
    switchLang: 'English',
  },
} as const;

export type TKey = keyof typeof T.en;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, ...args: (string | number)[]) => string;
  tTrump: (suit: TrumpSuit) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'en', setLang: () => {},
  t: k => k, tTrump: s => s,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem('whist_lang') as Lang) ?? 'en'
  );

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('whist_lang', l);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TKey, ...args: (string | number)[]) => {
    const str = (T[lang] as Record<string, string>)[key]
             ?? (T.en as Record<string, string>)[key]
             ?? key;
    return str.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
  };

  const tTrump = (suit: TrumpSuit) =>
    t(`trump_${suit}` as TKey);

  return (
    <Ctx.Provider value={{ lang, setLang, t, tTrump }}>
      {children}
    </Ctx.Provider>
  );
}

export function useT() { return useContext(Ctx); }

export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useT();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
      className={`text-xs px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800/70
                  text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-medium ${className}`}
    >
      {t('switchLang')}
    </button>
  );
}
