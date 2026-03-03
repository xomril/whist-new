import { Card, SUIT_SYMBOL, Suit } from '../types';

interface Props {
  card: Card;
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  /** Compact size used in the trick area */
  small?: boolean;
  /** Tiny size used in opponent/spectator panels */
  tiny?: boolean;
  onClick?: () => void;
  className?: string;
}

// Classic card-game red vs. near-black (richer than pure black)
const SUIT_COLOR: Record<Suit, string> = {
  hearts:   '#c0392b',
  diamonds: '#c0392b',
  spades:   '#1a1a2e',
  clubs:    '#1a1a2e',
};

export default function CardComponent({
  card, selected, playable, disabled, small, tiny, onClick, className = '',
}: Props) {
  const color  = SUIT_COLOR[card.suit];
  const sym    = SUIT_SYMBOL[card.suit];
  const rank   = card.rank;
  const isRed  = card.suit === 'hearts' || card.suit === 'diamonds';

  // ── size variants ──────────────────────────────────────────────────────────
  const dims = tiny
    ? { w: 38, h: 57,  rankSz: 9,  symSz: 8,  centerSz: 18, pad: 4 }
    : small
    ? { w: 64, h: 96,  rankSz: 13, symSz: 11, centerSz: 28, pad: 6 }
    : { w: 84, h: 124, rankSz: 17, symSz: 14, centerSz: 42, pad: 8 };

  // ── state ring ─────────────────────────────────────────────────────────────
  const ring = selected
    ? '0 0 0 3px #fbbf24, 0 0 20px 4px rgba(251,191,36,0.45)'
    : playable
    ? '0 0 0 2.5px #34d399, 0 0 14px 3px rgba(52,211,153,0.35)'
    : '0 2px 8px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.10)';

  const transform = selected
    ? 'translateY(-22px) scale(1.06)'
    : undefined;

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: tiny ? 4 : 8,
        background: 'linear-gradient(160deg, #ffffff 0%, #faf8f5 100%)',
        border: '1px solid rgba(0,0,0,0.13)',
        boxShadow: ring,
        transform,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: dims.pad,
        cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
        opacity: disabled ? 0.38 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s',
        userSelect: 'none',
        flexShrink: 0,
        zIndex: selected ? 20 : undefined,
      }}
      className={`card-hover-lift ${className}`}
    >
      {/* Thin inner frame — like a real card */}
      {!tiny && (
        <div style={{
          position: 'absolute',
          inset: 3,
          border: `1px solid ${isRed ? 'rgba(192,57,43,0.10)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: tiny ? 2 : 5,
          pointerEvents: 'none',
        }} />
      )}

      {/* ── Top-left corner ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1, color, zIndex: 1 }}>
        <span style={{ fontSize: dims.rankSz, fontWeight: 800, letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
          {rank}
        </span>
        <span style={{ fontSize: dims.symSz, lineHeight: 1, marginTop: 1 }}>{sym}</span>
      </div>

      {/* ── Center suit pip ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: dims.centerSz,
          color,
          opacity: 0.88,
          lineHeight: 1,
          filter: isRed ? 'none' : 'drop-shadow(0 1px 1px rgba(0,0,0,0.08))',
        }}>
          {sym}
        </span>
      </div>

      {/* ── Bottom-right corner (rotated) ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        lineHeight: 1, color, transform: 'rotate(180deg)', zIndex: 1,
      }}>
        <span style={{ fontSize: dims.rankSz, fontWeight: 800, letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
          {rank}
        </span>
        <span style={{ fontSize: dims.symSz, lineHeight: 1, marginTop: 1 }}>{sym}</span>
      </div>
    </div>
  );
}

// ── Face-down card back ────────────────────────────────────────────────────────
export function CardBack({ small, tiny }: { small?: boolean; tiny?: boolean }) {
  const w = tiny ? 34 : small ? 44 : 56;
  const h = tiny ? 51 : small ? 66 : 84;
  const r = tiny ? 4 : 6;

  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #1e3a8a 100%)',
      border: '1px solid #1e40af',
      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      position: 'relative',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Diamond crosshatch pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 6px,
          rgba(255,255,255,0.07) 6px,
          rgba(255,255,255,0.07) 7px
        ), repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 6px,
          rgba(255,255,255,0.07) 6px,
          rgba(255,255,255,0.07) 7px
        )`,
      }} />
      {/* Inner white frame */}
      <div style={{
        position: 'absolute',
        inset: 4,
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: r - 2,
      }} />
    </div>
  );
}
