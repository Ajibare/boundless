'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { milestoneState, TONE_PILL } from '@/lib/crowdfunding/status';
import type { Milestone } from '@/features/projects/types';

interface MilestoneDetailHeaderProps {
  milestone: Milestone;
  milestoneNumber: number;
  totalMilestones: number;
  campaignTitle: string;
  backLink: string;
}

export function MilestoneDetailHeader({
  milestone,
  milestoneNumber,
  totalMilestones,
  campaignTitle,
  backLink,
}: MilestoneDetailHeaderProps) {
  const state = milestoneState(milestone.reviewStatus, milestone.claimedAt);

  return (
    <div className='space-y-4 border-b border-zinc-800/60 pb-6'>
      <Link
        href={backLink}
        className='inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300'
      >
        <ArrowLeft className='h-4 w-4' />
        Back to milestones
      </Link>

      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0 flex-1'>
          <p className='mb-1 text-xs font-semibold tracking-wider text-zinc-600 uppercase'>
            {campaignTitle} &middot; Milestone {milestoneNumber} of{' '}
            {totalMilestones}
          </p>
          <h1 className='text-2xl font-bold text-white sm:text-3xl'>
            {milestone.title || milestone.name}
          </h1>
        </div>
        <Badge
          variant='outline'
          className={cn('mt-1 flex-shrink-0 text-xs', TONE_PILL[state.tone])}
        >
          {state.label}
        </Badge>
      </div>
    </div>
  );
}
