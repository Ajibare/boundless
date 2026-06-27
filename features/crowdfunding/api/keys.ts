/**
 * React Query key factory for the crowdfunding feature.
 * Co-locating keys here keeps hooks and imperative invalidateQueries calls in sync.
 */
export const crowdfundingKeys = {
  all: ['crowdfunding'] as const,

  // Public list
  list: (page: number, limit: number, filters?: Record<string, unknown>) =>
    [...crowdfundingKeys.all, 'list', { page, limit, ...filters }] as const,

  // Authenticated user's campaigns
  mine: (page: number, limit: number) =>
    [...crowdfundingKeys.all, 'mine', { page, limit }] as const,

  // Covers ALL single-campaign entries regardless of whether they were keyed by
  // UUID or slug. Use this for invalidation when you only have one form of the key.
  campaignPrefix: () => [...crowdfundingKeys.all, 'campaign'] as const,

  // Single campaign (by ID or slug — separate cache entries, same data)
  campaign: (idOrSlug: string) =>
    [...crowdfundingKeys.all, 'campaign', idOrSlug] as const,

  // Milestones for a campaign
  milestones: (campaignId: string) =>
    [...crowdfundingKeys.all, 'milestones', campaignId] as const,

  // Single milestone
  milestone: (campaignId: string, milestoneId: string) =>
    [...crowdfundingKeys.all, 'milestone', campaignId, milestoneId] as const,
};
