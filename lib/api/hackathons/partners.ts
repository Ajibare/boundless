import api from '../api';
import type { ApiResponse } from '../types';
import type { Schemas } from '../openapi';

export type PartnerContributionStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface PartnerContribution {
  id: string;
  hackathonId: string;
  organizationId: string;
  partnerEmail: string;
  partnerName: string;
  partnerLogo?: string | null;
  partnerLink?: string | null;
  pledgedAmount: string;
  currency: string;
  status: PartnerContributionStatus;
  inviteToken: string;
  invitedAt: string;
  contributedAt?: string | null;
  confirmedAt?: string | null;
  txHash?: string | null;
  showPublicly: boolean;
  message?: string | null;
  createdAt: string;
}

export interface InvitePartnerRequest {
  partnerEmail: string;
  partnerName: string;
  partnerLogo?: string;
  partnerLink?: string;
  pledgedAmount: number;
  currency?: 'USDC';
  message?: string;
  showPublicly?: boolean;
}

export interface AllocationSummary {
  allocatableAmount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  /** Platform fee rate as a decimal (e.g. 0.05 = 5%). */
  escrowFeeRate?: number;
  isFullyAllocated: boolean;
  requiresAllocation: boolean;
}

export interface PartnerContributionWithAllocation extends PartnerContribution {
  allocationSummary?: AllocationSummary;
}

export interface ContributionsListResponse {
  items: PartnerContributionWithAllocation[];
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
  summary: Record<string, { total: string; count: number }>;
  unallocatedBonusTotal: string;
}

export interface AllocationRecord {
  id: string;
  tierId: string;
  tierLabel: string;
  amount: string;
  createdNewTier: boolean;
  allocatedAt: string;
}

export interface ContributionAllocationDetail {
  contributionId: string;
  pledgedAmount: string;
  currency: string;
  allocatableAmount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  /** Platform fee rate as a decimal (e.g. 0.05 = 5%). */
  escrowFeeRate?: number;
  isFullyAllocated: boolean;
  allocations: AllocationRecord[];
}

export type AllocationTarget = Schemas['AllocationTargetDto'];

export type AllocateContributionRequest = Schemas['AllocateContributionDto'];

export interface PrizeTierShape {
  id?: string;
  place: string;
  // Stored as a string in the DB JSON column.
  prizeAmount: string;
  currency?: string;
  description?: string;
  passMark?: number;
}

export interface AllocationResult {
  summary: ContributionAllocationDetail;
  prizeTiers: PrizeTierShape[];
}

export interface PartnerInvitationDetails {
  id: string;
  partnerName: string;
  partnerEmail: string;
  pledgedAmount: string;
  currency: string;
  status: PartnerContributionStatus;
  message?: string | null;
  txHash?: string | null;
  hackathon: {
    id: string;
    name: string;
    slug: string | null;
    banner?: string | null;
    tagline?: string | null;
    status: string;
    winnersAnnounced: boolean;
    organization: {
      id: string;
      name: string;
      logo?: string | null;
      slug?: string | null;
    } | null;
  } | null;
  windowOpen: boolean;
  /** Whether the hackathon's on-chain escrow event exists (publish completed). */
  escrowReady: boolean;
  canContribute: boolean;
}

export interface PublicContributor {
  id: string;
  partnerName: string;
  partnerLogo?: string | null;
  partnerLink?: string | null;
  pledgedAmount: string;
  currency: string;
  message?: string | null;
  confirmedAt?: string | null;
}

export interface PublicContributorsResponse {
  contributors: PublicContributor[];
  totalConfirmedAmount: string;
  totalConfirmedCount: number;
  currency: string;
}

export const invitePartner = async (
  organizationId: string,
  hackathonId: string,
  data: InvitePartnerRequest
): Promise<ApiResponse<PartnerContribution>> => {
  const res = await api.post(
    `/organizations/${organizationId}/hackathons/${hackathonId}/partners/invite`,
    data
  );
  return res.data;
};

export const listContributions = async (
  organizationId: string,
  hackathonId: string,
  options?: {
    status?: PartnerContributionStatus;
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<ContributionsListResponse>> => {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));
  const qs = params.toString();
  const res = await api.get(
    `/organizations/${organizationId}/hackathons/${hackathonId}/partners/contributions${qs ? `?${qs}` : ''}`
  );
  return res.data;
};

export const cancelPartnerInvite = async (
  organizationId: string,
  hackathonId: string,
  contributionId: string
): Promise<ApiResponse<PartnerContribution>> => {
  const res = await api.delete(
    `/organizations/${organizationId}/hackathons/${hackathonId}/partners/contributions/${contributionId}`
  );
  return res.data;
};

export const getPartnerInvitation = async (
  token: string
): Promise<ApiResponse<PartnerInvitationDetails>> => {
  const res = await api.get(`/partners/contribute/${token}`);
  return res.data;
};

export interface PreparedFundTransaction {
  /** Escrow op row id (track settlement of the ADD_FUNDS op). */
  opRowId: string;
  opId: string;
  status: string;
  /** Unsigned ADD_FUNDS transaction XDR for the partner wallet to sign. */
  unsignedXdr: string;
  networkPassphrase: string;
  amount: string;
  currency: string;
}

export const prepareFundTransaction = async (
  token: string,
  signerAddress: string
): Promise<ApiResponse<PreparedFundTransaction>> => {
  const res = await api.post(`/partners/contribute/${token}/prepare-fund-tx`, {
    signerAddress,
  });
  return res.data;
};

export interface SubmittedFundTransaction {
  opRowId: string;
  opId: string;
  /** EscrowOp status (e.g. PENDING_CONFIRM). The contribution confirms async. */
  status: string;
  txHash: string | null;
}

export const submitSignedTransaction = async (
  token: string,
  signedXdr: string
): Promise<ApiResponse<SubmittedFundTransaction>> => {
  const res = await api.post(`/partners/contribute/${token}/submit-tx`, {
    signedXdr,
  });
  return res.data;
};

export const getContributionAllocations = async (
  organizationId: string,
  hackathonId: string,
  contributionId: string
): Promise<ApiResponse<ContributionAllocationDetail>> => {
  const res = await api.get(
    `/organizations/${organizationId}/hackathons/${hackathonId}/partners/contributions/${contributionId}/allocations`
  );
  return res.data;
};

export const allocateContribution = async (
  organizationId: string,
  hackathonId: string,
  contributionId: string,
  data: AllocateContributionRequest
): Promise<ApiResponse<AllocationResult>> => {
  const res = await api.post(
    `/organizations/${organizationId}/hackathons/${hackathonId}/partners/contributions/${contributionId}/allocate`,
    data
  );
  return res.data;
};

export interface AllocatablePrizePlacement {
  id: string;
  position: number;
  label: string | null;
  amount: string;
  currency: string;
  passMark: number;
}

export interface AllocatablePrize {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  trackIds: string[];
  placements: AllocatablePrizePlacement[];
}

/** Prizes + placements an organizer can allocate partner money into. */
export const listAllocatablePrizes = async (
  organizationId: string,
  hackathonId: string
): Promise<AllocatablePrize[]> => {
  const res = await api.get<ApiResponse<AllocatablePrize[]>>(
    `/organizations/${organizationId}/hackathons/${hackathonId}/partners/prizes`
  );
  return res.data?.data ?? [];
};

export const undoAllocation = async (
  organizationId: string,
  hackathonId: string,
  allocationId: string
): Promise<ApiResponse<AllocationResult>> => {
  const res = await api.delete(
    `/organizations/${organizationId}/hackathons/${hackathonId}/partners/allocations/${allocationId}`
  );
  return res.data;
};

export const getPublicContributors = async (
  slug: string
): Promise<ApiResponse<PublicContributorsResponse>> => {
  const res = await api.get(`/hackathons/${slug}/contributors`);
  return res.data;
};
