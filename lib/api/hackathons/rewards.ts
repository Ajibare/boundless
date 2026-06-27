import api from '../api';
import type { Schemas } from '../openapi';

// ── Fee Estimate ─────────────────────────────────────────────────────────────
// GET /api/hackathons/fee-estimate?totalPool=...

export type FeeEstimateData = Schemas['FeeEstimateResponseDto'];

export interface GetFeeEstimateResponse {
  success: boolean;
  message: string;
  data: FeeEstimateData;
}

const MIN_POOL_FOR_FEE = 5;

/**
 * Get platform fee estimate for a given total prize pool (USDC).
 * Backend returns 400 if totalPool is missing, invalid, or below minimum (5 USDC).
 */
export const getFeeEstimate = async (
  totalPool: number
): Promise<FeeEstimateData> => {
  if (totalPool < MIN_POOL_FOR_FEE) {
    throw new Error('totalPool below minimum');
  }
  const res = await api.get<GetFeeEstimateResponse>('hackathons/fee-estimate', {
    params: { totalPool: String(totalPool) },
  });
  if (!res.data?.data) throw new Error('Invalid fee estimate response');
  return res.data.data;
};

// ── Financial Preview (dry-run) ──────────────────────────────────────────────
// POST /api/organizations/:orgId/hackathons/:id/financial/preview

export interface FinancialPreviewTier {
  place: string;
  amount: number;
  fee: number;
  total: number;
}

export interface FinancialPreviewData {
  currentPrizePool: number;
  newPrizePool: number;
  currentPlatformFee: number;
  newPlatformFee: number;
  currentTotalRequired: number;
  newTotalRequired: number;
  additionalFundingRequired: number;
  walletBalance: number;
  sufficient: boolean;
  shortfall: number;
  breakdown: FinancialPreviewTier[];
}

export interface GetFinancialPreviewResponse {
  success: boolean;
  message: string;
  data: FinancialPreviewData;
}

/**
 * Dry-run preview: calculates the exact USDC cost of a proposed reward update
 * without touching escrow state or the wallet.
 *
 * Call this before PATCH /financial to power the confirmation dialog and avoid
 * surprising the organizer with an insufficient-balance error.
 */
export const getFinancialPreview = async (
  organizationId: string,
  hackathonId: string,
  rewards: {
    prizeTiers: Array<{
      place: string;
      prizeAmount: string | number;
      [key: string]: unknown;
    }>;
  }
): Promise<FinancialPreviewData> => {
  const res = await api.post<GetFinancialPreviewResponse>(
    `/organizations/${organizationId}/hackathons/${hackathonId}/financial/preview`,
    { rewards }
  );
  if (!res.data?.data) throw new Error('Invalid financial preview response');
  return res.data.data;
};

/**
 * Export hackathon data (organizer only)
 * GET /api/organizations/:organizationId/hackathons/:id/export?format=csv|pdf&dataset=full|...
 */
export const exportHackathon = async (
  organizationId: string,
  hackathonId: string,
  format: 'csv' | 'pdf',
  dataset:
    | 'overview'
    | 'participants'
    | 'submissions'
    | 'prize_tiers'
    | 'winners'
    | 'judging'
    | 'full' = 'full'
): Promise<Blob> => {
  const res = await api.get(
    `/organizations/${organizationId}/hackathons/${hackathonId}/export`,
    {
      params: { format, dataset },
      responseType: 'blob', // Important for binary data
    }
  );
  return res.data;
};
