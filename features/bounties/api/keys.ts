/**
 * React Query key factory for the bounties feature. Co-locating the keys keeps
 * the hooks and any imperative `queryClient.invalidateQueries` calls in sync.
 */
export const bountyKeys = {
  all: ['bounties'] as const,
  drafts: (organizationId: string) =>
    [...bountyKeys.all, 'drafts', organizationId] as const,
  draft: (organizationId: string, id: string) =>
    [...bountyKeys.all, 'draft', organizationId, id] as const,
  escrowOp: (scope: string, opRowId: string) =>
    [...bountyKeys.all, 'escrow-op', scope, opRowId] as const,
};
