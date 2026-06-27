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

  // Builder / participant reads.
  list: (params: Record<string, unknown> = {}) =>
    [...bountyKeys.all, 'list', params] as const,
  detail: (bountyId: string) =>
    [...bountyKeys.all, 'detail', bountyId] as const,
  myApplication: (bountyId: string) =>
    [...bountyKeys.all, 'my-application', bountyId] as const,
  mySubmission: (bountyId: string) =>
    [...bountyKeys.all, 'my-submission', bountyId] as const,
  myActivity: () => [...bountyKeys.all, 'my-activity'] as const,
};
