import api from '../api';

/**
 * Winners board API: the task-first per-placement winner selection that
 * replaces the rank-based override. Each placement (overall or track) carries
 * the engine's score-based default, the current pick, the candidate list, and
 * a conflict flag when the pick already holds another placement (stacking).
 */

export interface WinnersBoardCandidate {
  submissionId: string;
  projectName: string;
  averageScore: number;
}

export interface WinnersBoardSelection extends WinnersBoardCandidate {
  source: 'COMPUTED' | 'ORGANIZER_OVERRIDE';
}

export interface WinnersBoardPlacement {
  placementId: string;
  position: number;
  label: string | null;
  amount: string;
  currency: string;
  /** Current winner: an organizer pick, or the engine default. */
  selected: WinnersBoardSelection | null;
  /** What the engine would pick if not overridden. */
  defaultCandidate: WinnersBoardCandidate | null;
  /** Eligible submissions for this placement, sorted by score (desc). */
  candidates: WinnersBoardCandidate[];
  /** The pick already holds another placement (stacking). */
  conflict: boolean;
  /** Organizer deliberately left this prize unawarded. */
  withheld: boolean;
}

export interface WinnersBoardPrize {
  prizeId: string;
  prizeName: string;
  isOverall: boolean;
  trackIds: string[];
  placements: WinnersBoardPlacement[];
}

export interface WinnersBoardGates {
  submissionDeadlinePassed: boolean;
  complete: boolean;
  incompleteSubmissionCount: number;
  reviewedCount: number;
}

export interface WinnersBoard {
  hackathonId: string;
  resultsPublished: boolean;
  prizes: WinnersBoardPrize[];
  gates: WinnersBoardGates;
}

const base = (organizationId: string, hackathonId: string) =>
  `/organizations/${organizationId}/hackathons/${hackathonId}/judging/winners`;

export const getWinnersBoard = async (
  organizationId: string,
  hackathonId: string
): Promise<WinnersBoard> => {
  const res = await api.get<{ data: WinnersBoard }>(
    `${base(organizationId, hackathonId)}/board`
  );
  return res.data.data;
};

export const setPlacementWinner = async (
  organizationId: string,
  hackathonId: string,
  placementId: string,
  submissionId: string
): Promise<void> => {
  await api.put(
    `${base(organizationId, hackathonId)}/placements/${placementId}`,
    {
      submissionId,
    }
  );
};

export const clearPlacementWinner = async (
  organizationId: string,
  hackathonId: string,
  placementId: string
): Promise<void> => {
  await api.delete(
    `${base(organizationId, hackathonId)}/placements/${placementId}`
  );
};

/** Deliberately leave a placement unawarded ("no submission earned it"). */
export const withholdPlacement = async (
  organizationId: string,
  hackathonId: string,
  placementId: string
): Promise<void> => {
  await api.post(
    `${base(organizationId, hackathonId)}/placements/${placementId}/withhold`,
    {}
  );
};
