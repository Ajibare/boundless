'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getReceipt, listReceipts, sendReceipt, voidReceipt } from './api';
import { treasuryKeys } from './keys';

/** Paginated money receipts for an organization (newest first). */
export function useReceipts(organizationId?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: [...treasuryKeys.receipts(organizationId ?? ''), page, limit],
    queryFn: () => listReceipts(organizationId as string, { page, limit }),
    enabled: !!organizationId,
    staleTime: 15_000,
  });
}

/** A single receipt, for the printable view. */
export function useReceipt(organizationId: string, receiptId?: string) {
  return useQuery({
    queryKey: treasuryKeys.receipt(organizationId, receiptId ?? ''),
    queryFn: () => getReceipt(organizationId, receiptId as string),
    enabled: !!organizationId && !!receiptId,
    staleTime: 30_000,
  });
}

/** Resolve the receipt issued for a given source record (e.g. a treasury send). */
export function useReceiptByReference(
  organizationId: string,
  referenceId?: string
) {
  return useQuery({
    queryKey: treasuryKeys.receiptByReference(
      organizationId,
      referenceId ?? ''
    ),
    queryFn: async () => {
      const res = await listReceipts(organizationId, {
        referenceId: referenceId as string,
        limit: 1,
      });
      return res.data[0] ?? null;
    },
    enabled: !!organizationId && !!referenceId,
    staleTime: 30_000,
  });
}

/** Email a copy of a receipt. */
export function useSendReceipt(organizationId: string) {
  return useMutation({
    mutationFn: (vars: { receiptId: string; email?: string }) =>
      sendReceipt(organizationId, vars.receiptId, vars.email),
  });
}

/** Void a receipt (owner/admin). Receipts are never deleted. */
export function useVoidReceipt(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { receiptId: string; reason?: string }) =>
      voidReceipt(organizationId, vars.receiptId, vars.reason),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: treasuryKeys.receipts(organizationId),
      }),
  });
}
