/**
 * Accessibility: honor the OS "reduce motion" setting (PRD §8.4 / §13).
 * Non-essential animations should be skipped or shortened when this is true.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
