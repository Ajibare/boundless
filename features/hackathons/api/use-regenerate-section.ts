'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient, unwrapData } from '@/lib/api';

import type {
  RegenerateDraftSectionBody,
  RegenerateDraftSectionResponse,
} from '../types';
import { hackathonKeys } from './keys';

/**
 * Organizer Assist: regenerate one section of an AI-generated draft. The server
 * owns the suggestion + generationId (persisted on the draft), so the client
 * only names the section plus optional steering instructions. The response
 * carries the regenerated values already in the wizard section shape, ready for
 * the matching step's form to apply. The draft cache is invalidated so a resume
 * reflects the persisted change.
 */
export function useRegenerateDraftSection(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      draftId,
      body,
    }: {
      draftId: string;
      body: RegenerateDraftSectionBody;
    }): Promise<RegenerateDraftSectionResponse> =>
      unwrapData(
        await apiClient.POST(
          '/api/organizations/{organizationId}/hackathons/draft/{id}/regenerate-section',
          { params: { path: { organizationId, id: draftId } }, body }
        )
      ),
    onSuccess: (_result, { draftId }) => {
      queryClient.invalidateQueries({
        queryKey: hackathonKeys.draft(organizationId, draftId),
      });
    },
  });
}
