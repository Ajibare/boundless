'use client';

import {
  Loader2,
  Check,
  AlertTriangle,
  ExternalLink,
  Trophy,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { BoundlessButton } from '@/components/buttons';
import { getTransactionExplorerUrl } from '@/lib/wallet-utils';
import type { EscrowRunPhase } from '@/features/hackathons';

interface SubmissionAnchorProgressProps {
  open: boolean;
  phase: EscrowRunPhase;
  txHash: string | null;
  error: string | null;
  isCompleted: boolean;
  isFailed: boolean;
  /**
   * True while the participant's Boundless-managed wallet is still loading or
   * provisioning. Shown as an explicit step so the on-chain anchor is never
   * silently skipped for a not-yet-ready wallet.
   */
  walletPreparing?: boolean;
  onClose: () => void;
  onRetry?: () => void;
  onViewSubmission?: () => void;
}

interface Step {
  phase: EscrowRunPhase;
  label: string;
}

// Participants always anchor via their managed wallet (MANAGED) — the backend
// signs + sponsor-fee-bumps, so there is no in-browser signature step.
const ANCHOR_STEPS: Step[] = [
  { phase: 'starting', label: 'Preparing your submission' },
  { phase: 'polling', label: 'Anchoring on-chain' },
];

/**
 * Step-by-step on-chain anchoring progress for a hackathon submission, driven by
 * the participant {@link useSubmissionAnchor} runner phase. Mirrors the org-side
 * FundingProgressModal but is MANAGED-only and uses anchor-appropriate copy. A
 * submission is only prize-eligible once anchoring reaches COMPLETED, so the
 * modal stays put (non-dismissable) until the op settles.
 */
export default function SubmissionAnchorProgress({
  open,
  phase,
  txHash,
  error,
  isCompleted,
  isFailed,
  walletPreparing = false,
  onClose,
  onRetry,
  onViewSubmission,
}: SubmissionAnchorProgressProps) {
  const dismissable = isCompleted || isFailed;

  const phaseIndex = ANCHOR_STEPS.findIndex(s => s.phase === phase);
  const activeIndex = isCompleted
    ? ANCHOR_STEPS.length
    : phaseIndex >= 0
      ? phaseIndex
      : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        // Dismissable only once anchoring settles; while in-flight it stays put
        // so the participant can't lose track of an on-chain op.
        if (!next && dismissable) onClose();
      }}
    >
      <DialogContent
        className='bg-background-card max-w-md border-gray-800'
        showCloseButton={dismissable}
        onInteractOutside={e => {
          if (!dismissable) e.preventDefault();
        }}
        onEscapeKeyDown={e => {
          if (!dismissable) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className='text-white'>
            {isCompleted
              ? 'Submission anchored'
              : isFailed
                ? 'Anchoring failed'
                : 'Anchoring your submission'}
          </DialogTitle>
          <DialogDescription className='text-gray-400'>
            {isCompleted
              ? 'Your submission is recorded on-chain and is now eligible for prizes.'
              : isFailed
                ? 'Your submission is saved — you can retry anchoring anytime. It must be anchored on-chain to be eligible for prizes.'
                : 'Keep this open while we record your submission on-chain.'}
          </DialogDescription>
        </DialogHeader>

        {isCompleted ? (
          <div className='flex flex-col items-center gap-3 py-4'>
            <div className='flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15'>
              <Trophy className='h-7 w-7 text-green-400' />
            </div>
            {txHash && <ExplorerLink txHash={txHash} />}
          </div>
        ) : isFailed ? (
          <div className='flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3'>
            <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-red-400' />
            <p className='text-sm text-red-300'>
              {error || 'The anchoring transaction could not be completed.'}
            </p>
          </div>
        ) : walletPreparing ? (
          <ol className='space-y-3 py-1'>
            <li className='flex items-center gap-3'>
              <StepIcon state='active' />
              <span className='text-sm font-medium text-white'>
                Preparing your Boundless wallet
              </span>
            </li>
            {ANCHOR_STEPS.map(step => (
              <li key={step.phase} className='flex items-center gap-3'>
                <StepIcon state='pending' />
                <span className='text-sm text-gray-500'>{step.label}</span>
              </li>
            ))}
          </ol>
        ) : (
          <ol className='space-y-3 py-1'>
            {ANCHOR_STEPS.map((step, i) => {
              const state =
                i < activeIndex
                  ? 'done'
                  : i === activeIndex
                    ? 'active'
                    : 'pending';
              return (
                <li key={step.phase} className='flex items-center gap-3'>
                  <StepIcon state={state} />
                  <span
                    className={`text-sm ${
                      state === 'pending'
                        ? 'text-gray-500'
                        : state === 'active'
                          ? 'font-medium text-white'
                          : 'text-gray-300'
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
            {txHash && (
              <li className='pl-9'>
                <ExplorerLink txHash={txHash} />
              </li>
            )}
          </ol>
        )}

        <DialogFooter className='gap-2 sm:gap-2'>
          {isCompleted && (
            <>
              <BoundlessButton
                variant='outline'
                onClick={onClose}
                className='border-gray-700'
              >
                Close
              </BoundlessButton>
              {onViewSubmission && (
                <BoundlessButton onClick={onViewSubmission}>
                  View submission
                </BoundlessButton>
              )}
            </>
          )}
          {isFailed && (
            <>
              <BoundlessButton
                variant='outline'
                onClick={onClose}
                className='border-gray-700'
              >
                Close
              </BoundlessButton>
              {onRetry && (
                <BoundlessButton onClick={onRetry}>Retry</BoundlessButton>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIcon({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <span className='flex h-6 w-6 items-center justify-center rounded-full bg-green-500/15'>
        <Check className='h-3.5 w-3.5 text-green-400' />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className='flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15'>
        <Loader2 className='h-3.5 w-3.5 animate-spin text-amber-400' />
      </span>
    );
  }
  return (
    <span className='flex h-6 w-6 items-center justify-center rounded-full border border-gray-700'>
      <span className='h-1.5 w-1.5 rounded-full bg-gray-600' />
    </span>
  );
}

function ExplorerLink({ txHash }: { txHash: string }) {
  let href = '';
  try {
    href = getTransactionExplorerUrl(txHash);
  } catch {
    href = '';
  }
  if (!href) return null;
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='text-primary inline-flex items-center gap-1.5 text-xs hover:underline'
    >
      View transaction
      <ExternalLink className='h-3 w-3' />
    </a>
  );
}
