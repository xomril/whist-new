export function calcDisplayScore(bid: number, taken: number, isOverGame: boolean): number {
  if (bid === 0) {
    if (taken === 0) return isOverGame ? 25 : 50;
    return -25 - 5 * taken;
  }
  if (bid === taken) return 10 + bid * bid;
  return -10 * Math.abs(bid - taken);
}
