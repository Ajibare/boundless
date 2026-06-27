import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWalletContext } from '@/components/providers/wallet-provider';
import {
  buildWinnerDistribution,
  calculateTotalPrizeAmount,
  getTotalPrizePoolForFunding,
} from '@/lib/utils/hackathon-escrow';
import { getTokenAddress } from '@/lib/config/tokens';
import {
  useEscrowOpRunner,
  usePublishHackathonEscrow,
} from '@/features/hackathons';
import { signXdrWithKit } from '@/lib/wallet/wallet-kit';
import { getDraft, getHackathon } from '@/lib/api/hackathons';
import { getHackathonEscrowOp } from '@/features/hackathons';
import type { FundingMode } from '@/features/hackathons';
import {
  clearPublishOpId,
  persistPublishOpId,
  readPublishOpId,
} from '@/lib/utils/publish-op-storage';
import type { RewardsFormData } from '@/components/organization/hackathons/new/tabs/schemas/rewardsSchema';
import type { InfoFormData } from '@/components/organization/hackathons/new/tabs/schemas/infoSchema';
import type { TimelineFormData } from '@/components/organization/hackathons/new/tabs/schemas/timelineSchema';
import type { ParticipantFormData } from '@/components/organization/hackathons/new/tabs/schemas/participantSchema';
import type { JudgingFormData } from '@/components/organization/hackathons/new/tabs/schemas/judgingSchema';
import type { CollaborationFormData } from '@/components/organization/hackathons/new/tabs/schemas/collaborationSchema';

interface StepData {
  information?: InfoFormData;
  timeline?: TimelineFormData;
  participation?: ParticipantFormData;
  rewards?: RewardsFormData;
  judging?: JudgingFormData;
  collaboration?: CollaborationFormData;
}

interface UseHackathonPublishProps {
  organizationId: string;
  stepData: StepData;
  draftId?: string | null;
  /** Signing path. Defaults to MANAGED (custodial). */
  fundingMode?: FundingMode;
  /**
   * For EXTERNAL funding, the connected wallet that will fund + sign (from the
   * Stellar Wallets Kit). This becomes the on-chain owner/source, NOT the
   * platform-managed wallet. Ignored for MANAGED.
   */
  externalOwnerAddress?: string | null;
  /**
   * For MANAGED funding from an organization treasury wallet: the treasury
   * wallet to fund + sign with (backend signs custodially). When set, its
   * address becomes the on-chain owner and we forward its id as sourceWalletId.
   * Omit to fund from the caller's personal managed wallet.
   */
  treasurySource?: { walletId: string; address: string } | null;
}

export interface PublishResponseData {
  id: string;
  slug: string;
  publishedAt: string;
  message: string;
  transactionHash: string | null;
}

/**
 * Publishes a hackathon draft onto the boundless-events contract.
 *
 * Replaces the legacy TrustlessWork `publishDraft` call. The draft IS a
 * Hackathon row in DRAFT status, so we hit the v2 escrow surface directly:
 *
 *   1. POST .../hackathons/:draftId/escrow/publish (CREATE_EVENT). MANAGED has
 *      the backend sign + submit; the op comes back PENDING_CONFIRM.
 *   2. Poll the op to COMPLETED (the backend subscriber flips the hackathon
 *      DRAFT_AWAITING_FUNDING -> UPCOMING on settle).
 *   3. Fetch the now-public hackathon for its slug, stash the published-modal
 *      payload, and navigate to the org hackathon page.
 */
export const useHackathonPublish = ({
  organizationId,
  stepData,
  draftId,
  fundingMode = 'MANAGED',
  externalOwnerAddress,
  treasurySource,
}: UseHackathonPublishProps) => {
  const router = useRouter();
  const { walletAddress, balances } = useWalletContext();
  const hackathonId = draftId || '';
  const isExternal = fundingMode === 'EXTERNAL';
  const usingTreasury = !isExternal && !!treasurySource;

  // The on-chain owner/source. EXTERNAL funds from the connected wallet; a
  // treasury source funds from the org treasury wallet; otherwise the caller's
  // personal platform-held custodial wallet.
  const ownerAddress = isExternal
    ? (externalOwnerAddress ?? null)
    : usingTreasury
      ? treasurySource!.address
      : walletAddress;

  const publishMutation = usePublishHackathonEscrow(
    organizationId,
    hackathonId
  );
  const runner = useEscrowOpRunner(
    { kind: 'organizer', organizationId, hackathonId },
    // EXTERNAL: sign the returned XDR with the connected wallet (Wallet Kit).
    // MANAGED needs no signer (the backend signs with the custodial wallet).
    isExternal ? { signXdr: signXdrWithKit } : undefined
  );

  const [hasStarted, setHasStarted] = useState(false);
  const [publishResponse, setPublishResponse] =
    useState<PublishResponseData | null>(null);
  // Ensures the completion side-effect (fetch slug + navigate) runs once.
  const finalizedRef = useRef(false);

  useEffect(() => {
    if (!hasStarted || finalizedRef.current) return;

    if (runner.isCompleted) {
      finalizedRef.current = true;
      void (async () => {
        // The op settled; the hackathon is now UPCOMING with a slug. Fetch it
        // so the success view's "View hackathon" link can resolve the slug.
        let slug = '';
        let publishedAt = new Date().toISOString();
        try {
          const res = await getHackathon(hackathonId);
          slug = res.data?.slug ?? '';
          publishedAt = res.data?.publishedAt ?? publishedAt;
        } catch {
          // Non-fatal: the View link falls back to the hackathon id.
        }

        const responseData: PublishResponseData = {
          id: hackathonId,
          slug,
          publishedAt,
          message: 'Hackathon published successfully',
          transactionHash: runner.txHash,
        };
        setPublishResponse(responseData);
        clearPublishOpId(hackathonId);
        toast.success('Hackathon published!', { duration: 3000 });
        // Success renders in place via FundingProgressModal; the organizer
        // navigates from there. No sessionStorage hand-off / full-page redirect.
        setHasStarted(false);
      })();
    } else if (runner.isFailed) {
      finalizedRef.current = true;
      // The backend sends the hackathon back to DRAFT on a failed CREATE_EVENT,
      // so drop the stale op id; the next attempt starts a fresh publish.
      clearPublishOpId(hackathonId);
      toast.error(runner.error || 'Failed to publish hackathon');
      setHasStarted(false);
    }
  }, [
    hasStarted,
    runner.isCompleted,
    runner.isFailed,
    runner.error,
    runner.txHash,
    hackathonId,
    organizationId,
    router,
  ]);

  const publish = async (
    // Announce options are accepted for call-site compatibility; the events
    // publish endpoint doesn't take them (announcements move to the UPCOMING
    // transition on the backend).
    _publishOptions?: {
      skipAnnouncement?: boolean;
      announcementSubject?: string;
    }
  ): Promise<PublishResponseData | null> => {
    if (!organizationId) {
      toast.error('Organization ID is required');
      return null;
    }
    if (!draftId) {
      toast.error('Draft ID is required');
      return null;
    }
    if (!ownerAddress) {
      toast.error(
        isExternal
          ? 'Connect a wallet to fund externally.'
          : 'Please connect your wallet first'
      );
      return null;
    }

    // Pre-flight: a prior publish may have already moved the hackathon out of
    // DRAFT. The backend rejects re-publishing a DRAFT_AWAITING_FUNDING row, so
    // resume the in-flight op (or report the terminal state) instead.
    //
    // Use the org-scoped draft GET, NOT the public getHackathon — the public
    // endpoint 404s for non-live (DRAFT / DRAFT_AWAITING_FUNDING) hackathons,
    // which would leave currentStatus undefined and fall through to a 400.
    let currentStatus: string | undefined;
    try {
      const res = await getDraft(organizationId, hackathonId);
      currentStatus = res.data?.status;
    } catch {
      // Non-fatal: fall through to the normal publish path.
    }

    if (
      currentStatus === 'UPCOMING' ||
      currentStatus === 'ACTIVE' ||
      currentStatus === 'JUDGING' ||
      currentStatus === 'COMPLETED'
    ) {
      clearPublishOpId(hackathonId);
      toast.success('This hackathon is already published.');
      router.push(`/organizations/${organizationId}/hackathons/${hackathonId}`);
      return null;
    }

    if (currentStatus === 'DRAFT_AWAITING_FUNDING') {
      // Funding is mid-flight. Resume polling the existing op rather than
      // re-issuing publish (which 400s).
      const storedOpRowId = readPublishOpId(hackathonId);
      if (!storedOpRowId) {
        toast.info(
          'This hackathon is already being funded on-chain. It will finish ' +
            'publishing shortly, or return to draft if the transaction fails — ' +
            'refresh in a moment to check.'
        );
        return null;
      }
      finalizedRef.current = false;
      setHasStarted(true);
      toast.info('Resuming hackathon funding…');
      await runner.run(() =>
        getHackathonEscrowOp(organizationId, hackathonId, storedOpRowId)
      );
      return null;
    }

    // ---- Normal DRAFT publish path ----
    if (
      !stepData.information ||
      !stepData.timeline ||
      !stepData.participation ||
      !stepData.rewards ||
      !stepData.judging ||
      !stepData.collaboration
    ) {
      toast.error('Please complete all steps before publishing');
      return null;
    }
    if (!stepData.timeline.submissionDeadline) {
      toast.error('A submission deadline is required before publishing');
      return null;
    }
    if (
      !stepData.rewards.prizeTiers ||
      stepData.rewards.prizeTiers.length === 0
    ) {
      toast.error('Please add at least one prize tier before publishing');
      return null;
    }

    const budget = calculateTotalPrizeAmount(stepData.rewards);
    if (!(budget > 0)) {
      toast.error('Total prize amount must be greater than zero');
      return null;
    }

    // Pre-flight: create_event debits budget + platform fee from the owner's
    // USDC. Catch an insufficient/missing balance here with a clear message
    // instead of surfacing a raw contract host error from the chain.
    const required = getTotalPrizePoolForFunding(stepData.rewards);
    const usdcEntry = balances.find(b => b.asset_code === 'USDC');
    const usdcBalance = parseFloat(usdcEntry?.balance ?? '0');
    const fmtUsdc = (n: number) =>
      n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    // Only block when balances have loaded; otherwise let the on-chain build be
    // the gate (the backend surfaces a clear error either way). EXTERNAL and
    // treasury sources fund from a different wallet than the caller's personal
    // managed wallet, so its loaded balances don't apply.
    if (
      !isExternal &&
      !usingTreasury &&
      balances.length > 0 &&
      usdcBalance < required
    ) {
      toast.error(
        usdcEntry
          ? `Insufficient USDC. Publishing locks ${fmtUsdc(required)} USDC ` +
              `(${fmtUsdc(budget)} prizes + ${fmtUsdc(required - budget)} fee), ` +
              `but your wallet has ${fmtUsdc(usdcBalance)} USDC.`
          : `Your wallet has no USDC. Publishing locks ${fmtUsdc(required)} USDC ` +
              `(${fmtUsdc(budget)} prizes + ${fmtUsdc(required - budget)} fee). ` +
              `Add USDC (and a USDC trustline) before publishing.`
      );
      return null;
    }

    let tokenAddress: string;
    try {
      tokenAddress = getTokenAddress('USDC');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Prize token is not configured'
      );
      return null;
    }

    const winnerDistribution = buildWinnerDistribution(stepData.rewards);

    finalizedRef.current = false;
    setHasStarted(true);
    setPublishResponse(null);
    toast.info('Publishing hackathon...');

    const op = await runner.run(async () => {
      const created = await publishMutation.mutateAsync({
        ownerAddress,
        tokenAddress,
        budget: String(budget),
        winnerDistribution,
        fundingMode,
        sourceWalletId: usingTreasury ? treasurySource!.walletId : undefined,
      });
      // Persist so a reload / retry can resume polling this op.
      persistPublishOpId(hackathonId, created.id);
      return created;
    });

    if (!op) {
      // run() already surfaced the error via runner.error -> toast effect.
      setHasStarted(false);
    }
    return null;
  };

  return {
    isPublishing: hasStarted && (publishMutation.isPending || runner.isRunning),
    publish,
    publishResponse,
    /** Live escrow op state for richer publish UI. */
    escrowStatus: runner.status,
    escrowPhase: runner.phase,
    escrowError: runner.error,
    escrowTxHash: runner.txHash,
  };
};
