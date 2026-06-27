'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import {
  useBounty,
  useMyBountyApplication,
  type BountyPublic,
  type MyBountyApplication,
} from '@/features/bounties';
import BountySubmitForm from './BountySubmitForm';

/** Statuses where a builder is entitled to submit work (mirrors the panel). */
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
  return app.status === 'active' || app.applicationStatus === 'SELECTED';
}

export default function BountySubmitGate({ id }: { id: string }) {
  const { data: bounty, isLoading, error } = useBounty(id);
  const { data: myApplication } = useMyBountyApplication(id);

  if (isLoading) {
    return (
      <div className='flex min-h-[50vh] items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-zinc-500' />
      </div>
    );
  }

  if (error || !bounty) {
    return (
      <div className='py-20'>
        <EmptyState
          title='Bounty not found'
          description='This bounty may have been removed or is not public.'
          type='compact'
        />
      </div>
    );
  }

  const backLink = (
    <Link
      href={`/bounties/${id}`}
      className='mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white'
    >
      <ArrowLeft className='h-4 w-4' />
      Back to bounty
    </Link>
  );

  if (!canSubmit(bounty, myApplication ?? null)) {
    return (
      <div>
        {backLink}
        <div className='py-16'>
          <EmptyState
            title="You can't submit to this bounty yet"
            description='You need an active claim or a selected/shortlisted application before submitting work.'
            type='compact'
          />
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-3xl'>
      {backLink}
      <BountySubmitForm bounty={bounty} />
    </div>
  );
}
