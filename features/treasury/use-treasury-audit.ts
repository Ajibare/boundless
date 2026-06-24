'use client';

import { useQuery } from '@tanstack/react-query';
import { getAuditLog } from './api';
import { treasuryKeys } from './keys';

export function useAuditLog(organizationId?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: treasuryKeys.audit(organizationId ?? '', page),
    queryFn: () => getAuditLog(organizationId as string, page, limit),
    enabled: !!organizationId,
    staleTime: 10_000,
  });
}
