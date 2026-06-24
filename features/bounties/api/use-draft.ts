'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBountyDraft,
  deleteBountyDraft,
  getBountyDraft,
  listBountyDrafts,
  updateBountyDraft,
} from './draft-client';
import type { BountyDraft, UpdateBountyDraftBody } from '../types';
import { bountyKeys } from './keys';

/** Fetch a single draft. Disabled until both ids are present. */
export function useDraft(
  organizationId: string,
  id: string | null | undefined
) {
  return useQuery({
    queryKey:
      organizationId && id
        ? bountyKeys.draft(organizationId, id)
        : [...bountyKeys.all, 'draft', 'idle'],
    enabled: Boolean(organizationId && id),
    queryFn: (): Promise<BountyDraft> =>
      getBountyDraft(organizationId, id as string),
  });
}

/** List an organization's drafts (draft + draft_awaiting_funding). */
export function useDraftList(organizationId: string) {
  return useQuery({
    queryKey: bountyKeys.drafts(organizationId),
    enabled: Boolean(organizationId),
    queryFn: (): Promise<BountyDraft[]> => listBountyDrafts(organizationId),
  });
}

/** Create an empty draft. */
export function useCreateDraft(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<BountyDraft> => createBountyDraft(organizationId),
    onSuccess: draft => {
      queryClient.setQueryData(
        bountyKeys.draft(organizationId, draft.id),
        draft
      );
      queryClient.invalidateQueries({
        queryKey: bountyKeys.drafts(organizationId),
      });
    },
  });
}

/**
 * Update one or more draft sections in a single flat PATCH. Send one section
 * for a per-step "Continue", or several for "Save draft". The draft id is passed
 * per-call (so a create-then-update sequence can use the fresh id with no stale
 * closure). Seeds the draft cache with the server copy so reads stay in sync.
 */
export function useUpdateDraft(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateBountyDraftBody;
    }): Promise<BountyDraft> => updateBountyDraft(organizationId, id, body),
    onSuccess: draft => {
      queryClient.setQueryData(
        bountyKeys.draft(organizationId, draft.id),
        draft
      );
    },
  });
}

/** Delete a draft. */
export function useDeleteDraft(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> => {
      return deleteBountyDraft(organizationId, id).then(() => undefined);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: bountyKeys.drafts(organizationId),
      }),
  });
}
