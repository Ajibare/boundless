/**
 * Non-hook bounty draft client calls on the typed openapi-fetch client. These
 * back the React Query hooks in use-draft.ts and are available for imperative
 * callers (e.g. a create-then-update sequence in the wizard machinery, #598).
 * The response envelope is unwrapped by the apiClient middleware.
 */
import { apiClient, unwrapData } from '@/lib/api';

import type { BountyDraft, UpdateBountyDraftBody } from '../types';

/** Create an empty bounty draft in `draft` status. */
export const createBountyDraft = async (
  organizationId: string
): Promise<BountyDraft> =>
  unwrapData(
    await apiClient.POST('/api/organizations/{organizationId}/bounties/draft', {
      params: { path: { organizationId } },
    })
  );

/** Apply one or more wizard sections in a single PATCH. */
export const updateBountyDraft = async (
  organizationId: string,
  id: string,
  body: UpdateBountyDraftBody
): Promise<BountyDraft> =>
  unwrapData(
    await apiClient.PATCH(
      '/api/organizations/{organizationId}/bounties/draft/{id}',
      { params: { path: { organizationId, id } }, body }
    )
  );

/** Fetch a single draft for resume. */
export const getBountyDraft = async (
  organizationId: string,
  id: string
): Promise<BountyDraft> =>
  unwrapData(
    await apiClient.GET(
      '/api/organizations/{organizationId}/bounties/draft/{id}',
      { params: { path: { organizationId, id } } }
    )
  );

/** List an organization's drafts (draft + draft_awaiting_funding). */
export const listBountyDrafts = async (
  organizationId: string
): Promise<BountyDraft[]> =>
  unwrapData(
    await apiClient.GET('/api/organizations/{organizationId}/bounties/drafts', {
      params: { path: { organizationId } },
    })
  );

export interface DeleteBountyDraftResult {
  success: true;
  message: string;
  data: null;
}

/** Delete a draft. 204 No Content on success. */
export const deleteBountyDraft = async (
  organizationId: string,
  id: string
): Promise<DeleteBountyDraftResult> => {
  await unwrapData(
    await apiClient.DELETE(
      '/api/organizations/{organizationId}/bounties/draft/{id}',
      { params: { path: { organizationId, id } } }
    )
  );
  return { success: true, message: 'Deleted successfully', data: null };
};
