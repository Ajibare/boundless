import type { PrizeEntity, PrizeTier } from '@/types/hackathon/core';

/**
 * Flatten the Prize entity into the flat PrizeTier display shape: one tier per
 * placement, with trackIds[0] mapped to kind/trackId. Mirrors the backend's
 * prizesToLegacyTiers so the displayed tiers match the legacy shadow exactly.
 */
export function flattenPrizeEntities(prizes: PrizeEntity[]): PrizeTier[] {
  const tiers: PrizeTier[] = [];
  for (const prize of prizes) {
    const trackId = prize.trackIds?.[0];
    const kind: 'OVERALL' | 'TRACK' = trackId ? 'TRACK' : 'OVERALL';
    for (const pl of prize.placements) {
      tiers.push({
        id: pl.id,
        name: prize.name,
        place: pl.label ?? prize.name,
        prizeAmount: pl.amount,
        currency: pl.currency,
        passMark: pl.passMark,
        kind,
        ...(trackId ? { trackId } : {}),
      });
    }
  }
  return tiers;
}

/**
 * Entity-first display tiers: prefer the Prize entity, fall back to the legacy
 * `prizeTiers` shadow. Use everywhere the UI reads prize tiers so the eventual
 * prizeTiers drop is a no-op for the web app (and so un-migrated hackathons
 * still render from the shadow).
 */
export function effectivePrizeTiers(
  // Loose param so this works across the several frontend Hackathon shapes
  // (types/hackathon/core, lib/api/hackathons, features). `prizeTiers` is still
  // accepted (so existing call sites compile) but no longer read.
  hackathon: { prizes?: unknown; prizeTiers?: unknown } | null | undefined
): PrizeTier[] {
  if (!hackathon) return [];
  // Entity-only: the prizeTiers shadow fallback was removed. The API exposes
  // `prizes` on every hackathon, so display reads rely solely on the entity.
  const prizes = hackathon.prizes as PrizeEntity[] | null | undefined;
  return prizes && prizes.length > 0 ? flattenPrizeEntities(prizes) : [];
}
