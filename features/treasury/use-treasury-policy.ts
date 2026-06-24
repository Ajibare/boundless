'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTreasuryPolicy, updateTreasuryPolicy } from './api';
import { treasuryKeys } from './keys';
import type { TreasuryPolicyRule } from './types';

export function useTreasuryPolicy(organizationId?: string) {
  return useQuery({
    queryKey: treasuryKeys.policy(organizationId ?? ''),
    queryFn: () => getTreasuryPolicy(organizationId as string),
    enabled: !!organizationId,
    staleTime: 30_000,
  });
}

export function useUpdatePolicy(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      rules: TreasuryPolicyRule[];
      defaultWalletId?: string;
    }) => updateTreasuryPolicy(organizationId, body),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: treasuryKeys.policy(organizationId),
      }),
  });
}
