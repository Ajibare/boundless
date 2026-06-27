'use client';

/**
 * React Query hooks for the bounty builder/participant lifecycle (boundless #621).
 *
 *   reads        — useBountiesList / useBounty (public), useMyBountyApplication.
 *   applications — useApplyToBounty / useEditApplication / useWithdrawApplication
 *                  / useJoinCompetition / useLeaveCompetition (v2 records).
 *   escrow ops   — useSubmitBounty / useWithdrawSubmission / useContributeToBounty
 *                  / useApplyToBountyEscrow / useWithdrawApplicationEscrow, each
 *                  driven through the shared {@link useEscrowOpRunner} on the
 *                  participant scope. Funding defaults to MANAGED (the backend
 *                  signs + submits with the caller's platform-held wallet); pass
 *                  a `signXdr` to take the EXTERNAL connected-wallet path.
 *
 * `useMyBountyActivity` (cross-bounty applications + submissions) waits on the
 * backend participant dashboard (boundless-nestjs #332); it is intentionally not
 * implemented here yet.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useEscrowOpRunner, type SignXdrFn } from './use-escrow';
import { bountyKeys } from './keys';
import {
  applyToBountyEscrow,
  contributeToBountyEscrow,
  submitBountyWorkEscrow,
  withdrawBountyApplicationEscrow,
  withdrawBountySubmissionEscrow,
} from './participant-escrow-client';
import {
  applyToBounty,
  editBountyApplication,
  getBounty,
  getMyBountyApplication,
  joinCompetition,
  leaveCompetition,
  listBounties,
  withdrawBountyApplication,
  type BountiesListParams,
} from './participant-client';
import type {
  ApplyBountyRequest,
  ContributeBountyRequest,
  CreateBountyApplicationRequest,
  EditBountyApplicationRequest,
  FundingMode,
  JoinCompetitionRequest,
  SubmitBountyRequest,
  WithdrawApplicationRequest,
  WithdrawSubmissionRequest,
} from '../types';

// ── Reads ─────────────────────────────────────────────────────────────────────

/** Paginated public marketplace list. */
export function useBountiesList(params: BountiesListParams = {}) {
  return useQuery({
    queryKey: bountyKeys.list(params as Record<string, unknown>),
    queryFn: () => listBounties(params),
  });
}

/** A single public bounty (detail page). */
export function useBounty(bountyId: string | undefined) {
  return useQuery({
    queryKey: bountyKeys.detail(bountyId ?? ''),
    queryFn: () => getBounty(bountyId as string),
    enabled: !!bountyId,
  });
}

/** The caller's own application for a bounty (drives the detail CTA). */
export function useMyBountyApplication(bountyId: string | undefined) {
  return useQuery({
    queryKey: bountyKeys.myApplication(bountyId ?? ''),
    queryFn: () => getMyBountyApplication(bountyId as string),
    enabled: !!bountyId,
  });
}

// ── Application records (v2) ──────────────────────────────────────────────────

/** Submit an application (light/full proposal) for an application-mode bounty. */
export function useApplyToBounty(bountyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBountyApplicationRequest) =>
      applyToBounty(bountyId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: bountyKeys.myApplication(bountyId) }),
  });
}

/** Edit a SUBMITTED application (before shortlist). */
export function useEditApplication(bountyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { appId: string; body: EditBountyApplicationRequest }) =>
      editBountyApplication(bountyId, vars.appId, vars.body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: bountyKeys.myApplication(bountyId) }),
  });
}

/** Withdraw a SUBMITTED application record (status -> WITHDRAWN). */
export function useWithdrawApplication(bountyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => withdrawBountyApplication(bountyId, appId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: bountyKeys.myApplication(bountyId) }),
  });
}

/** Join an open competition directly (no application step). */
export function useJoinCompetition(bountyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: JoinCompetitionRequest) =>
      joinCompetition(bountyId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: bountyKeys.myApplication(bountyId) }),
  });
}

/** Leave an open competition the caller joined. */
export function useLeaveCompetition(bountyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: JoinCompetitionRequest) =>
      leaveCompetition(bountyId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: bountyKeys.myApplication(bountyId) }),
  });
}

// ── Escrow ops (participant scope, default MANAGED) ───────────────────────────

/** A participant op body with funding mode optional (defaults to MANAGED). */
type WithManagedDefault<T extends { fundingMode: FundingMode }> = Omit<
  T,
  'fundingMode'
> & { fundingMode?: FundingMode };

const withManaged = <T extends { fundingMode: FundingMode }>(
  body: WithManagedDefault<T>
): T => ({ fundingMode: 'MANAGED', ...body }) as T;

interface ParticipantOpOptions {
  /** Sign the unsigned XDR for the EXTERNAL path. Omit for MANAGED. */
  signXdr?: SignXdrFn;
}

/**
 * Build a participant escrow-op hook: a runner on the participant scope plus a
 * `run(body)` that starts the op (funding defaults to MANAGED). Returns the full
 * runner surface (phase/status/error/txHash) for the calling UI.
 */
function useParticipantOp<T extends { fundingMode: FundingMode }>(
  bountyId: string,
  start: (id: string, body: T) => ReturnType<typeof submitBountyWorkEscrow>,
  options: ParticipantOpOptions = {}
) {
  const runner = useEscrowOpRunner(
    { kind: 'participant', bountyId },
    options.signXdr ? { signXdr: options.signXdr } : undefined
  );
  const run = useCallback(
    (body: WithManagedDefault<T>) =>
      runner.run(() => start(bountyId, withManaged<T>(body))),
    [runner, bountyId, start]
  );
  return { ...runner, run };
}

/** Anchor a work submission on-chain (SUBMIT). */
export function useSubmitBounty(
  bountyId: string,
  options?: ParticipantOpOptions
) {
  return useParticipantOp<SubmitBountyRequest>(
    bountyId,
    submitBountyWorkEscrow,
    options
  );
}

/** Withdraw a submission anchor. */
export function useWithdrawSubmission(
  bountyId: string,
  options?: ParticipantOpOptions
) {
  return useParticipantOp<WithdrawSubmissionRequest>(
    bountyId,
    withdrawBountySubmissionEscrow,
    options
  );
}

/** Apply to a bounty on-chain (APPLY_TO_BOUNTY; open modes). */
export function useApplyToBountyEscrow(
  bountyId: string,
  options?: ParticipantOpOptions
) {
  return useParticipantOp<ApplyBountyRequest>(
    bountyId,
    applyToBountyEscrow,
    options
  );
}

/** Withdraw an on-chain application (open modes). */
export function useWithdrawApplicationEscrow(
  bountyId: string,
  options?: ParticipantOpOptions
) {
  return useParticipantOp<WithdrawApplicationRequest>(
    bountyId,
    withdrawBountyApplicationEscrow,
    options
  );
}

/** Contribute funds to a bounty's escrow pool (ADD_FUNDS). */
export function useContributeToBounty(
  bountyId: string,
  options?: ParticipantOpOptions
) {
  return useParticipantOp<ContributeBountyRequest>(
    bountyId,
    contributeToBountyEscrow,
    options
  );
}
