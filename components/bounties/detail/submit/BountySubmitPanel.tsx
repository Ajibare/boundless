'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

import { BoundlessButton } from '@/components/buttons';
import { useWalletContext } from '@/components/providers/wallet-provider';
import {
  useWithdrawSubmission,
  type BountyPublic,
  type MyBountyApplication,
} from '@/features/bounties';

/** Statuses where a builder is entitled to submit work. */
function canSubmit(
  bounty: BountyPublic,
  app: MyBountyApplication | null
): boolean {
  if (!app) return false;
  const withdrawn =
    app.applicationStatus === 'WITHDRAWN' || app.status === 'withdrawn';
  if (withdrawn) return false;
  const isApplication =
    bounty.entryType === 'APPLICATION_LIGHT' ||
    bounty.entryType === 'APPLICATION_FULL';
  if (isApplication) {
    return (
      app.applicationStatus === 'SELECTED' ||
      app.applicationStatus === 'SHORTLISTED'
    );
  }
  // Open single claim / competition: claimed or joined (escrow active).
  return app.status === 'active' || app.applicationStatus === 'SELECTED';
}

export default function BountySubmitPanel({
  bounty,
  myApplication,
  hasActiveSubmission = false,
}: {
  bounty: BountyPublic;
  myApplication: MyBountyApplication | null;
  /** True once the caller has an anchored (non-withdrawn) submission. */
  hasActiveSubmission?: boolean;
}) {
  const { walletAddress } = useWalletContext();
  const withdraw = useWithdrawSubmission(bounty.id);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  useEffect(() => {
    if (withdraw.isCompleted) {
      toast.success('Submission withdrawn.');
      setConfirmWithdraw(false);
    } else if (withdraw.isFailed) {
      toast.error(withdraw.error || 'Withdraw failed.');
    }
  }, [withdraw.isCompleted, withdraw.isFailed, withdraw.error]);

  if (!canSubmit(bounty, myApplication)) return null;

  const handleWithdraw = () => {
    if (!walletAddress) return toast.error('Connect a wallet to withdraw.');
    void withdraw.run({ applicantAddress: walletAddress });
  };

  return (
    <div className='rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5'>
      <h3 className='mb-1 flex items-center gap-2 text-sm font-semibold text-white'>
        <Send className='text-primary h-4 w-4' />
        Submit your work
      </h3>

      {hasActiveSubmission ? (
        <div className='mt-3 space-y-3'>
          <div className='flex items-center gap-2 text-sm text-zinc-200'>
            <CheckCircle2 className='text-primary h-4 w-4' />
            Work submitted
          </div>
          <Link
            href={`/bounties/${bounty.id}/submit`}
            target='_blank'
            rel='noopener noreferrer'
            className='block'
          >
            <BoundlessButton variant='outline' className='w-full'>
              Edit submission
            </BoundlessButton>
          </Link>
          {confirmWithdraw ? (
            <div className='flex gap-2'>
              <BoundlessButton
                variant='outline'
                className='flex-1'
                onClick={() => setConfirmWithdraw(false)}
                disabled={withdraw.isRunning}
              >
                Cancel
              </BoundlessButton>
              <BoundlessButton
                className='flex-1 bg-red-500 text-white hover:bg-red-600'
                onClick={handleWithdraw}
                disabled={withdraw.isRunning}
              >
                {withdraw.isRunning ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  'Confirm'
                )}
              </BoundlessButton>
            </div>
          ) : (
            <BoundlessButton
              variant='outline'
              className='w-full text-red-400 hover:bg-red-500/10 hover:text-red-300'
              onClick={() => setConfirmWithdraw(true)}
            >
              Withdraw submission
            </BoundlessButton>
          )}
        </div>
      ) : (
        <div className='mt-3 space-y-2'>
          <p className='text-xs text-zinc-500'>
            Link your deliverable and any supporting docs, demo, or media.
          </p>
          <Link
            href={`/bounties/${bounty.id}/submit`}
            target='_blank'
            rel='noopener noreferrer'
            className='block'
          >
            <BoundlessButton className='w-full'>
              Submit your work
            </BoundlessButton>
          </Link>
        </div>
      )}
    </div>
  );
}
