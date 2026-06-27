/**
 * React Query key factory for the hackathons feature. Co-locating the keys
 * keeps the hooks and any imperative `queryClient.invalidateQueries` calls in
 * sync.
 */
export const hackathonKeys = {
  all: ['hackathons'] as const,
  drafts: (organizationId: string) =>
    [...hackathonKeys.all, 'drafts', organizationId] as const,
  draft: (organizationId: string, id: string) =>
    [...hackathonKeys.all, 'draft', organizationId, id] as const,
  escrowOp: (scope: string, opRowId: string) =>
    [...hackathonKeys.all, 'escrow-op', scope, opRowId] as const,
};
