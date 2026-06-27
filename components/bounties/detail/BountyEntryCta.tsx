'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, ChevronRight, Loader2, Lock } from 'lucide-react';

import { BoundlessButton } from '@/components/buttons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useWalletContext } from '@/components/providers/wallet-provider';
import {
  useLeaveCompetition,
  useWithdrawApplication,
  useWithdrawApplicationEscrow,
  type BountyPublic,
  type MyBountyApplication,
} from '@/features/bounties';
import BountyEntryDialog from './entry/BountyEntryDialog';

const ACCEPTING_STATUSES = new Set([
  'open',
  'open_for_applications',
  'upcoming',
]);

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Application submitted',
  SHORTLISTED: 'Shortlisted',
  SELECTED: 'Selected',
  DECLINED: 'Not selected',
  WITHDRAWN: 'Withdrawn',
};

const STATUS_CLASS: Record<string, string> = {
  SUBMITTED: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  SHORTLISTED: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  SELECTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  DECLINED: 'border-red-500/30 bg-red-500/10 text-red-400',
  WITHDRAWN: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
};

export function BountyEntryCta({
  bounty,
  myApplication,
  hasActiveSubmission = false,
}: {
  bounty: BountyPublic;
  myApplication: MyBountyApplication | null;
  /** An anchored submission blocks application/claim withdrawal until pulled. */
  hasActiveSubmission?: boolean;
}) {
  const { walletAddress } = useWalletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const withdrawApp = useWithdrawApplication(bounty.id);
  const leave = useLeaveCompetition(bounty.id);
  const withdrawClaim = useWithdrawApplicationEscrow(bounty.id);

  const isApplication =
    bounty.entryType === 'APPLICATION_LIGHT' ||
    bounty.entryType === 'APPLICATION_FULL';
  const isCompetition =
    bounty.entryType === 'OPEN' && bounty.claimType === 'COMPETITION';

  const primaryLabel = isApplication
    ? 'Apply'
    : isCompetition
      ? 'Join competition'
      : 'Claim this bounty';

  const deadlinePassed =
    !!bounty.applicationWindowCloseAt &&
    new Date(bounty.applicationWindowCloseAt).getTime() < Date.now();
  const accepting = ACCEPTING_STATUSES.has(bounty.status);

  const withdrawn =
    !!myApplication &&
    (myApplication.applicationStatus === 'WITHDRAWN' ||
      myApplication.status === 'withdrawn');
  const isActive = !!myApplication && !withdrawn;
  // A single-claim bounty taken by someone else. The claimant themselves sees
  // the "you're in this bounty" branch, so this is the locked view for others.
  const claimant = bounty.claimedBy ?? null;
  const claimedByOther = !isActive && !!claimant;
  // Application records are only mutable while SUBMITTED.
  const editable =
    isApplication && myApplication?.applicationStatus === 'SUBMITTED';

  useEffect(() => {
    if (withdrawClaim.isCompleted) toast.success('Claim withdrawn.');
    else if (withdrawClaim.isFailed)
      toast.error(withdrawClaim.error || 'Withdraw failed.');
  }, [withdrawClaim.isCompleted, withdrawClaim.isFailed, withdrawClaim.error]);

  const handleWithdraw = () => {
    if (isApplication) {
      if (!myApplication) return;
      withdrawApp.mutate(myApplication.id, {
        onSuccess: () => toast.success('Application withdrawn.'),
        onError: e =>
          toast.error((e as Error).message || 'Failed to withdraw.'),
      });
    } else if (isCompetition) {
      if (!walletAddress) return toast.error('Connect a wallet to leave.');
      leave.mutate(
        { applicantAddress: walletAddress },
        {
          onSuccess: () => toast.success('You left the competition.'),
          onError: e => toast.error((e as Error).message || 'Failed to leave.'),
        }
      );
    } else {
      if (!walletAddress) return toast.error('Connect a wallet to withdraw.');
      void withdrawClaim.run({ applicantAddress: walletAddress });
    }
    setConfirmWithdraw(false);
  };

  const withdrawPending =
    withdrawApp.isPending || leave.isPending || withdrawClaim.isRunning;
  const withdrawLabel = isCompetition ? 'Leave competition' : 'Withdraw';

  return (
    <div className='rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5'>
      {isActive ? (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <CheckCircle2 className='text-primary h-4 w-4' />
            <span className='text-sm font-medium text-white'>
              You&apos;re in this bounty
            </span>
          </div>
          {myApplication?.applicationStatus && (
            <Badge
              variant='outline'
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_CLASS[myApplication.applicationStatus] ??
                'border-zinc-700 bg-zinc-800/60 text-zinc-300'
              }`}
            >
              {STATUS_LABEL[myApplication.applicationStatus] ??
                myApplication.applicationStatus}
            </Badge>
          )}

          {/* Edit (application, while SUBMITTED) */}
          {editable && (
            <BoundlessButton
              variant='outline'
              className='w-full'
              onClick={() => {
                setEditing(true);
                setDialogOpen(true);
              }}
            >
              Edit application
            </BoundlessButton>
          )}

          {/* Withdraw / leave (two-step confirm) */}
          {(editable || isCompetition || !isApplication) &&
            (confirmWithdraw ? (
              <div className='flex gap-2'>
                <BoundlessButton
                  variant='outline'
                  className='flex-1'
                  onClick={() => setConfirmWithdraw(false)}
                  disabled={withdrawPending}
                >
                  Cancel
                </BoundlessButton>
                <BoundlessButton
                  className='flex-1 bg-red-500 text-white hover:bg-red-600'
                  onClick={handleWithdraw}
                  disabled={withdrawPending}
                >
                  {withdrawPending ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Confirm'
                  )}
                </BoundlessButton>
              </div>
            ) : hasActiveSubmission ? (
              <div className='space-y-1.5'>
                <BoundlessButton
                  variant='outline'
                  className='w-full text-zinc-500'
                  disabled
                >
                  {withdrawLabel}
                </BoundlessButton>
                <p className='flex items-center gap-1.5 text-xs text-zinc-500'>
                  <Lock className='h-3.5 w-3.5' />
                  Withdraw your submission first.
                </p>
              </div>
            ) : (
              <BoundlessButton
                variant='outline'
                className='w-full text-red-400 hover:bg-red-500/10 hover:text-red-300'
                onClick={() => setConfirmWithdraw(true)}
              >
                {withdrawLabel}
              </BoundlessButton>
            ))}
        </div>
      ) : claimedByOther ? (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <Lock className='h-4 w-4 text-zinc-400' />
            <span className='text-sm font-medium text-white'>Claimed</span>
          </div>
          <Link
            href={`/profile/${claimant!.username}`}
            target='_blank'
            className='group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60'
          >
            <Avatar className='h-9 w-9'>
              <AvatarImage
                src={claimant!.avatarUrl ?? undefined}
                alt={claimant!.username}
              />
              <AvatarFallback className='text-xs'>
                {claimant!.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium text-white group-hover:underline'>
                @{claimant!.username}
              </p>
              <p className='text-xs text-zinc-500'>View profile</p>
            </div>
            <ChevronRight className='h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300' />
          </Link>
        </div>
      ) : (
        <>
          <BoundlessButton
            size='lg'
            className='w-full'
            disabled={!accepting || deadlinePassed}
            onClick={() => {
              setEditing(false);
              setDialogOpen(true);
            }}
          >
            {primaryLabel}
          </BoundlessButton>
          <p className='mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-500'>
            {!accepting ? (
              <>
                <Lock className='h-3.5 w-3.5' />
                This bounty is not accepting entries.
              </>
            ) : deadlinePassed ? (
              <>
                <Lock className='h-3.5 w-3.5' />
                Applications have closed.
              </>
            ) : withdrawn ? (
              'You withdrew earlier — you can enter again.'
            ) : (
              'Funds are held in escrow and paid on-chain to winners.'
            )}
          </p>
        </>
      )}

      <BountyEntryDialog
        bounty={bounty}
        existingApplication={myApplication}
        editing={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
