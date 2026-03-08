/** Returns the current decay stage (0–6) derived from shadow edicts passed. */
export function useDecayStage(shadowEdictsPassed: number): number {
  return Math.min(Math.max(shadowEdictsPassed, 0), 6);
}
