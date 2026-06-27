import api from './api';
import { ApiResponse } from './types';
import type {
  CriterionScoreRequest,
  JudgingCriterion,
  JudgingSubmission,
} from './hackathons/judging';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JudgeInvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'REVOKED'
  | 'EXPIRED';

export interface JudgeHackathonSummary {
  id: string;
  slug: string | null;
  name: string;
  banner: string | null;
  status: string;
  judgingStart: string | null;
  judgingEnd: string | null;
  submissionDeadline: string | null;
  resultsPublished: boolean;
  resultsPublishedAt: string | null;
  organization: { id: string; name: string; logo: string | null } | null;
  totalSubmissions: number;
  myScoredCount: number;
}

export interface JudgeAssignment {
  assignedAt: string;
  hackathon: JudgeHackathonSummary;
}

export interface JudgeHackathonOverview {
  id: string;
  slug: string | null;
  name: string;
  banner: string | null;
  description: string | null;
  tagline: string | null;
  status: string;
  judgingStart: string | null;
  judgingEnd: string | null;
  submissionDeadline: string | null;
  judgingCriteria: JudgingCriterion[] | null;
  resultsPublished: boolean;
  resultsPublishedAt: string | null;
  organization: { id: string; name: string; logo: string | null } | null;
  totalSubmissions: number;
  myScoredCount: number;
  /** First unscored submission in the canonical queue, or null when caught up. */
  firstUnscoredSubmissionId: string | null;
}

export interface JudgeQueueNeighbor {
  submissionId: string;
  projectName: string;
}

export interface JudgeQueueNeighbors {
  position: number | null;
  total: number;
  scoredCount: number;
  prev: JudgeQueueNeighbor | null;
  next: JudgeQueueNeighbor | null;
  /** Next unscored after the current submission. Wraps to the start of the queue if none found after. */
  nextUnscored: JudgeQueueNeighbor | null;
}

export interface JudgeSubmissionsResponse {
  submissions: JudgingSubmission[];
  criteria: JudgingCriterion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  /** Total submissions the calling judge has scored in this hackathon. */
  scoredCount?: number;
}

export interface JudgeInvitationPreview {
  id: string;
  email: string;
  status: JudgeInvitationStatus;
  expiresAt: string;
  displayName: string | null;
  message: string | null;
  isExpired: boolean;
  hackathon: {
    id: string;
    slug: string | null;
    name: string;
    banner: string | null;
    judgingStart: string | null;
    judgingEnd: string | null;
    organization: { id: string; name: string; logo: string | null } | null;
  };
  invitedBy: { id: string; name: string; image: string | null } | null;
}

export interface JudgeInvitationSummary {
  id: string;
  hackathonId: string;
  email: string;
  token: string;
  status: JudgeInvitationStatus;
  invitedAt: string;
  expiresAt: string;
  message: string | null;
  displayName: string | null;
  hackathon: JudgeInvitationPreview['hackathon'];
  invitedBy: { id: string; name: string } | null;
}

export interface SubmitJudgeScoreRequest {
  criteriaScores: CriterionScoreRequest[];
  comment?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Endpoints — judge dashboard
// ---------------------------------------------------------------------------

export const getJudgeHackathons = async (): Promise<
  ApiResponse<JudgeAssignment[]>
> => {
  const res =
    await api.get<ApiResponse<JudgeAssignment[]>>('/judge/hackathons');
  return res.data;
};

export const getJudgeHackathon = async (
  hackathonId: string
): Promise<ApiResponse<JudgeHackathonOverview>> => {
  const res = await api.get<ApiResponse<JudgeHackathonOverview>>(
    `/judge/hackathons/${hackathonId}`
  );
  return res.data;
};

export const getJudgeCriteria = async (
  hackathonId: string
): Promise<ApiResponse<JudgingCriterion[]>> => {
  const res = await api.get<ApiResponse<JudgingCriterion[]>>(
    `/judge/hackathons/${hackathonId}/criteria`
  );
  return res.data;
};

export const getJudgeSubmissions = async (
  hackathonId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'date' | 'name' | 'score' | 'rank';
    order?: 'asc' | 'desc';
  } = {}
): Promise<ApiResponse<JudgeSubmissionsResponse>> => {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.search) search.set('search', params.search);
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.order) search.set('order', params.order);
  const qs = search.toString();
  const res = await api.get<ApiResponse<JudgeSubmissionsResponse>>(
    `/judge/hackathons/${hackathonId}/submissions${qs ? `?${qs}` : ''}`
  );
  return res.data;
};

export interface JudgeResultItem {
  submissionId: string;
  projectName: string;
  participantId: string;
  teamId: string | null;
  status: string;
  submittedAt: string;
  averageScore: number;
  totalScore: number;
  judgeCount: number;
  expectedJudgeCount: number;
  rank: number | null;
  computedRank?: number;
  isComplete: boolean;
  prize?: string;
}

export interface JudgeResultsResponse {
  resultsPublished: boolean;
  resultsPublishedAt: string | null;
  results: JudgeResultItem[];
}

export const getJudgeResults = async (
  hackathonId: string
): Promise<ApiResponse<JudgeResultsResponse>> => {
  const res = await api.get<ApiResponse<JudgeResultsResponse>>(
    `/judge/hackathons/${hackathonId}/results`
  );
  return res.data;
};

export interface JudgeSubmissionDetail {
  submission: {
    id: string;
    projectName: string;
    category: string;
    description: string;
    logo?: string;
    videoUrl?: string;
    introduction?: string;
    links: Array<{ type?: string; url?: string }>;
    socialLinks: Record<string, unknown>;
    submissionDate: string;
    status: string;
    rank?: number;
  };
  participant: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      name: string;
      username: string;
      image?: string;
    };
    participationType: string;
    teamId?: string;
    teamName?: string;
  };
  myScore: {
    judgeId: string;
    judgeName: string;
    criteriaScores: Array<{
      criterionId: string;
      score: number;
      comment?: string;
    }>;
    totalScore: number;
    submittedAt: string;
    comment: string | null;
  } | null;
  criteria: JudgingCriterion[];
  averageScore: number | null;
  judgeCount: number;
  resultsPublished: boolean;
}

export const getJudgeSubmission = async (
  hackathonId: string,
  submissionId: string
): Promise<ApiResponse<JudgeSubmissionDetail>> => {
  const res = await api.get<ApiResponse<JudgeSubmissionDetail>>(
    `/judge/hackathons/${hackathonId}/submissions/${submissionId}`
  );
  return res.data;
};

export const getJudgeQueueNeighbors = async (
  hackathonId: string,
  submissionId: string
): Promise<ApiResponse<JudgeQueueNeighbors>> => {
  const res = await api.get<ApiResponse<JudgeQueueNeighbors>>(
    `/judge/hackathons/${hackathonId}/submissions/${submissionId}/neighbors`
  );
  return res.data;
};

export const submitJudgeScore = async (
  hackathonId: string,
  submissionId: string,
  payload: SubmitJudgeScoreRequest
): Promise<ApiResponse<unknown>> => {
  const res = await api.post<ApiResponse<unknown>>(
    `/judge/hackathons/${hackathonId}/submissions/${submissionId}/score`,
    payload
  );
  return res.data;
};

// ---------------------------------------------------------------------------
// Endpoints — invitations
// ---------------------------------------------------------------------------

export const getJudgeInvitations = async (): Promise<
  ApiResponse<JudgeInvitationSummary[]>
> => {
  const res =
    await api.get<ApiResponse<JudgeInvitationSummary[]>>('/judge/invitations');
  return res.data;
};

export const previewJudgeInvitation = async (
  token: string
): Promise<ApiResponse<JudgeInvitationPreview>> => {
  const res = await api.get<ApiResponse<JudgeInvitationPreview>>(
    `/judge/invitations/${token}`
  );
  return res.data;
};

export const acceptJudgeInvitation = async (
  token: string,
  payload: { displayName?: string } = {}
): Promise<ApiResponse<unknown>> => {
  const res = await api.post<ApiResponse<unknown>>(
    `/judge/invitations/${token}/accept`,
    payload
  );
  return res.data;
};

export const declineJudgeInvitation = async (
  token: string
): Promise<ApiResponse<unknown>> => {
  const res = await api.post<ApiResponse<unknown>>(
    `/judge/invitations/${token}/decline`
  );
  return res.data;
};

// ---------------------------------------------------------------------------
// Endpoints — organizer-side invitation management
// ---------------------------------------------------------------------------

export interface OrganizerInvitationSummary {
  id: string;
  hackathonId: string;
  email: string;
  status: JudgeInvitationStatus;
  invitedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
  resendCount: number;
  lastResentAt: string | null;
  displayName: string | null;
  message: string | null;
  invitedBy: { id: string; name: string; image: string | null } | null;
  acceptedByUser: { id: string; name: string; image: string | null } | null;
}

export interface InviteJudgePayload {
  email: string;
  displayName?: string;
  title?: string;
  message?: string;
  expiresInDays?: number;
}

export interface BulkInviteRowResult {
  email: string;
  status: 'invited' | 'failed';
  reason?: string;
}

export interface BulkInviteResult {
  results: BulkInviteRowResult[];
  invited: number;
  failed: number;
}

export const inviteJudge = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  payload: InviteJudgePayload
): Promise<ApiResponse<OrganizerInvitationSummary>> => {
  const res = await api.post<ApiResponse<OrganizerInvitationSummary>>(
    `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/invitations`,
    payload
  );
  return res.data;
};

export const bulkInviteJudges = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  invites: InviteJudgePayload[]
): Promise<ApiResponse<BulkInviteResult>> => {
  const res = await api.post<ApiResponse<BulkInviteResult>>(
    `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/invitations/bulk`,
    { invites }
  );
  return res.data;
};

export const listJudgeInvitations = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  status?: JudgeInvitationStatus
): Promise<ApiResponse<OrganizerInvitationSummary[]>> => {
  const qs = status ? `?status=${status}` : '';
  const res = await api.get<ApiResponse<OrganizerInvitationSummary[]>>(
    `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/invitations${qs}`
  );
  return res.data;
};

export const cancelJudgeInvitation = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  invitationId: string
): Promise<ApiResponse<OrganizerInvitationSummary>> => {
  const res = await api.delete<ApiResponse<OrganizerInvitationSummary>>(
    `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/invitations/${invitationId}`
  );
  return res.data;
};

export const resendJudgeInvitation = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  invitationId: string
): Promise<ApiResponse<OrganizerInvitationSummary>> => {
  const res = await api.post<ApiResponse<OrganizerInvitationSummary>>(
    `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/invitations/${invitationId}/resend`
  );
  return res.data;
};

// ---------------------------------------------------------------------------
// Endpoints — recommendation thresholds (advisory shortlist hints)
// ---------------------------------------------------------------------------

export interface RecommendationThreshold {
  id: string;
  hackathonId: string;
  /** null = overall threshold; otherwise the scoped track id. */
  trackId: string | null;
  topPercent: number;
}

export interface RecommendationComputeDiagnostics {
  /** Submissions currently SHORTLISTED. */
  shortlistedSubmissions: number;
  /** Shortlisted submissions with at least one counted score (advisory AI_ASSIST excluded). */
  scoredSubmissions: number;
  overallThresholdConfigured: boolean;
  trackThresholdsConfigured: number;
  /** Human-readable reasons explaining the outcome; empty when nothing is outstanding. */
  reasons: string[];
}

export interface RecommendationComputeResult {
  overallRecommended: number;
  tracks: { trackId: string; recommended: number }[];
  diagnostics: RecommendationComputeDiagnostics;
}

const thresholdsBase = (organizationId: string, hackathonIdOrSlug: string) =>
  `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/recommendation-thresholds`;

export const listRecommendationThresholds = async (
  organizationId: string,
  hackathonIdOrSlug: string
): Promise<ApiResponse<RecommendationThreshold[]>> => {
  const res = await api.get<ApiResponse<RecommendationThreshold[]>>(
    thresholdsBase(organizationId, hackathonIdOrSlug)
  );
  return res.data;
};

export const setRecommendationThreshold = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  payload: { trackId?: string; topPercent: number }
): Promise<ApiResponse<RecommendationThreshold>> => {
  const res = await api.put<ApiResponse<RecommendationThreshold>>(
    thresholdsBase(organizationId, hackathonIdOrSlug),
    payload
  );
  return res.data;
};

export const deleteRecommendationThreshold = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  thresholdId: string
): Promise<void> => {
  await api.delete(
    `${thresholdsBase(organizationId, hackathonIdOrSlug)}/${thresholdId}`
  );
};

export const computeRecommendations = async (
  organizationId: string,
  hackathonIdOrSlug: string
): Promise<ApiResponse<RecommendationComputeResult>> => {
  const res = await api.post<ApiResponse<RecommendationComputeResult>>(
    `${thresholdsBase(organizationId, hackathonIdOrSlug)}/compute`
  );
  return res.data;
};

// ---------------------------------------------------------------------------
// Endpoints — AI Judging Assist (advisory scorecards)
// ---------------------------------------------------------------------------

export interface AiScorecardFlags {
  meritsAttention: boolean;
  meritsAttentionReason: string | null;
  lowEffortSignal: boolean;
  lowEffortReason: string | null;
}

export interface AiScorecard {
  submissionId: string;
  totalScore: number;
  tldr: string | null;
  criteriaScores: Array<{
    criterionId: string;
    score: number;
    comment?: string;
  }>;
  flags: AiScorecardFlags | null;
  /** True once promoted into a counting score (no longer advisory-only). */
  promoted: boolean;
  /**
   * True only when promoted AND the AI judge is currently active on the
   * roster, i.e. the score is actually counting toward ranking right now.
   * Undefined on judge-side reads (only the organizer view computes it).
   */
  counts?: boolean;
  scoredAt: string;
}

export const listAiScorecards = async (
  organizationId: string,
  hackathonIdOrSlug: string
): Promise<ApiResponse<AiScorecard[]>> => {
  const res = await api.get<ApiResponse<AiScorecard[]>>(
    `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/ai-scorecards`
  );
  return res.data;
};

/** Trigger AI scoring for one submission. Returns the fresh scorecard. */
export const runAiScore = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  submissionId: string,
  prizeId?: string
): Promise<ApiResponse<unknown>> => {
  const qs = prizeId ? `?prizeId=${prizeId}` : '';
  const res = await api.post<ApiResponse<unknown>>(
    `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/submissions/${submissionId}/ai-score${qs}`
  );
  return res.data;
};

/** Promote an AI scorecard into a counting score (or reverse it). */
export const setAiScorePromotion = async (
  organizationId: string,
  hackathonIdOrSlug: string,
  submissionId: string,
  promote: boolean
): Promise<ApiResponse<unknown>> => {
  const action = promote ? 'promote' : 'unpromote';
  const res = await api.post<ApiResponse<unknown>>(
    `/organizations/${organizationId}/hackathons/${hackathonIdOrSlug}/judging/submissions/${submissionId}/ai-score/${action}`
  );
  return res.data;
};

// ── Judge-side AI assist (advisory; the judge views/runs it but always
//    enters and submits their own score) ──────────────────────────────────

/** The AI scorecard for a submission, from the judge dashboard. Null if none. */
export const getJudgeAiScorecard = async (
  hackathonId: string,
  submissionId: string
): Promise<ApiResponse<AiScorecard | null>> => {
  const res = await api.get<ApiResponse<AiScorecard | null>>(
    `/judge/hackathons/${hackathonId}/submissions/${submissionId}/ai-score`
  );
  return res.data;
};

/** Run (or re-run) AI scoring for a submission. Re-fetch the scorecard after. */
export const runJudgeAiScore = async (
  hackathonId: string,
  submissionId: string
): Promise<ApiResponse<unknown>> => {
  const res = await api.post<ApiResponse<unknown>>(
    `/judge/hackathons/${hackathonId}/submissions/${submissionId}/ai-score`
  );
  return res.data;
};
