'use client';

import { useQuery } from '@tanstack/react-query';

import { bountyKeys } from './keys';
import {
  getMyBountySubmission,
  listMyBountyApplications,
  listMyBountySubmissions,
  type MyActivityParams,
} from './participant-dashboard-client';

/**
 * Builder "my bounties" activity reads (boundless-nestjs #332). Until that
 * backend lands the requests 404; React Query surfaces the error and the UI
 * shows an empty/coming-soon state. `retry: false` keeps a missing endpoint
 * from spamming retries.
 */
export function useMyBountyApplications(params: MyActivityParams = {}) {
  return useQuery({
    queryKey: [...bountyKeys.myActivity(), 'applications', params],
    queryFn: () => listMyBountyApplications(params),
    retry: false,
  });
}

export function useMyBountySubmissions(params: MyActivityParams = {}) {
  return useQuery({
    queryKey: [...bountyKeys.myActivity(), 'submissions', params],
    queryFn: () => listMyBountySubmissions(params),
    retry: false,
  });
}

/** The caller's submission for one bounty (drives submit/withdraw gating). */
export function useMyBountySubmission(bountyId: string | undefined) {
  return useQuery({
    queryKey: bountyKeys.mySubmission(bountyId ?? ''),
    queryFn: () => getMyBountySubmission(bountyId as string),
    enabled: !!bountyId,
    retry: false,
  });
}
