import api from '../api';
import { ApiResponse } from '../types';
import type { Schemas } from '../openapi';

// ── Types ───────────────────────────────────────────────────────────────

export type CustomQuestionScope = 'REGISTRATION' | 'SUBMISSION';

export type CustomQuestionType =
  | 'SHORT'
  | 'LONG'
  | 'URL'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'BOOLEAN';

export type CustomQuestion = Schemas['CustomQuestionResponseDto'];

export type CustomQuestionWrite = Schemas['CustomQuestionWriteDto'];

// ── API ─────────────────────────────────────────────────────────────────

/**
 * Organizer view of a hackathon's custom questions. Pass a scope to filter to
 * REGISTRATION or SUBMISSION; omit it for the full set.
 */
export const listCustomQuestions = async (
  organizationId: string,
  hackathonId: string,
  scope?: CustomQuestionScope
): Promise<CustomQuestion[]> => {
  const qs = scope ? `?scope=${scope}` : '';
  const res = await api.get<ApiResponse<CustomQuestion[]>>(
    `/organizations/${organizationId}/hackathons/${hackathonId}/custom-questions${qs}`
  );
  return res.data?.data ?? [];
};

/**
 * Public read for the registration / submission forms (no auth). The
 * submission form passes scope=SUBMISSION.
 */
export const listPublicCustomQuestions = async (
  idOrSlug: string,
  scope?: CustomQuestionScope
): Promise<CustomQuestion[]> => {
  const qs = scope ? `?scope=${scope}` : '';
  const res = await api.get<ApiResponse<CustomQuestion[]>>(
    `/hackathons/${idOrSlug}/custom-questions${qs}`
  );
  return res.data?.data ?? [];
};

/**
 * Replace the full custom-question set (delete-and-recreate). The submitted
 * array becomes the complete set across both scopes.
 */
export const replaceCustomQuestions = async (
  organizationId: string,
  hackathonId: string,
  questions: CustomQuestionWrite[]
): Promise<CustomQuestion[]> => {
  const res = await api.put<ApiResponse<CustomQuestion[]>>(
    `/organizations/${organizationId}/hackathons/${hackathonId}/custom-questions`,
    { questions }
  );
  return res.data?.data ?? [];
};
