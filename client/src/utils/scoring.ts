export function calcDisplayScore(bid: number, taken: number, isOverGame: boolean): number {
  if (bid === 0) {
    if (taken === 0) return isOverGame ? 30 : 50;
    const base = isOverGame ? -30 : -50;
    return base + 10 * (taken - 1);
  }
  if (bid === taken) return 10 + bid * bid;
  return -10 * Math.abs(bid - taken);
}
