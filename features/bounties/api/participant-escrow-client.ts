/**
 * Builder/participant bounty escrow client (boundless-events contract), on the
 * typed openapi-fetch client. Counterpart to the organizer `escrow-client.ts`:
 * these are the participant-scoped, no-org-prefix routes (`/api/bounties/{id}/
 * escrow/...`) the builder lifecycle drives through the shared escrow runner.
 *
 * Like the organizer ops, each builds an EscrowOp:
 *   MANAGED  : backend signs with the caller's platform-held wallet + submits;
 *              the op returns in PENDING_CONFIRM (the webapp only polls).
 *   EXTERNAL : backend returns `unsignedXdr`; the webapp signs with a connected
 *              wallet and POSTs to submit-signed, then polls.
 */
import { apiClient, unwrapData } from '@/lib/api';

import type {
  ApplyBountyRequest,
  BountyEscrowOpResponse,
  ContributeBountyRequest,
  SubmitBountyRequest,
  SubmitSignedXdrRequest,
  WithdrawApplicationRequest,
  WithdrawSubmissionRequest,
} from '../types';

/** Apply to a bounty on-chain (APPLY_TO_BOUNTY; charges application credits). */
export const applyToBountyEscrow = async (
  bountyId: string,
  body: ApplyBountyRequest
): Promise<BountyEscrowOpResponse> =>
  unwrapData(
    await apiClient.POST('/api/bounties/{id}/escrow/apply', {
      params: { path: { id: bountyId } },
      body,
    })
  );

/** Withdraw a bounty application (refunds half the application credits). */
export const withdrawBountyApplicationEscrow = async (
  bountyId: string,
  body: WithdrawApplicationRequest
): Promise<BountyEscrowOpResponse> =>
  unwrapData(
    await apiClient.POST('/api/bounties/{id}/escrow/withdraw-application', {
      params: { path: { id: bountyId } },
      body,
    })
  );

/** Anchor a work submission on-chain (SUBMIT; requires an active application). */
export const submitBountyWorkEscrow = async (
  bountyId: string,
  body: SubmitBountyRequest
): Promise<BountyEscrowOpResponse> =>
  unwrapData(
    await apiClient.POST('/api/bounties/{id}/escrow/submit', {
      params: { path: { id: bountyId } },
      body,
    })
  );

/** Withdraw a submission anchor. */
export const withdrawBountySubmissionEscrow = async (
  bountyId: string,
  body: WithdrawSubmissionRequest
): Promise<BountyEscrowOpResponse> =>
  unwrapData(
    await apiClient.POST('/api/bounties/{id}/escrow/withdraw-submission', {
      params: { path: { id: bountyId } },
      body,
    })
  );

/** Contribute funds to a bounty's escrow pool (ADD_FUNDS; 10 USDC minimum). */
export const contributeToBountyEscrow = async (
  bountyId: string,
  body: ContributeBountyRequest
): Promise<BountyEscrowOpResponse> =>
  unwrapData(
    await apiClient.POST('/api/bounties/{id}/escrow/contribute', {
      params: { path: { id: bountyId } },
      body,
    })
  );

/** Submit a wallet-signed XDR for a participant op (EXTERNAL path). */
export const submitSignedParticipantBounty = async (
  bountyId: string,
  opRowId: string,
  body: SubmitSignedXdrRequest
): Promise<BountyEscrowOpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/bounties/{id}/escrow/ops/{opRowId}/submit-signed',
      { params: { path: { id: bountyId, opRowId } }, body }
    )
  );

/** Poll the current state of a participant escrow op. */
export const getParticipantBountyOp = async (
  bountyId: string,
  opRowId: string
): Promise<BountyEscrowOpResponse> =>
  unwrapData(
    await apiClient.GET('/api/bounties/{id}/escrow/ops/{opRowId}', {
      params: { path: { id: bountyId, opRowId } },
    })
  );
