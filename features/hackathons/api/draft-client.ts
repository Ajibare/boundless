/**
 * Non-hook draft client calls on the typed openapi-fetch client. These keep the
 * call signatures of the old lib/api/hackathons/draft.ts helpers so existing
 * imperative callers only change their import path.
 */
import { apiClient, unwrapData } from '@/lib/api';

export interface DeleteDraftResult {
  success: true;
  message: string;
  data: null;
}

/** Delete a draft hackathon. Signature matches the legacy helper. */
export const deleteDraft = async (
  draftId: string,
  organizationId: string
): Promise<DeleteDraftResult> => {
  // 204 No Content on success; unwrapData throws a typed ApiError on failure.
  await unwrapData(
    await apiClient.DELETE(
      '/api/organizations/{organizationId}/hackathons/draft/{id}',
      { params: { path: { organizationId, id: draftId } } }
    )
  );
  return { success: true, message: 'Deleted successfully', data: null };
};

export interface AnnouncementAudiencePreview {
  audienceSize: number;
}

/** Preview how many subscribers would receive the launch announcement email. */
export const previewAnnouncementAudience = async (
  draftIdOrHackathonId: string,
  organizationId: string
): Promise<AnnouncementAudiencePreview> => {
  const data = await unwrapData(
    await apiClient.GET(
      '/api/organizations/{organizationId}/hackathons/hackathons/{id}/announcement-preview',
      { params: { path: { organizationId, id: draftIdOrHackathonId } } }
    )
  );
  // The announcement-preview response is not modelled in the OpenAPI schema yet,
  // so `data` is untyped; the endpoint returns { audienceSize } at runtime.
  return (
    (data as unknown as AnnouncementAudiencePreview | undefined) ?? {
      audienceSize: 0,
    }
  );
};
