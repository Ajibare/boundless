'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import { computeBountyModeLabel } from '@/components/organization/bounties/new/tabs/schemas/modeSchema';
import {
  useMyBountyApplications,
  useMyBountySubmissions,
  type BountyActivitySummary,
  type MyBountyApplicationRow,
  type MyBountySubmissionRow,
} from '@/features/bounties';

type Tab = 'applications' | 'submissions';

const APP_STATUS: Record<string, { label: string; className: string }> = {
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-500/10 text-blue-400' },
  SHORTLISTED: {
    label: 'Shortlisted',
    className: 'bg-amber-500/10 text-amber-400',
  },
  SELECTED: {
    label: 'Selected',
    className: 'bg-emerald-500/10 text-emerald-400',
  },
  DECLINED: { label: 'Not selected', className: 'bg-red-500/10 text-red-400' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-zinc-700/60 text-zinc-300' },
};

/** Map a submission's review status to a builder-facing progress label. */
function submissionProgress(s: MyBountySubmissionRow): {
  label: string;
  className: string;
} {
  if (s.tierPosition != null)
    return { label: 'Won', className: 'bg-emerald-500/10 text-emerald-400' };
  switch (s.status) {
    case 'in_review':
    case 'under_review':
      return { label: 'In review', className: 'bg-blue-500/10 text-blue-400' };
    case 'accepted':
    case 'approved':
      return {
        label: 'Accepted',
        className: 'bg-emerald-500/10 text-emerald-400',
      };
    case 'rejected':
    case 'closed':
      return { label: 'Closed', className: 'bg-zinc-700/60 text-zinc-300' };
    default:
      return { label: 'Submitted', className: 'bg-blue-500/10 text-blue-400' };
  }
}

function mode(b: BountyActivitySummary): string {
  return b.entryType && b.claimType
    ? computeBountyModeLabel(b.entryType, b.claimType)
    : 'Bounty';
}

const fmtDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

export default function MyBountiesPage() {
  const [tab, setTab] = useState<Tab>('applications');
  const applications = useMyBountyApplications();
  const submissions = useMyBountySubmissions();

  const active = tab === 'applications' ? applications : submissions;
  const rows =
    tab === 'applications'
      ? (applications.data?.items ?? [])
      : (submissions.data?.items ?? []);

  return (
    <div className='mx-auto max-w-5xl px-4 py-8'>
      <h1 className='text-2xl font-bold tracking-tight text-white'>
        My bounties
      </h1>
      <p className='mt-1 text-sm text-zinc-400'>
        Track your applications, submissions, and results.
      </p>

      {/* Tabs */}
      <div className='mt-6 mb-4 flex gap-2'>
        {(['applications', 'submissions'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
              tab === t
                ? 'bg-primary text-black'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {active.isLoading ? (
        <div className='flex items-center justify-center py-20'>
          <Loader2 className='h-6 w-6 animate-spin text-zinc-500' />
        </div>
      ) : rows.length === 0 ? (
        <div className='py-16'>
          <EmptyState
            title={`No ${tab} yet`}
            description={
              tab === 'applications'
                ? 'Apply to a bounty and it will show up here.'
                : 'Submit your work on a bounty and it will show up here.'
            }
            type='compact'
          />
        </div>
      ) : (
        <div className='overflow-hidden rounded-xl border border-zinc-800'>
          {tab === 'applications'
            ? (rows as MyBountyApplicationRow[]).map(row => (
                <ApplicationRow key={row.id} row={row} />
              ))
            : (rows as MyBountySubmissionRow[]).map(row => (
                <SubmissionRow key={row.id} row={row} />
              ))}
        </div>
      )}
    </div>
  );
}

function ApplicationRow({ row }: { row: MyBountyApplicationRow }) {
  const status = row.applicationStatus
    ? (APP_STATUS[row.applicationStatus] ?? {
        label: row.applicationStatus,
        className: 'bg-zinc-700/60 text-zinc-300',
      })
    : { label: 'Claimed', className: 'bg-emerald-500/10 text-emerald-400' };

  return (
    <Link
      href={`/bounties/${row.bounty.id}`}
      className='flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3 transition-colors last:border-0 hover:bg-zinc-900/50'
    >
      <div className='min-w-0'>
        <p className='truncate text-sm font-medium text-white'>
          {row.bounty.title}
        </p>
        <p className='text-xs text-zinc-500'>
          {mode(row.bounty)} · applied {fmtDate(row.createdAt)}
        </p>
      </div>
      <Badge
        variant='outline'
        className={`shrink-0 rounded-full border-transparent px-3 py-1 text-xs font-medium ${status.className}`}
      >
        {status.label}
      </Badge>
    </Link>
  );
}

function SubmissionRow({ row }: { row: MyBountySubmissionRow }) {
  const progress = submissionProgress(row);
  const won = row.tierPosition != null && row.tierAmount;

  return (
    <div className='flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3 last:border-0'>
      <Link href={`/bounties/${row.bounty.id}`} className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium text-white hover:underline'>
          {row.bounty.title}
        </p>
        <p className='text-xs text-zinc-500'>
          {mode(row.bounty)} · submitted {fmtDate(row.createdAt)}
        </p>
      </Link>

      <div className='flex shrink-0 items-center gap-3'>
        {won && (
          <span className='text-primary text-sm font-semibold'>
            {Number(row.tierAmount).toLocaleString()}{' '}
            {row.bounty.rewardCurrency}
          </span>
        )}
        {row.rewardTransactionHash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${row.rewardTransactionHash}`}
            target='_blank'
            rel='noreferrer'
            className='text-primary inline-flex items-center gap-1 text-xs hover:underline'
            title='View payout transaction'
          >
            tx
            <ExternalLink className='h-3 w-3' />
          </a>
        )}
        <Badge
          variant='outline'
          className={`rounded-full border-transparent px-3 py-1 text-xs font-medium ${progress.className}`}
        >
          {progress.label}
        </Badge>
      </div>
    </div>
  );
}
