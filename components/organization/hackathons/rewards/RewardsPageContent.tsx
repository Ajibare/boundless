'use client';

import React from 'react';
import {
  Megaphone,
  CheckCircle2,
  Trophy,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { BoundlessButton } from '@/components/buttons';
import PodiumSection from '@/components/organization/hackathons/rewards/PodiumSection';
import { TrackWinnersSection } from '@/components/organization/hackathons/rewards/TrackWinnersSection';
import { WinnersBoard } from '@/components/organization/hackathons/rewards/WinnersBoard';
import { Submission } from '@/components/organization/hackathons/rewards/types';
import type { HackathonTrackWinner } from '@/lib/api/hackathons';
import type { WinnersBoard as WinnersBoardData } from '@/lib/api/hackathons/winners';
import { cn } from '@/lib/utils';

interface RewardsPageContentProps {
  organizationId: string;
  hackathonId: string;
  submissions: Submission[];
  isLoadingSubmissions: boolean;
  maxRank: number;
  hasWinners: boolean;
  /** Opens the pay-winners wizard. */
  onPublishClick: () => void;
  /** Opens the confirm-winners dialog (publishes judging results). */
  onPublishResults: () => void;
  isPublishingResults?: boolean;
  resultsPublished?: boolean;
  /** Funded on-chain — required before winners can be paid. */
  canReward?: boolean;
  trackWinners?: HackathonTrackWinner[];
  /** Reports the live board snapshot up to the page (for gating Confirm). */
  onBoardLoaded?: (board: WinnersBoardData) => void;
  winnersChosen?: number;
  totalPlacements?: number;
  eligiblePlacements?: number;
}

const STEPS = ['Pick winners', 'Confirm', 'Pay'] as const;

function StageIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className='flex flex-wrap items-center gap-2 text-xs'>
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <span
            className={cn(
              'flex items-center gap-1.5',
              i <= current ? 'text-white' : 'text-gray-500'
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                i < current
                  ? 'bg-primary text-primary-foreground'
                  : i === current
                    ? 'border-primary text-primary border'
                    : 'border border-gray-700 text-gray-500'
              )}
            >
              {i < current ? <Check className='h-3 w-3' /> : i + 1}
            </span>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className='h-px w-6 bg-gray-700' />}
        </React.Fragment>
      ))}
    </div>
  );
}

export const RewardsPageContent: React.FC<RewardsPageContentProps> = ({
  organizationId,
  hackathonId,
  submissions,
  maxRank,
  onPublishClick,
  onPublishResults,
  isPublishingResults = false,
  resultsPublished = false,
  canReward = false,
  trackWinners = [],
  onBoardLoaded,
  winnersChosen = 0,
  totalPlacements = 0,
  eligiblePlacements = 0,
}) => {
  // ── Published: show the winners, then pay them out. ──
  if (resultsPublished) {
    return (
      <div className='space-y-8'>
        <StageIndicator current={2} />

        <div className='flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4'>
          <CheckCircle2 className='h-6 w-6 shrink-0 text-green-500' />
          <div>
            <h3 className='text-sm font-semibold text-green-400'>
              Winners confirmed
            </h3>
            <p className='text-xs text-gray-400'>
              The winners are locked in and announced. Pay out their prizes
              below.
            </p>
          </div>
        </div>

        {submissions.length > 0 && (
          <section className='space-y-6'>
            <PodiumSection submissions={submissions} maxRank={maxRank} />
            <TrackWinnersSection trackWinners={trackWinners} />
          </section>
        )}

        <section className='bg-background-card rounded-xl border border-gray-900 p-5'>
          <h3 className='text-sm font-semibold text-white'>Pay winners</h3>
          <p className='mt-1 text-xs text-gray-400'>
            Send each winner their prize from the prize pool.
          </p>
          <div className='mt-3 flex flex-col gap-1.5'>
            <BoundlessButton
              variant='default'
              size='default'
              onClick={onPublishClick}
              disabled={!canReward}
              className='w-fit gap-2'
            >
              <Megaphone className='h-4 w-4' />
              Pay winners
            </BoundlessButton>
            {!canReward && (
              <p className='text-xs text-amber-400/80'>
                The prize pool is still being set up. This usually takes a
                moment.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ── Selection stage: pick winners, then confirm. ──
  // Prizes with no winner: fewer scored/eligible projects than prize slots, or
  // a track with no opted-in projects. Either way they won't be awarded.
  const unfilled = Math.max(0, totalPlacements - winnersChosen);

  return (
    <div className='space-y-8'>
      <StageIndicator current={0} />

      <section className='space-y-4'>
        <div>
          <h2 className='text-xl font-semibold text-white'>1. Pick winners</h2>
          <p className='mt-1 text-sm text-gray-400'>
            The highest-scored project is pre-filled for each prize. Change any
            winner you like.
          </p>
        </div>
        <WinnersBoard
          organizationId={organizationId}
          hackathonId={hackathonId}
          onBoardLoaded={onBoardLoaded}
        />
      </section>

      {totalPlacements > 0 && (
        <div className='rounded-lg border border-gray-800 bg-gray-900/40 p-4'>
          <p className='text-sm text-white'>
            <span className='font-semibold'>{winnersChosen}</span> of{' '}
            {totalPlacements} prize{totalPlacements === 1 ? '' : 's'} have a
            winner.
          </p>
          {winnersChosen > 0 && unfilled > 0 && (
            <p className='mt-1 flex items-start gap-1.5 text-xs text-amber-400'>
              <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
              {unfilled} prize{unfilled === 1 ? '' : 's'} don&apos;t have a
              winner yet and won&apos;t be awarded. Pick a winner above, or
              score more projects.
            </p>
          )}
        </div>
      )}

      {totalPlacements > 0 && (
        <section className='bg-background-card rounded-xl border border-gray-900 p-5'>
          <h3 className='text-sm font-semibold text-white'>
            2. Confirm winners
          </h3>
          <p className='mt-1 text-xs text-gray-400'>
            Locks in the winners you picked and announces them to participants.
            You&apos;ll pay out prizes next.
          </p>
          <div className='mt-3 flex flex-col gap-1.5'>
            <BoundlessButton
              variant='default'
              size='default'
              onClick={onPublishResults}
              disabled={isPublishingResults || winnersChosen === 0}
              className='w-fit gap-2'
            >
              {isPublishingResults ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Trophy className='h-4 w-4' />
              )}
              {isPublishingResults ? 'Confirming...' : 'Confirm winners'}
            </BoundlessButton>
            {winnersChosen === 0 && (
              <p className='text-xs text-amber-400/80'>
                No projects have a winning score yet. Finish judging, then pick
                at least one winner before confirming.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
