/**
 * Bounty feature types.
 *
 * Every server shape is aliased from the backend-generated OpenAPI schema
 * (lib/api/generated/schema.d.ts), so they never drift from boundless-nestjs.
 * Run `npm run codegen` after a backend DTO change to refresh them. Do not
 * hand-write server DTOs here.
 */
import type { Schemas } from '@/lib/api';

// ── Draft ────────────────────────────────────────────────────────────────────

/** Full draft as returned by GET/PATCH /draft/:id. */
export type BountyDraft = Schemas['BountyDraftResponseDto'];
/** Section-keyed draft payload (scope, mode, submission, reward). */
export type BountyDraftData = Schemas['BountyDraftDataDto'];
/** Flat draft-update body: send any subset of sections in one PATCH. */
export type UpdateBountyDraftBody = Schemas['UpdateBountyDraftDto'];
/** Prize tier exposed on the draft response (position + decimal amount). */
export type BountyDraftPrizeTier = Schemas['BountyDraftPrizeTierDto'];

// Section DTOs (the wire shape the backend persists + returns).
export type BountyScopeSection = Schemas['BountyScopeSectionDto'];
export type BountyModeSection = Schemas['BountyModeSectionDto'];
export type BountySubmissionSection = Schemas['BountySubmissionSectionDto'];
export type BountyRewardSection = Schemas['BountyRewardSectionDto'];

/** Two-axis taxonomy, derived from the generated section DTO so it stays in
 * lockstep with the backend enums (supersedes the local stubs in the ModeTab). */
export type BountyClaimType = BountyModeSection['claimType'];
export type BountyEntryType = BountyModeSection['entryType'];
export type BountySubmissionVisibility = NonNullable<
  BountySubmissionSection['submissionVisibility']
>;

/** The editable wizard sections, in order. `resources` is optional. */
export const DRAFT_SECTIONS = [
  'scope',
  'mode',
  'submission',
  'reward',
  'resources',
] as const;
export type DraftSection = (typeof DRAFT_SECTIONS)[number];

// ── Escrow ───────────────────────────────────────────────────────────────────

/** The EscrowOp row returned by every bounty escrow endpoint. */
export type BountyEscrowOpResponse = Schemas['BountyEscrowOpResponseDto'];
/** Op lifecycle status (derived from the generated union). */
export type EscrowOpStatus = BountyEscrowOpResponse['status'];
/** Contract operation kind (derived from the generated union). */
export type EscrowOpKind = BountyEscrowOpResponse['kind'];

export type PublishBountyEscrowRequest = Schemas['PublishBountyEscrowDto'];
export type CancelBountyEscrowRequest = Schemas['CancelBountyEscrowDto'];
export type SelectBountyWinnersRequest = Schemas['SelectBountyWinnersDto'];
export type SubmitSignedXdrRequest = Schemas['BountySubmitSignedXdrDto'];
export type BountyWinnerSelection = Schemas['BountyWinnerSelectionDto'];
export type BountyWinnerDistributionEntry =
  Schemas['BountyWinnerDistributionEntryDto'];

/** Signing path for an escrow op. */
export type FundingMode = NonNullable<
  PublishBountyEscrowRequest['fundingMode']
>;

/** Terminal op states. Polling should stop once one is reached. */
export const TERMINAL_ESCROW_STATUSES: readonly EscrowOpStatus[] = [
  'COMPLETED',
  'FAILED',
  'CANCELLED',
];

export const isTerminalEscrowStatus = (status: EscrowOpStatus): boolean =>
  TERMINAL_ESCROW_STATUSES.includes(status);

// ── Builder / participant ─────────────────────────────────────────────────────

/** Public marketplace bounty (list row + detail share this shape). */
export type BountyPublic = Schemas['BountyPublicDto'];
/** Paginated marketplace list response. */
export type BountyPublicList = Schemas['BountyPublicListDto'];

// Participant escrow op request bodies (on-chain apply/submit/withdraw/contribute).
export type ApplyBountyRequest = Schemas['ApplyBountyDto'];
export type SubmitBountyRequest = Schemas['SubmitBountyDto'];
export type WithdrawApplicationRequest = Schemas['WithdrawApplicationDto'];
export type WithdrawSubmissionRequest = Schemas['WithdrawSubmissionDto'];
export type ContributeBountyRequest = Schemas['ContributeBountyDto'];

// v2 application records (off-chain proposal carrier for application modes).
export type CreateBountyApplicationRequest =
  Schemas['CreateBountyApplicationDto'];
export type EditBountyApplicationRequest = Schemas['EditBountyApplicationDto'];
export type JoinCompetitionRequest = Schemas['JoinCompetitionDto'];

/** The caller's own application for a bounty (GET …/v2/applications/me). */
export type MyBountyApplication = Schemas['BountyApplicationResponseDto'];

/** Application lifecycle status (derived from the generated DTO enum). */
export type BountyApplicationStatus = NonNullable<
  MyBountyApplication['applicationStatus']
>;

// ── Cross-bounty "my activity" dashboard ──────────────────────────────────────
// GET /bounties/me/applications and /bounties/me/submissions.

/** Compact bounty summary embedded in each activity row. */
export type BountyActivitySummary = Schemas['BountySummaryDto'];
/** A row in the "my applications" activity list. */
export type MyBountyApplicationRow = Schemas['MyBountyApplicationRowDto'];
/** A row in the "my submissions" activity list. */
export type MyBountySubmissionRow = Schemas['MyBountySubmissionRowDto'];

/** Generic paginated activity envelope (items + page meta). */
export interface BountyActivityPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
