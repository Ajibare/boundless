'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useWalletContext } from '@/components/providers/wallet-provider';
import { useCancelEscrow, useEscrowOpRunner } from '@/features/hackathons';
import { signXdrWithKit } from '@/lib/wallet/wallet-kit';
import type { FundingMode } from '@/features/hackathons';

interface UseCancelHackathonOptions {
  /** Signing path. Defaults to MANAGED (custodial). */
  fundingMode?: FundingMode;
  onSuccess?: () => void;
}

/**
 * Cancels a funded hackathon on the events contract.
 *
 * The cancel op refunds partner contributions then the owner residual. For
 * MANAGED the backend signs + submits the start-cancel tx; the paged
 * batch-refund + finalize steps are driven server-side, so we poll the
 * returned op to COMPLETED as an "initiated" signal and let the backend
 * settle the refunds.
 */
export function useCancelHackathon(
  organizationId: string,
  hackathonId: string,
  options: UseCancelHackathonOptions = {}
) {
  const { walletAddress } = useWalletContext();
  const fundingMode: FundingMode = options.fundingMode ?? 'MANAGED';
  const cancelMutation = useCancelEscrow(organizationId, hackathonId);
  const runner = useEscrowOpRunner(
    { kind: 'organizer', organizationId, hackathonId },
    fundingMode === 'EXTERNAL' ? { signXdr: signXdrWithKit } : undefined
  );

  const [started, setStarted] = useState(false);
  const onSuccessRef = useRef(options.onSuccess);
  onSuccessRef.current = options.onSuccess;

  useEffect(() => {
    if (!started) return;
    if (runner.isCompleted) {
      setStarted(false);
      toast.success(
        'Hackathon cancellation submitted. Refunds are processing on-chain.'
      );
      onSuccessRef.current?.();
    } else if (runner.isFailed) {
      setStarted(false);
      toast.error(
        runner.error || 'Failed to cancel the hackathon. Please try again.'
      );
    }
  }, [started, runner.isCompleted, runner.isFailed, runner.error]);

  const cancel = async () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to cancel this hackathon.');
      return;
    }
    setStarted(true);
    const op = await runner.run(() =>
      cancelMutation.mutateAsync({
        ownerAddress: walletAddress,
        fundingMode,
      })
    );
    if (!op) setStarted(false); // run() already surfaced the error
  };

  return {
    cancel,
    isCancelling: started && (cancelMutation.isPending || runner.isRunning),
    phase: runner.phase,
  };
}
