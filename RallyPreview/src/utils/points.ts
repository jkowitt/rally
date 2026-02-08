/**
 * Points utility functions for the Rally app.
 */

/** Tier thresholds in ascending order. */
const TIERS = [
  { name: 'Hall of Fame', min: 15000 },
  { name: 'MVP', min: 5000 },
  { name: 'All-Star', min: 2000 },
  { name: 'Starter', min: 500 },
  { name: 'Rookie', min: 0 },
] as const;

/**
 * Format a number with commas and append " pts".
 * e.g. 1250 -> "1,250 pts"
 */
export function formatPoints(n: number): string {
  return `${n.toLocaleString('en-US')} pts`;
}

/**
 * Format a number with commas (no suffix).
 * e.g. 1250 -> "1,250"
 */
export function formatPointsShort(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Compute progress between two tier thresholds as a 0-1 float.
 * Returns 1 if currentMin === nextMin to avoid division by zero.
 */
export function computeTierProgress(
  balance: number,
  currentMin: number,
  nextMin: number,
): number {
  if (nextMin <= currentMin) return 1;
  const progress = (balance - currentMin) / (nextMin - currentMin);
  return Math.min(1, Math.max(0, progress));
}

/**
 * Determine the tier for a given totalEarned value.
 * Thresholds: Rookie(0), Starter(500), All-Star(2000), MVP(5000), Hall of Fame(15000)
 */
export function getTierForPoints(totalEarned: number): {
  name: string;
  min: number;
  next: string | null;
  nextMin: number | null;
} {
  // Walk from highest tier downward to find the matching tier.
  for (let i = 0; i < TIERS.length; i++) {
    if (totalEarned >= TIERS[i].min) {
      const nextTier = i > 0 ? TIERS[i - 1] : null;
      return {
        name: TIERS[i].name,
        min: TIERS[i].min,
        next: nextTier ? nextTier.name : null,
        nextMin: nextTier ? nextTier.min : null,
      };
    }
  }

  // Fallback (should never reach here since Rookie min is 0).
  return { name: 'Rookie', min: 0, next: 'Starter', nextMin: 500 };
}

/**
 * Check whether a balance can cover a given cost.
 */
export function canAfford(balance: number, cost: number): boolean {
  return balance >= cost;
}
