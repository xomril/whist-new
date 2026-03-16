/**
 * Israeli Whist scoring:
 *
 * Zero-bid success:
 *   - UP game   (sum of bids > totalTricks): +30 pts
 *   - DOWN game (sum of bids < totalTricks): +50 pts
 *
 * Zero-bid failure (took ≥ 1):
 *   - UP game:   -30 + 10 × (taken - 1)
 *   - DOWN game: -50 + 10 × (taken - 1)
 *
 * Non-zero bid:
 *   - Exact match: +10 + bid²
 *   - Miss: -10 × |bid − taken|
 */
export function calcScore(
  bid: number,
  taken: number,
  isOverGame: boolean
): number {
  if (bid === 0) {
    if (taken === 0) return isOverGame ? 30 : 50;
    const base = isOverGame ? -30 : -50;
    return base + 10 * (taken - 1);
  }
  if (bid === taken) return 10 + bid * bid;
  return -10 * Math.abs(bid - taken);
}
