import { useState, useEffect, useCallback } from 'react';
import {
  getWinnersBoard,
  setPlacementWinner,
  clearPlacementWinner,
  withholdPlacement,
  type WinnersBoard,
} from '@/lib/api/hackathons/winners';
import { extractApiErrorMessage } from '@/lib/api/api';

/**
 * Loads the per-placement winners board and exposes pick/clear actions. Each
 * action writes the organizer override server-side, then refetches so the
 * board (defaults, conflicts, gates) stays consistent.
 */
export const useWinnersBoard = (
  organizationId: string,
  hackathonId: string
) => {
  const [board, setBoard] = useState<WinnersBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPlacementId, setSavingPlacementId] = useState<string | null>(
    null
  );

  const fetchBoard = useCallback(async () => {
    if (!organizationId || !hackathonId) return;
    try {
      const data = await getWinnersBoard(organizationId, hackathonId);
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(
        extractApiErrorMessage(err, 'Failed to load the winners board.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, hackathonId]);

  useEffect(() => {
    setIsLoading(true);
    void fetchBoard();
  }, [fetchBoard]);

  const selectWinner = useCallback(
    async (placementId: string, submissionId: string) => {
      setSavingPlacementId(placementId);
      try {
        await setPlacementWinner(
          organizationId,
          hackathonId,
          placementId,
          submissionId
        );
        await fetchBoard();
      } finally {
        setSavingPlacementId(null);
      }
    },
    [organizationId, hackathonId, fetchBoard]
  );

  const clearWinner = useCallback(
    async (placementId: string) => {
      setSavingPlacementId(placementId);
      try {
        await clearPlacementWinner(organizationId, hackathonId, placementId);
        await fetchBoard();
      } finally {
        setSavingPlacementId(null);
      }
    },
    [organizationId, hackathonId, fetchBoard]
  );

  const withholdWinner = useCallback(
    async (placementId: string) => {
      setSavingPlacementId(placementId);
      try {
        await withholdPlacement(organizationId, hackathonId, placementId);
        await fetchBoard();
      } finally {
        setSavingPlacementId(null);
      }
    },
    [organizationId, hackathonId, fetchBoard]
  );

  return {
    board,
    isLoading,
    error,
    savingPlacementId,
    refetch: fetchBoard,
    selectWinner,
    clearWinner,
    withholdWinner,
  };
};
