'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient, unwrapData } from '@/lib/api';

import type {
  GenerateDraftFromBriefBody,
  GenerateDraftFromBriefResponse,
} from '../types';
import { hackathonKeys } from './keys';

/**
 * Organizer Assist: generate a hackathon draft from a brief. The backend calls
 * the AI service, creates + pre-fills a real draft (timeline, prizes, judging),
 * persists the server-owned suggestion, and returns the draft. We seed the
 * draft cache so navigating into the wizard resumes it without a refetch
 * flicker.
 */
export function useGenerateDraftFromBrief(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: GenerateDraftFromBriefBody
    ): Promise<GenerateDraftFromBriefResponse> =>
      unwrapData(
        await apiClient.POST(
          '/api/organizations/{organizationId}/hackathons/draft/from-brief',
          { params: { path: { organizationId } }, body }
        )
      ),
    onSuccess: result => {
      queryClient.setQueryData(
        hackathonKeys.draft(organizationId, result.draftId),
        result.draft
      );
      queryClient.invalidateQueries({
        queryKey: hackathonKeys.drafts(organizationId),
      });
    },
  });
}
