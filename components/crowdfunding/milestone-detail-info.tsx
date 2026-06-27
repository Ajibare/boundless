'use client';

import { CalendarDays, Target, Clock } from 'lucide-react';
import type { Milestone, Crowdfunding } from '@/features/projects/types';

interface MilestoneDetailInfoProps {
  milestone: Milestone;
  campaign: Crowdfunding;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysRemaining(endDate?: string | null): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function MilestoneDetailInfo({
  milestone,
  campaign,
}: MilestoneDetailInfoProps) {
  const totalAmount =
    campaign.milestones?.reduce((s, m) => s + (m.amount ?? 0), 0) ?? 0;
  const amount = milestone.amount ?? 0;
  const pct = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(0) : '0';

  const days = daysRemaining(milestone.endDate);
  const isOverdue = days !== null && days < 0;

  return (
    <div className='grid grid-cols-2 gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 sm:grid-cols-3'>
      {/* Amount */}
      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-xs text-zinc-500'>
          <Target className='h-3.5 w-3.5' />
          Payout
        </div>
        <p className='text-lg font-bold text-white'>
          {campaign.fundingCurrency ?? 'USDC'} {amount.toLocaleString()}
        </p>
        <p className='text-xs text-zinc-600'>{pct}% of total raise</p>
      </div>

      {/* Due date */}
      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-xs text-zinc-500'>
          <CalendarDays className='h-3.5 w-3.5' />
          Due date
        </div>
        <p className='text-base font-semibold text-white'>
          {formatDate(milestone.endDate)}
        </p>
        {days !== null && (
          <p
            className={
              isOverdue
                ? 'text-xs text-red-400'
                : days <= 7
                  ? 'text-xs text-amber-400'
                  : 'text-xs text-zinc-600'
            }
          >
            {isOverdue
              ? `${Math.abs(days)} days overdue`
              : days === 0
                ? 'Due today'
                : `${days} days remaining`}
          </p>
        )}
      </div>

      {/* Submitted at / Start date */}
      <div className='space-y-1'>
        <div className='flex items-center gap-1.5 text-xs text-zinc-500'>
          <Clock className='h-3.5 w-3.5' />
          {milestone.submittedAt ? 'Submitted' : 'Start date'}
        </div>
        <p className='text-base font-semibold text-white'>
          {milestone.submittedAt
            ? formatDate(milestone.submittedAt)
            : formatDate(milestone.startDate)}
        </p>
        {milestone.claimedAt && (
          <p className='text-xs text-emerald-500'>
            Paid out {formatDate(milestone.claimedAt)}
          </p>
        )}
      </div>
    </div>
  );
}
