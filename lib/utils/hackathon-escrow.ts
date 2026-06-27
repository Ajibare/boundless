import { RewardsFormData } from '@/components/organization/hackathons/new/tabs/schemas/rewardsSchema';
import type { WinnerDistributionEntry } from '@/features/hackathons';

/**
 * Hackathon prize-pool math helpers.
 *
 * The escrow itself is now created through the boundless-events contract via
 * `lib/api/hackathons/escrow.ts` + `features/hackathons/api/use-escrow.ts`.
 * The TrustlessWork payload builders that used to live here are gone; what
 * remains is the pure prize-pool / fee math the configure + publish flows use.
 */

/**
 * Platform fee percentage. Mirrors the boundless-events contract's default
 * fee_bps (250 bps = 2.5%), charged on top of the prize budget at publish (the
 * owner is debited budget + fee). Keep in sync with the contract default.
 */
export const PLATFORM_FEE = 2.5;

/**
 * Boundless platform wallet address
 * Must be set via NEXT_PUBLIC_BOUNDLESS_PLATFORM_ADDRESS in production.
 */
const BOUNDLESS_PLATFORM_ADDRESS =
  process.env.NEXT_PUBLIC_BOUNDLESS_PLATFORM_ADDRESS ?? '';

/**
 * Get Boundless platform wallet address
 * @returns The Boundless platform wallet address
 * @throws Error if not configured
 */
export const getBoundlessPlatformAddress = (): string => {
  if (!BOUNDLESS_PLATFORM_ADDRESS) {
    throw new Error(
      'Boundless platform address not configured. Please set NEXT_PUBLIC_BOUNDLESS_PLATFORM_ADDRESS environment variable.'
    );
  }
  return BOUNDLESS_PLATFORM_ADDRESS;
};

/**
 * Extract rank number from position string
 * Handles formats like "1st Place", "2nd", "3", "Third Place", etc.
 * @param position - Position string (e.g., "2nd Place", "2", "2nd")
 * @returns Rank number or null if not found
 */
export const extractRankFromPosition = (
  position: string | undefined | null
): number | null => {
  if (!position) return null;

  // Remove "Place" and trim, convert to lowercase
  const cleaned = position.toLowerCase().replace(/place/g, '').trim();

  // Try to extract number directly (e.g., "2", "2nd", "2nd place")
  const numberMatch = cleaned.match(/^(\d+)/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }

  // Handle ordinal formats: "1st", "2nd", "3rd", "4th", etc.
  const ordinalMatch = cleaned.match(/^(\d+)(st|nd|rd|th)/);
  if (ordinalMatch) {
    return parseInt(ordinalMatch[1], 10);
  }

  // Handle word formats: "first", "second", "third", etc.
  const wordMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
    eleventh: 11,
    twelfth: 12,
    thirteenth: 13,
    fourteenth: 14,
    fifteenth: 15,
  };

  for (const [word, num] of Object.entries(wordMap)) {
    if (cleaned.includes(word)) {
      return num;
    }
  }

  return null;
};

/**
 * Calculate total prize pool amount from prize tiers (token-native units).
 * @param rewards - Rewards form data containing prize tiers
 * @returns Total prize amount
 */
export const calculateTotalPrizeAmount = (rewards: RewardsFormData): number => {
  if (!rewards.prizeTiers || rewards.prizeTiers.length === 0) {
    return 0;
  }

  return rewards.prizeTiers.reduce((total, tier) => {
    const amount = parseFloat(tier.prizeAmount || '0');

    return total + amount;
  }, 0);
};

/**
 * Calculate platform fee amount from total prize pool
 * @param totalPrizePool - Total prize pool amount
 * @param platformFeePercentage - Platform fee percentage (default: PLATFORM_FEE)
 * @returns Platform fee amount
 */
export const calculatePlatformFeeAmount = (
  totalPrizePool: number,
  platformFeePercentage: number = PLATFORM_FEE
): number => {
  return (totalPrizePool * platformFeePercentage) / 100;
};

/**
 * Calculate total funding amount including platform fee
 * This ensures winners receive full prize amounts after platform fee deduction
 * @param rewards - Rewards form data containing prize tiers
 * @param platformFeePercentage - Platform fee percentage (default: PLATFORM_FEE)
 * @returns Total amount including platform fee
 */
export const calculateTotalFundingWithPlatformFee = (
  rewards: RewardsFormData,
  platformFeePercentage: number = PLATFORM_FEE
): number => {
  const totalPrizePool = calculateTotalPrizeAmount(rewards);
  const platformFee = calculatePlatformFeeAmount(
    totalPrizePool,
    platformFeePercentage
  );
  return totalPrizePool + platformFee;
};

/**
 * Get total prize pool amount for funding (including platform fee)
 * This is the amount that will be locked in escrow
 * @param rewards - Rewards form data containing prize tiers
 * @returns Total amount including platform fee
 */
export const getTotalPrizePoolForFunding = (
  rewards: RewardsFormData
): number => {
  return calculateTotalFundingWithPlatformFee(rewards);
};

/**
 * Derive the on-chain winner distribution ([{position, percent}], summing to
 * exactly 100) from the configured OVERALL prize tiers, proportional to each
 * tier's prize amount.
 *
 * The events contract requires unique positions, each percent >= 1, and the
 * set summing to exactly 100. We give every tier a base of 1 percent then
 * distribute the remaining points by amount-weighted largest-remainder, so the
 * totals are always exact regardless of rounding. Returns undefined when there
 * are no fundable overall tiers (caller lets the backend default to 100% @ #1).
 */
export const buildWinnerDistribution = (
  rewards: RewardsFormData
): WinnerDistributionEntry[] | undefined => {
  // Only OVERALL tiers fund the on-chain winner_distribution; TRACK prizes are
  // a separate concept and not part of the events-contract payout split.
  const overall = (rewards.prizeTiers ?? []).filter(t => t.kind !== 'TRACK');

  // Merge by position (defensive: duplicate places sum their amounts).
  const byPosition = new Map<number, number>();
  for (const tier of overall) {
    const position = extractRankFromPosition(tier.place);
    const amount = parseFloat(tier.prizeAmount || '0');
    if (position == null || position < 1 || !(amount > 0)) continue;
    byPosition.set(position, (byPosition.get(position) ?? 0) + amount);
  }

  const entries = [...byPosition.entries()]
    .map(([position, amount]) => ({ position, amount }))
    .sort((a, b) => a.position - b.position);

  if (entries.length === 0) return undefined;

  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  if (!(total > 0)) return undefined;

  // Single tier (or everything to one position) -> 100% there.
  if (entries.length === 1) {
    return [{ position: entries[0].position, percent: 100 }];
  }

  const n = entries.length;
  const remaining = 100 - n; // points to spread on top of the base 1-each
  const spread = entries.map(e => {
    const exact = (e.amount / total) * remaining;
    const floor = Math.floor(exact);
    return { position: e.position, extra: floor, remainder: exact - floor };
  });

  let used = spread.reduce((sum, s) => sum + s.extra, 0);
  const byRemainder = [...spread].sort((a, b) => b.remainder - a.remainder);
  let i = 0;
  while (used < remaining && byRemainder.length > 0) {
    byRemainder[i % byRemainder.length].extra += 1;
    used += 1;
    i += 1;
  }

  return spread
    .map(s => ({ position: s.position, percent: 1 + s.extra }))
    .sort((a, b) => a.position - b.position);
};
