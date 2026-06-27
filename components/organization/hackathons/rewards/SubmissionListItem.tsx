'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Submission } from './types';
import { calculatePercentage, getScoreColor, getRankBadgeColor } from './utils';

interface SubmissionListItemProps {
  submission: Submission;
}

export default function SubmissionListItem({
  submission,
}: SubmissionListItemProps) {
  const percentage = calculatePercentage(submission.score, submission.maxScore);

  return (
    <div className='bg-background-card flex flex-col gap-3 rounded-lg border border-gray-900 p-3 transition-colors hover:bg-gray-900/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <Avatar className='h-10 w-10 shrink-0'>
          <AvatarImage src={submission.avatar} />
          <AvatarFallback>
            {submission.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2'>
            <span className='truncate text-sm font-medium text-white'>
              {submission.name}
            </span>
            <Link
              href={`#`}
              className='group hover:text-primary flex items-center gap-1 text-xs text-gray-400 transition-colors sm:text-sm'
            >
              <span className='truncate'>{submission.submissionTitle}</span>
              <ArrowUpRight className='h-3 w-3 flex-shrink-0 transition-opacity' />
            </Link>
          </div>
        </div>
      </div>
      <div className='flex flex-shrink-0 items-center justify-between gap-2 sm:gap-4'>
        <span
          className={cn(
            'text-xs font-medium sm:text-sm',
            getScoreColor(percentage)
          )}
        >
          {submission.score}/{submission.maxScore} ({percentage}%)
        </span>
        {submission.rank ? (
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-white sm:gap-2',
              submission.rank === 1
                ? 'bg-warning-800 border-warning-800'
                : submission.rank === 2
                  ? 'bg-secondary-800 border-secondary-800'
                  : submission.rank === 3
                    ? 'bg-error-800 border-error-800'
                    : 'border-gray-800'
            )}
          >
            <Image
              src='/crown.svg'
              alt='Crown'
              width={16}
              height={16}
              className='h-3 w-3 object-contain sm:h-4 sm:w-4'
            />
            <span
              className={cn(
                'text-[10px] sm:text-xs',
                getRankBadgeColor(submission.rank)
              )}
            >
              {submission.rank}
              {submission.rank === 1
                ? 'st'
                : submission.rank === 2
                  ? 'nd'
                  : submission.rank === 3
                    ? 'rd'
                    : 'th'}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
