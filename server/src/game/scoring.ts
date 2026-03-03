/**
 * Israeli Whist scoring:
 *
 * Zero-bid success:
 *   - Over game  (sum of bids > totalTricks): +25 pts
 *   - Under game (sum of bids < totalTricks): +50 pts
 *
 * Zero-bid failure (took ≥ 1 trick): -25 - 5 × taken
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
    if (taken === 0) return isOverGame ? 25 : 50;
    return -25 - 5 * taken;
  }
  if (bid === taken) return 10 + bid * bid;
  return -10 * Math.abs(bid - taken);
}
