/**
 * Builder/participant bounty REST client: the public marketplace reads and the
 * v2 application-record surface (off-chain proposal carrier for the application
 * entry types), plus open-competition join/leave.
 *
 * Several backend handlers still return the raw entity without an `@ApiOkResponse`
 * (so the generated schema types them as `never`). Those are cast to the
 * hand-typed `MyBountyApplication` until boundless-nestjs #331 lands and codegen
 * picks up the real DTO.
 */
import { apiClient, unwrapData } from '@/lib/api';

import type {
  BountyPublic,
  BountyPublicList,
  CreateBountyApplicationRequest,
  EditBountyApplicationRequest,
  JoinCompetitionRequest,
  MyBountyApplication,
} from '../types';

export interface BountiesListParams {
  organizationId?: string;
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Public marketplace ────────────────────────────────────────────────────────

/** Paginated public bounty list (the marketplace). */
export const listBounties = async (
  params: BountiesListParams = {}
): Promise<BountyPublicList> =>
  unwrapData(
    await apiClient.GET('/api/bounties', { params: { query: params } })
  );

/** A single public bounty (the detail page). */
export const getBounty = async (bountyId: string): Promise<BountyPublic> =>
  unwrapData(
    await apiClient.GET('/api/bounties/{id}', {
      params: { path: { id: bountyId } },
    })
  );

// ── v2 application records (application entry types) ──────────────────────────

/** The caller's own application for a bounty, or null when they have not applied. */
export const getMyBountyApplication = async (
  bountyId: string
): Promise<MyBountyApplication | null> =>
  (unwrapData(
    await apiClient.GET('/api/bounties/{bountyId}/v2/applications/me', {
      params: { path: { bountyId } },
    })
  ) as unknown as MyBountyApplication | null) ?? null;

/** Submit an application (light / full proposal) for an application-mode bounty. */
export const applyToBounty = async (
  bountyId: string,
  body: CreateBountyApplicationRequest
): Promise<MyBountyApplication> =>
  unwrapData(
    await apiClient.POST('/api/bounties/{bountyId}/v2/applications', {
      params: { path: { bountyId } },
      body,
    })
  ) as unknown as MyBountyApplication;

/** Edit a SUBMITTED application (before shortlist). */
export const editBountyApplication = async (
  bountyId: string,
  appId: string,
  body: EditBountyApplicationRequest
): Promise<MyBountyApplication> =>
  unwrapData(
    await apiClient.PATCH('/api/bounties/{bountyId}/v2/applications/{appId}', {
      params: { path: { bountyId, appId } },
      body,
    })
  ) as unknown as MyBountyApplication;

/** Withdraw a SUBMITTED application (the application record; status -> WITHDRAWN). */
export const withdrawBountyApplication = async (
  bountyId: string,
  appId: string
): Promise<MyBountyApplication> =>
  unwrapData(
    await apiClient.DELETE('/api/bounties/{bountyId}/v2/applications/{appId}', {
      params: { path: { bountyId, appId } },
    })
  ) as unknown as MyBountyApplication;

// ── Open competition join / leave ─────────────────────────────────────────────

/** Join an open competition directly (no application step). */
export const joinCompetition = async (
  bountyId: string,
  body: JoinCompetitionRequest
): Promise<MyBountyApplication> =>
  unwrapData(
    await apiClient.POST('/api/bounties/{bountyId}/v2/competition/join', {
      params: { path: { bountyId } },
      body,
    })
  ) as unknown as MyBountyApplication;

/** Leave an open competition the caller joined. */
export const leaveCompetition = async (
  bountyId: string,
  body: JoinCompetitionRequest
): Promise<MyBountyApplication> =>
  unwrapData(
    await apiClient.DELETE('/api/bounties/{bountyId}/v2/competition/join', {
      params: { path: { bountyId } },
      body,
    })
  ) as unknown as MyBountyApplication;
