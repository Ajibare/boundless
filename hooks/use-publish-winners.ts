import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useWalletContext } from '@/components/providers/wallet-provider';
import { validatePrizeTiers } from '@/lib/utils/prize-tier-validation';
import { useEscrowOpRunner, useSelectWinners } from '@/features/hackathons';
import { signXdrWithKit } from '@/lib/wallet/wallet-kit';
import type {
  FundingMode,
  HackathonWinnerSelection,
} from '@/features/hackathons';
import type { Submission } from '@/components/organization/hackathons/rewards/types';
import type { PrizeTier } from '@/components/organization/hackathons/new/tabs/schemas/rewardsSchema';

interface UsePublishWinnersProps {
  winners: Submission[];
  prizeTiers: PrizeTier[];
  organizationId: string;
  hackathonId: string;
  /** Retained for the wizard's announcement step; not sent to select_winners. */
  announcement?: string;
  /** Signing path. Defaults to MANAGED (custodial). */
  fundingMode?: FundingMode;
  onSuccess?: () => void;
}

/**
 * Rewards hackathon winners via the events contract's `select_winners` op.
 *
 * Replaces the legacy `triggerRewardDistribution` admin-review flow. Builds a
 * position-keyed selection list from the overall (rank-based) winners, signs +
 * submits MANAGED, then polls the op to COMPLETED — at which point the backend
 * has paid each winner and moved the hackathon to COMPLETED.
 *
 * Track-prize payouts are not part of the on-chain winner_distribution
 * (which is overall-position based) and are handled separately.
 */
export const usePublishWinners = ({
  winners,
  prizeTiers,
  organizationId,
  hackathonId,
  fundingMode = 'MANAGED',
  onSuccess,
}: UsePublishWinnersProps) => {
  const { walletAddress } = useWalletContext();
  const selectMutation = useSelectWinners(organizationId, hackathonId);
  const runner = useEscrowOpRunner(
    { kind: 'organizer', organizationId, hackathonId },
    fundingMode === 'EXTERNAL' ? { signXdr: signXdrWithKit } : undefined
  );

  const [started, setStarted] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!started) return;
    if (runner.isCompleted) {
      setStarted(false);
      toast.success('Winners rewarded! Payouts settled on-chain.');
      onSuccessRef.current?.();
    } else if (runner.isFailed) {
      setStarted(false);
      toast.error(
        runner.error || 'Failed to reward winners. Please try again.'
      );
    }
  }, [started, runner.isCompleted, runner.isFailed, runner.error]);

  const publishWinners = async () => {
    try {
      // 1. Prize tiers must cover the winning ranks.
      const tierValidation = validatePrizeTiers(winners, prizeTiers);
      if (!tierValidation.valid) {
        const ranksStr = tierValidation.missingRanks
          .map(
            r =>
              `${r}${r === 1 ? 'st' : r === 2 ? 'nd' : r === 3 ? 'rd' : 'th'}`
          )
          .join(', ');
        throw new Error(
          `No prize tier found for rank${tierValidation.missingRanks.length > 1 ? 's' : ''} ${ranksStr}. ` +
            'Please configure prize tiers in the Rewards tab before publishing winners.'
        );
      }

      // 2. The organizer's browser wallet is only used for the EXTERNAL
      //    signing path. MANAGED select_winners is signed server-side by the
      //    event manager (the org treasury), so no connected wallet is needed.
      if (fundingMode === 'EXTERNAL' && !walletAddress) {
        throw new Error('Please connect your wallet to reward winners.');
      }

      // 3. Build position-keyed selections from the overall (rank-based)
      //    winners. The payout recipient is resolved server-side = the
      //    submitter's (team leader's) Boundless managed wallet, so we only
      //    send the winning submission id + its position — no anchored address
      //    or prior on-chain submission anchor is required.
      const selections: HackathonWinnerSelection[] = [];
      const seenPositions = new Set<number>();

      for (const w of winners) {
        if (w.rank == null) continue; // track winners aren't on-chain positions
        const submissionId = w.submissionId || w.id;
        if (!submissionId) continue;
        if (seenPositions.has(w.rank)) {
          throw new Error(
            `Two winners are assigned to position ${w.rank}. Each position can ` +
              'have only one winner.'
          );
        }
        seenPositions.add(w.rank);
        selections.push({ submissionId, position: w.rank });
      }

      if (selections.length === 0) {
        throw new Error('No eligible overall winners to reward.');
      }

      // 4. Kick off the on-chain payout; completion is handled by the poller.
      setStarted(true);
      const op = await runner.run(() =>
        selectMutation.mutateAsync({
          // ownerAddress is a hint only — the backend resolves and signs with
          // the on-chain event manager. Send it when a wallet is connected
          // (required for EXTERNAL; harmless fallback for MANAGED).
          ...(walletAddress ? { ownerAddress: walletAddress } : {}),
          selections,
          fundingMode,
        })
      );
      if (!op) setStarted(false); // run() already surfaced the error
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to publish winners. Please try again.';
      toast.error(errorMessage);
      throw error;
    }
  };

  return {
    isPublishing: started && (selectMutation.isPending || runner.isRunning),
    publishWinners,
    // Runner state, surfaced for the payout progress modal.
    phase: runner.phase,
    txHash: runner.txHash,
    isCompleted: runner.isCompleted,
    isFailed: runner.isFailed,
    error: runner.error,
    /** Clear the runner so the modal closes / a retry starts fresh. */
    reset: runner.reset,
  };
};
