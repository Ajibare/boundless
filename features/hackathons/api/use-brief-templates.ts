'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient, unwrapData } from '@/lib/api';

export interface BriefTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  brief: string;
  sortOrder: number;
}

const TEMPLATES_KEY = ['hackathon-brief-templates'] as const;

// Cast to bypass typed paths until the OpenAPI schema is regenerated after deploy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = apiClient as any;

export function useBriefTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => {
      const res = await client.GET('/api/hackathon-brief-templates', {});
      const data = unwrapData(res) as { items?: BriefTemplate[] } | null;
      return data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
