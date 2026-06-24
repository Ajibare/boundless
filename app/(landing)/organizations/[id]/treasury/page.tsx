'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Landmark, Users } from 'lucide-react';
import { AuthGuard } from '@/components/auth';
import Loading from '@/components/Loading';
import WalletsSection from '@/components/organization/treasury/WalletsSection';
import SendFunds from '@/components/organization/treasury/SendFunds';
import Receipts from '@/components/organization/treasury/Receipts';
import AuditLog from '@/components/organization/treasury/AuditLog';

type TabKey = 'wallets' | 'spend' | 'receipts' | 'activity';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'wallets', label: 'Wallets' },
  { key: 'spend', label: 'Send funds' },
  { key: 'receipts', label: 'Receipts' },
  { key: 'activity', label: 'Activity' },
];

export default function TreasuryPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const [tab, setTab] = useState<TabKey>('wallets');

  return (
    <AuthGuard redirectTo='/auth?mode=signin' fallback={<Loading />}>
      <div className='min-h-screen bg-black'>
        <div className='border-b border-gray-900 p-4'>
          <div className='mx-auto flex max-w-5xl items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <Landmark className='h-5 w-5 text-gray-400' />
              <h1 className='text-2xl font-light tracking-tight text-white sm:text-3xl'>
                Treasury
              </h1>
            </div>
            <Link
              href={`/organizations/${organizationId}/settings?tab=members`}
              className='hover:text-primary inline-flex items-center gap-1.5 text-sm text-gray-400'
              title='Manage who can access the treasury'
            >
              <Users className='h-4 w-4' />
              <span className='hidden sm:inline'>Members &amp; roles</span>
            </Link>
          </div>
        </div>

        <div className='mx-auto max-w-5xl px-6 py-8'>
          <div className='mb-8 flex gap-1 border-b border-gray-900'>
            {TABS.map(t => (
              <button
                key={t.key}
                type='button'
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors ${
                  tab === t.key
                    ? 'border-primary text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'wallets' && (
            <WalletsSection organizationId={organizationId} />
          )}
          {tab === 'spend' && <SendFunds organizationId={organizationId} />}
          {tab === 'receipts' && <Receipts organizationId={organizationId} />}
          {tab === 'activity' && <AuditLog organizationId={organizationId} />}
        </div>
      </div>
    </AuthGuard>
  );
}
