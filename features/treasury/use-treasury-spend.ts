'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveSpend,
  buildSpendXdr,
  cancelSpend,
  checkSendDestinationReadiness,
  executeSpend,
  initiateSpend,
  listSpendRequests,
  rejectSpend,
  requestSendFundsOtp,
  sendTreasuryFunds,
  submitSpendSignedXdr,
  verifySendFundsOtp,
} from './api';
import { treasuryKeys } from './keys';
import type { InitiateSpendInput, SendFundsInput, SpendStatus } from './types';

export function useSpendRequests(
  organizationId?: string,
  status?: SpendStatus
) {
  return useQuery({
    queryKey: treasuryKeys.spends(organizationId ?? '', status),
    queryFn: () => listSpendRequests(organizationId as string, status),
    enabled: !!organizationId,
    staleTime: 10_000,
  });
}

function useSpendInvalidation(organizationId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: ['treasury', 'spends', organizationId],
    });
}

export function useInitiateSpend(organizationId: string) {
  const invalidate = useSpendInvalidation(organizationId);
  return useMutation({
    mutationFn: (body: InitiateSpendInput) =>
      initiateSpend(organizationId, body),
    onSuccess: () => void invalidate(),
  });
}

/** approve / reject / cancel / execute, keyed by action. */
export function useSpendDecision(organizationId: string) {
  const invalidate = useSpendInvalidation(organizationId);
  return useMutation({
    mutationFn: (vars: {
      requestId: string;
      action: 'approve' | 'reject' | 'cancel' | 'execute';
      note?: string;
    }) => {
      switch (vars.action) {
        case 'approve':
          return approveSpend(organizationId, vars.requestId, vars.note);
        case 'reject':
          return rejectSpend(organizationId, vars.requestId, vars.note);
        case 'cancel':
          return cancelSpend(organizationId, vars.requestId);
        case 'execute':
          return executeSpend(organizationId, vars.requestId);
      }
    },
    onSuccess: () => void invalidate(),
  });
}

/**
 * One-shot "Send funds" from a managed wallet. Refreshes the send history, the
 * wallet balances, and the activity log on success.
 */
export function useSendFunds(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SendFundsInput) =>
      sendTreasuryFunds(organizationId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['treasury', 'spends', organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['treasury', 'balance', organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['treasury', 'audit', organizationId],
      });
    },
  });
}

/** Ask the backend to email a send-funds verification code. */
export function useRequestSendFundsOtp(organizationId: string) {
  return useMutation({
    mutationFn: () => requestSendFundsOtp(organizationId),
  });
}

/** Verify the emailed send-funds code; authorizes sending for a short window. */
export function useVerifySendFundsOtp(organizationId: string) {
  return useMutation({
    mutationFn: (code: string) => verifySendFundsOtp(organizationId, code),
  });
}

/**
 * Live pre-send check for a destination: does the account exist on-chain and
 * carry a USDC trustline. Only runs when `enabled` (caller gates on a valid
 * address) to avoid hammering Horizon on every keystroke.
 */
export function useSendDestinationReadiness(
  organizationId: string,
  address: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: treasuryKeys.sendReadiness(organizationId, address),
    queryFn: () => checkSendDestinationReadiness(organizationId, address),
    enabled: enabled && !!organizationId && !!address,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBuildSpendXdr(organizationId: string) {
  const invalidate = useSpendInvalidation(organizationId);
  return useMutation({
    mutationFn: (requestId: string) => buildSpendXdr(organizationId, requestId),
    onSuccess: () => void invalidate(),
  });
}

export function useSubmitSignedXdr(organizationId: string) {
  const invalidate = useSpendInvalidation(organizationId);
  return useMutation({
    mutationFn: (vars: { requestId: string; signedXdr: string }) =>
      submitSpendSignedXdr(organizationId, vars.requestId, vars.signedXdr),
    onSuccess: () => void invalidate(),
  });
}
