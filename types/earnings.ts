import type { Schemas } from '@/lib/api/openapi';

export type EarningSource =
  | 'hackathons'
  | 'grants'
  | 'crowdfunding'
  | 'bounties';

export type EarningActivity = Schemas['PublicEarningActivityDto'];

export type EarningsBreakdown = Schemas['EarningsBreakdownDto'];

export type PublicEarningsResponse = Schemas['PublicEarningsResponseDto'];
