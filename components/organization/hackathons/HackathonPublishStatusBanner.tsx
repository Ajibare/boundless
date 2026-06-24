'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getDraft } from '@/lib/api/hackathons';
import { resetHackathonEscrowToDraft } from '@/features/hackathons';
import { useEscrowOp } from '@/features/hackathons';
import {
  clearPublishOpId,
  readPublishOpId,
} from '@/lib/utils/publish-op-storage';

interface HackathonPublishStatusBannerProps {
  organizationId: string;
  hackathonId: string;
  /** Current hackathon status from the page's data. */
  status?: string;
  /**
   * Called when the hackathon leaves DRAFT_AWAITING_FUNDING (settled to
   * UPCOMING, or reset to DRAFT on failure) so the page can refetch its copy.
   */
  onResolved?: () => void;
}

/**
 * Resumes an in-flight publish without the organizer re-clicking publish.
 *
 * When a hackathon is stuck in DRAFT_AWAITING_FUNDING (publish requested, escrow
 * op still settling), this banner:
 *   - polls the hackathon status as the source of truth until it leaves
 *     DRAFT_AWAITING_FUNDING, then tells the page to refetch;
 *   - best-effort polls the persisted escrow op for a richer failed/in-progress
 *     signal.
 * Renders nothing for any other status.
 */
export default function HackathonPublishStatusBanner({
  organizationId,
  hackathonId,
  status,
  onResolved,
}: HackathonPublishStatusBannerProps) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const isAwaiting = status === 'DRAFT_AWAITING_FUNDING';
  const opRowId = isAwaiting ? readPublishOpId(hackathonId) : null;

  // Richer phase/error when we still hold the op id from this session.
  const op = useEscrowOp(
    { kind: 'organizer', organizationId, hackathonId },
    opRowId,
    { enabled: isAwaiting && !!opRowId }
  );

  // Source of truth: poll the hackathon until the reconciliation worker flips
  // it to UPCOMING (success) or back to DRAFT (failure). Uses the org-scoped
  // draft GET — the public hackathon GET 404s while it's not live.
  const statusPoll = useQuery({
    queryKey: ['hackathon-publish-status', hackathonId],
    queryFn: () => getDraft(organizationId, hackathonId),
    enabled: isAwaiting,
    refetchInterval: query => {
      const s = query.state.data?.data?.status;
      return s && s !== 'DRAFT_AWAITING_FUNDING' ? false : 3000;
    },
  });

  const polledStatus = statusPoll.data?.data?.status;

  useEffect(() => {
    if (
      isAwaiting &&
      polledStatus &&
      polledStatus !== 'DRAFT_AWAITING_FUNDING'
    ) {
      onResolved?.();
    }
  }, [isAwaiting, polledStatus, onResolved]);

  if (!isAwaiting) return null;

  const opFailed = op.data?.status === 'FAILED';
  const errorCode = op.data?.errorCode;

  const handleResetToDraft = async () => {
    setIsResetting(true);
    try {
      await resetHackathonEscrowToDraft(organizationId, hackathonId);
      clearPublishOpId(hackathonId);
      toast.success('Moved back to draft. You can edit and republish.');
      onResolved?.();
      router.push(
        `/organizations/${organizationId}/hackathons/drafts/${hackathonId}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to switch back to draft.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
        opFailed
          ? 'border-red-900/50 bg-red-950/20'
          : 'border-amber-700/50 bg-amber-950/20'
      }`}
    >
      {opFailed ? (
        <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-red-400' />
      ) : (
        <Loader2 className='mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-400' />
      )}
      <div className='flex-1'>
        <p
          className={`text-sm font-medium ${
            opFailed ? 'text-red-300' : 'text-amber-200'
          }`}
        >
          {opFailed ? 'Prize pool setup failed' : 'Finalizing publication'}
        </p>
        <p className='mt-1 text-sm text-gray-400'>
          {opFailed
            ? `Funding failed${
                errorCode ? ` (${errorCode})` : ''
              }. The hackathon will return to draft so you can fix the issue and republish.`
            : 'Publishing your hackathon and setting up the prize pool. This ' +
              'usually takes a few moments and resumes automatically.'}
        </p>
        <button
          type='button'
          onClick={handleResetToDraft}
          disabled={isResetting}
          className='mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {isResetting ? 'Switching…' : 'Switch back to draft'}
        </button>
      </div>
    </div>
  );
}
