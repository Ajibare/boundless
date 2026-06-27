'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Wallet } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BoundlessButton } from '@/components/buttons';
import { useWalletContext } from '@/components/providers/wallet-provider';
import {
  useApplyToBounty,
  useApplyToBountyEscrow,
  useEditApplication,
  useJoinCompetition,
  type BountyPublic,
  type MyBountyApplication,
} from '@/features/bounties';
import BountyApplicationForm from './BountyApplicationForm';
import {
  type ApplicationEntryType,
  type ApplicationFormData,
  toCreateBody,
  toEditBody,
} from './applicationSchema';

type Action = 'apply' | 'edit' | 'join' | 'claim';

function actionFor(bounty: BountyPublic, editing: boolean): Action {
  const application =
    bounty.entryType === 'APPLICATION_LIGHT' ||
    bounty.entryType === 'APPLICATION_FULL';
  if (application) return editing ? 'edit' : 'apply';
  if (bounty.entryType === 'OPEN' && bounty.claimType === 'COMPETITION')
    return 'join';
  return 'claim'; // OPEN + SINGLE_CLAIM
}

/** Map an existing application to the form's field shape (for editing). */
function toFormData(app: MyBountyApplication): Partial<ApplicationFormData> {
  return {
    proposalShort: app.proposalShort ?? '',
    proposalFull: app.proposalFull ?? '',
    qualifications: app.qualifications ?? '',
    estimatedDays: app.estimatedDays != null ? String(app.estimatedDays) : '',
    portfolioLinksRaw: (app.portfolioLinks ?? []).join('\n'),
    videoIntroUrl: app.videoIntroUrl ?? '',
  };
}

interface BountyEntryDialogProps {
  bounty: BountyPublic;
  existingApplication?: MyBountyApplication | null;
  editing?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BountyEntryDialog({
  bounty,
  existingApplication,
  editing = false,
  open,
  onOpenChange,
}: BountyEntryDialogProps) {
  const { walletAddress } = useWalletContext();
  const action = actionFor(bounty, editing);

  const apply = useApplyToBounty(bounty.id);
  const edit = useEditApplication(bounty.id);
  const join = useJoinCompetition(bounty.id);
  const claim = useApplyToBountyEscrow(bounty.id);

  // Close + toast once the on-chain claim reaches a terminal state.
  useEffect(() => {
    if (!open) return;
    if (claim.isCompleted) {
      toast.success('Bounty claimed. You can start working.');
      onOpenChange(false);
    } else if (claim.isFailed) {
      toast.error(claim.error || 'Claim failed. Please try again.');
    }
  }, [open, claim.isCompleted, claim.isFailed, claim.error, onOpenChange]);

  const needsWallet = action !== 'edit' && !walletAddress;

  const entryType = bounty.entryType as ApplicationEntryType;

  const handleApply = (data: ApplicationFormData) => {
    if (!walletAddress) return;
    apply.mutate(toCreateBody(entryType, data, walletAddress), {
      onSuccess: () => {
        toast.success('Application submitted.');
        onOpenChange(false);
      },
      onError: e => toast.error((e as Error).message || 'Failed to apply.'),
    });
  };

  const handleEdit = (data: ApplicationFormData) => {
    if (!existingApplication) return;
    edit.mutate(
      { appId: existingApplication.id, body: toEditBody(entryType, data) },
      {
        onSuccess: () => {
          toast.success('Application updated.');
          onOpenChange(false);
        },
        onError: e => toast.error((e as Error).message || 'Failed to update.'),
      }
    );
  };

  const handleJoin = () => {
    if (!walletAddress) return;
    join.mutate(
      { applicantAddress: walletAddress },
      {
        onSuccess: () => {
          toast.success("You've joined the competition.");
          onOpenChange(false);
        },
        onError: e => toast.error((e as Error).message || 'Failed to join.'),
      }
    );
  };

  const handleClaim = () => {
    if (!walletAddress) return;
    void claim.run({ applicantAddress: walletAddress });
  };

  const title =
    action === 'edit'
      ? 'Edit your application'
      : action === 'apply'
        ? 'Apply to this bounty'
        : action === 'join'
          ? 'Join this competition'
          : 'Claim this bounty';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='text-white'>{title}</DialogTitle>
          <DialogDescription className='text-zinc-400'>
            {action === 'claim'
              ? 'You will work this bounty exclusively. Funds are held in escrow and paid on-chain on completion.'
              : action === 'join'
                ? 'Submit your work before the deadline; winners are paid on-chain.'
                : 'Tell the organizer why you are a fit. You can edit while your application is still under review.'}
          </DialogDescription>
        </DialogHeader>

        {/* Reputation pre-check (open + single claim) */}
        {action === 'claim' && bounty.reputationMinimum != null && (
          <div className='flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400'>
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
            <span>
              This bounty requires a minimum reputation of{' '}
              <span className='font-medium text-white'>
                {bounty.reputationMinimum}
              </span>{' '}
              to claim. Your claim is rejected on-chain if you don&apos;t meet
              it.
            </span>
          </div>
        )}

        {needsWallet ? (
          <div className='flex flex-col items-center gap-3 py-6 text-center'>
            <Wallet className='h-8 w-8 text-zinc-500' />
            <p className='text-sm text-zinc-400'>
              Connect a wallet to {action === 'join' ? 'join' : action}.
            </p>
          </div>
        ) : action === 'apply' ? (
          <BountyApplicationForm
            entryType={entryType}
            submitLabel='Submit application'
            isSubmitting={apply.isPending}
            onSubmit={handleApply}
            onCancel={() => onOpenChange(false)}
          />
        ) : action === 'edit' ? (
          <BountyApplicationForm
            entryType={entryType}
            initialData={
              existingApplication ? toFormData(existingApplication) : undefined
            }
            submitLabel='Save changes'
            isSubmitting={edit.isPending}
            onSubmit={handleEdit}
            onCancel={() => onOpenChange(false)}
          />
        ) : action === 'join' ? (
          <div className='flex items-center justify-end gap-3 pt-2'>
            <BoundlessButton
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={join.isPending}
            >
              Cancel
            </BoundlessButton>
            <BoundlessButton
              onClick={handleJoin}
              disabled={join.isPending}
              className='min-w-32'
            >
              {join.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Joining...
                </>
              ) : (
                'Join competition'
              )}
            </BoundlessButton>
          </div>
        ) : (
          // claim (open + single) — on-chain
          <div className='space-y-4'>
            {claim.isRunning ? (
              <div className='flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300'>
                <Loader2 className='text-primary h-5 w-5 animate-spin' />
                <span>
                  Claiming on-chain…{' '}
                  <span className='text-zinc-500'>({claim.phase})</span>
                </span>
              </div>
            ) : (
              <div className='flex items-center justify-end gap-3 pt-2'>
                <BoundlessButton
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </BoundlessButton>
                <BoundlessButton onClick={handleClaim} className='min-w-32'>
                  Claim bounty
                </BoundlessButton>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
