'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, unwrapData } from '@/lib/api';

import type { HackathonDraft, UpdateHackathonDraftBody } from '../types';
import { hackathonKeys } from './keys';

/** Fetch a single draft. Disabled until both ids are present. */
export function useDraft(
  organizationId: string,
  id: string | null | undefined
) {
  return useQuery({
    queryKey:
      organizationId && id
        ? hackathonKeys.draft(organizationId, id)
        : [...hackathonKeys.all, 'draft', 'idle'],
    enabled: Boolean(organizationId && id),
    queryFn: async (): Promise<HackathonDraft> =>
      unwrapData(
        await apiClient.GET(
          '/api/organizations/{organizationId}/hackathons/draft/{id}',
          { params: { path: { organizationId, id: id as string } } }
        )
      ),
  });
}

/** List an organization's drafts (DRAFT + DRAFT_AWAITING_FUNDING). */
export function useDraftList(organizationId: string) {
  return useQuery({
    queryKey: hackathonKeys.drafts(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<HackathonDraft[]> =>
      unwrapData(
        await apiClient.GET(
          '/api/organizations/{organizationId}/hackathons/drafts',
          { params: { path: { organizationId } } }
        )
      ),
  });
}

/** Create an empty draft. */
export function useCreateDraft(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<HackathonDraft> =>
      unwrapData(
        await apiClient.POST(
          '/api/organizations/{organizationId}/hackathons/draft',
          { params: { path: { organizationId } } }
        )
      ),
    onSuccess: draft => {
      queryClient.setQueryData(
        hackathonKeys.draft(organizationId, draft.id),
        draft
      );
      queryClient.invalidateQueries({
        queryKey: hackathonKeys.drafts(organizationId),
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
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateHackathonDraftBody;
    }): Promise<HackathonDraft> =>
      unwrapData(
        await apiClient.PATCH(
          '/api/organizations/{organizationId}/hackathons/draft/{id}',
          { params: { path: { organizationId, id } }, body }
        )
      ),
    onSuccess: draft => {
      queryClient.setQueryData(
        hackathonKeys.draft(organizationId, draft.id),
        draft
      );
    },
  });
}

/** Delete a draft. */
export function useDeleteDraft(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return unwrapData(
        await apiClient.DELETE(
          '/api/organizations/{organizationId}/hackathons/draft/{id}',
          { params: { path: { organizationId, id } } }
        )
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: hackathonKeys.drafts(organizationId),
      }),
  });
}
