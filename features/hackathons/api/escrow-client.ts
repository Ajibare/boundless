/**
 * Hackathon escrow API client (boundless-events contract), on the typed
 * openapi-fetch client. Replaces the hand-typed axios layer at
 * lib/api/hackathons/escrow.ts: request/response shapes now come from the
 * backend-generated schema, and the response envelope is unwrapped by the
 * apiClient middleware.
 *
 * Every action builds an EscrowOp the webapp drives through its lifecycle:
 *   PENDING_BUILD -> PENDING_SIGN -> PENDING_SUBMIT -> PENDING_CONFIRM
 *                 -> COMPLETED | FAILED | CANCELLED
 *
 *   MANAGED  : backend signs with the caller's platform-held wallet + submits;
 *              the op returns in PENDING_CONFIRM. The webapp only polls.
 *   EXTERNAL : backend returns `unsignedXdr`; the webapp signs with a connected
 *              wallet and POSTs to submit-signed, then polls.
 */
import { apiClient, unwrapData } from '@/lib/api';

import type {
  AnchorHackathonSubmissionRequest,
  CancelHackathonEscrowRequest,
  EscrowOpResponse,
  PublishHackathonEscrowRequest,
  RequestFundingOtpResponse,
  SelectHackathonWinnersRequest,
  SubmitSignedXdrRequest,
  VerifyFundingOtpResponse,
  WithdrawHackathonSubmissionRequest,
} from '../types';

// ── Organizer escrow operations (org-scoped) ─────────────────────────────────

/** Publish a hackathon draft to the events contract (CREATE_EVENT). */
export const publishHackathonEscrow = async (
  organizationId: string,
  hackathonId: string,
  body: PublishHackathonEscrowRequest
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/organizations/{organizationId}/hackathons/{id}/escrow/publish',
      { params: { path: { organizationId, id: hackathonId } }, body }
    )
  );

/** Declare winners and trigger payout (SELECT_WINNERS). */
export const selectHackathonWinners = async (
  organizationId: string,
  hackathonId: string,
  body: SelectHackathonWinnersRequest
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/organizations/{organizationId}/hackathons/{id}/escrow/select-winners',
      { params: { path: { organizationId, id: hackathonId } }, body }
    )
  );

/** Cancel an active hackathon and refund contributors + owner. */
export const cancelHackathonEscrow = async (
  organizationId: string,
  hackathonId: string,
  body: CancelHackathonEscrowRequest
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/organizations/{organizationId}/hackathons/{id}/escrow/cancel',
      { params: { path: { organizationId, id: hackathonId } }, body }
    )
  );

/**
 * Recover a hackathon stranded in DRAFT_AWAITING_FUNDING back to DRAFT so the
 * organizer can fix the cause and republish.
 */
export const resetHackathonEscrowToDraft = async (
  organizationId: string,
  hackathonId: string
) =>
  unwrapData(
    await apiClient.POST(
      '/api/organizations/{organizationId}/hackathons/{id}/escrow/reset-to-draft',
      { params: { path: { organizationId, id: hackathonId } } }
    )
  );

/** Submit a wallet-signed XDR for an organizer op (EXTERNAL path). */
export const submitSignedHackathonEscrow = async (
  organizationId: string,
  hackathonId: string,
  opRowId: string,
  body: SubmitSignedXdrRequest
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/organizations/{organizationId}/hackathons/{id}/escrow/ops/{opRowId}/submit-signed',
      { params: { path: { organizationId, id: hackathonId, opRowId } }, body }
    )
  );

/** Poll the current state of an organizer escrow op. */
export const getHackathonEscrowOp = async (
  organizationId: string,
  hackathonId: string,
  opRowId: string
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.GET(
      '/api/organizations/{organizationId}/hackathons/{id}/escrow/ops/{opRowId}',
      { params: { path: { organizationId, id: hackathonId, opRowId } } }
    )
  );

// ── Funding step-up (email OTP) ──────────────────────────────────────────────

/** Ask the backend to email a funding step-up code. */
export const requestHackathonFundingOtp = async (
  organizationId: string,
  hackathonId: string
): Promise<RequestFundingOtpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/organizations/{organizationId}/hackathons/{id}/escrow/funding-otp/request',
      { params: { path: { organizationId, id: hackathonId } } }
    )
  );

/** Verify the emailed funding code; authorizes funding for a short window. */
export const verifyHackathonFundingOtp = async (
  organizationId: string,
  hackathonId: string,
  code: string
): Promise<VerifyFundingOtpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/organizations/{organizationId}/hackathons/{id}/escrow/funding-otp/verify',
      { params: { path: { organizationId, id: hackathonId } }, body: { code } }
    )
  );

// ── Participant escrow operations (hackathon-scoped) ─────────────────────────

/** Anchor an existing HackathonSubmission row on chain (SUBMIT). */
export const anchorHackathonSubmission = async (
  hackathonId: string,
  submissionId: string,
  body: AnchorHackathonSubmissionRequest
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/hackathons/{id}/escrow/submissions/{submissionId}/submit',
      { params: { path: { id: hackathonId, submissionId } }, body }
    )
  );

/** Withdraw an anchored submission (WITHDRAW_SUBMISSION). */
export const withdrawHackathonSubmission = async (
  hackathonId: string,
  submissionId: string,
  body: WithdrawHackathonSubmissionRequest
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/hackathons/{id}/escrow/submissions/{submissionId}/withdraw',
      { params: { path: { id: hackathonId, submissionId } }, body }
    )
  );

/** Submit a wallet-signed XDR for a participant op (EXTERNAL path). */
export const submitSignedParticipantEscrow = async (
  hackathonId: string,
  opRowId: string,
  body: SubmitSignedXdrRequest
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.POST(
      '/api/hackathons/{id}/escrow/ops/{opRowId}/submit-signed',
      {
        params: { path: { id: hackathonId, opRowId } },
        body,
      }
    )
  );

/** Poll the current state of a participant escrow op. */
export const getParticipantEscrowOp = async (
  hackathonId: string,
  opRowId: string
): Promise<EscrowOpResponse> =>
  unwrapData(
    await apiClient.GET('/api/hackathons/{id}/escrow/ops/{opRowId}', {
      params: { path: { id: hackathonId, opRowId } },
    })
  );
