'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { BoundlessButton } from '@/components/buttons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuditLog, type TreasuryAuditEntry } from '@/features/treasury';

// Plain-language labels so the activity reads for a non-technical organizer.
const ACTION_LABELS: Record<string, string> = {
  wallet_created: 'Created a wallet',
  wallet_connected: 'Connected a wallet',
  wallet_archived: 'Archived a wallet',
  wallet_restored: 'Restored a wallet',
  wallet_updated: 'Updated a wallet',
  policy_updated: 'Updated spend rules',
  spend_initiated: 'Requested a payment',
  spend_approved: 'Approved a payment',
  spend_rejected: 'Rejected a payment',
  spend_cancelled: 'Cancelled a payment',
  spend_submitted: 'Submitted a payment',
  spend_completed: 'Sent funds',
  spend_failed: 'Payment failed',
  signer_set_changed: 'Updated wallet signers',
};
const actionLabel = (a: string) => ACTION_LABELS[a] ?? a.replace(/_/g, ' ');

function toCsv(rows: TreasuryAuditEntry[]): string {
  const header = [
    'created_at',
    'action',
    'actor_name',
    'actor_user_id',
    'actor_kind',
    'wallet_id',
    'spend_request_id',
    'details',
  ];
  const escape = (v: unknown) => {
    const s =
      v === null || v === undefined
        ? ''
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = rows.map(r =>
    [
      r.createdAt,
      r.action,
      r.actor?.name ?? '',
      r.actorUserId,
      r.actorKind,
      r.walletId,
      r.spendRequestId,
      r.details,
    ]
      .map(escape)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

export default function AuditLog({
  organizationId,
}: {
  organizationId: string;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLog(organizationId, page, 50);

  const exportCsv = () => {
    if (!data?.data?.length) return;
    const blob = new Blob([toCsv(data.data)], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `treasury-audit-${organizationId}-p${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 text-sm text-gray-500'>
        <Loader2 className='h-4 w-4 animate-spin' />
        Loading activity…
      </div>
    );
  }

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = page * 50 < total;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-gray-400'>{total} events</p>
        <BoundlessButton
          variant='outline'
          onClick={exportCsv}
          disabled={!rows.length}
          className='border-gray-700'
        >
          <span className='flex items-center gap-2'>
            <Download className='h-4 w-4' />
            Export CSV
          </span>
        </BoundlessButton>
      </div>

      {rows.length === 0 ? (
        <p className='text-sm text-gray-500'>No activity yet.</p>
      ) : (
        <div className='overflow-hidden rounded-xl border border-gray-800'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-gray-900/60 text-xs text-gray-500'>
              <tr>
                <th className='px-3 py-2 font-medium'>When</th>
                <th className='px-3 py-2 font-medium'>Action</th>
                <th className='px-3 py-2 font-medium'>Actor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className='border-t border-gray-800'>
                  <td className='px-3 py-2 whitespace-nowrap text-gray-400'>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className='px-3 py-2 text-gray-200'>
                    {actionLabel(r.action)}
                  </td>
                  <td className='px-3 py-2'>
                    {r.actor ? (
                      <span className='flex items-center gap-2'>
                        <Avatar className='h-6 w-6'>
                          <AvatarImage
                            src={r.actor.image ?? undefined}
                            alt={r.actor.name ?? ''}
                          />
                          <AvatarFallback className='bg-gray-800 text-[10px] text-gray-300'>
                            {(r.actor.name ?? 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className='text-gray-200'>
                          {r.actor.name ?? 'Unknown user'}
                        </span>
                      </span>
                    ) : (
                      <span className='text-gray-500'>
                        {r.actorKind === 'system'
                          ? 'System'
                          : r.actorKind === 'platform_staff'
                            ? 'Platform staff'
                            : 'Unknown user'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className='flex items-center justify-between'>
          <BoundlessButton
            variant='outline'
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className='border-gray-700'
          >
            Previous
          </BoundlessButton>
          <span className='text-xs text-gray-500'>Page {page}</span>
          <BoundlessButton
            variant='outline'
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            className='border-gray-700'
          >
            Next
          </BoundlessButton>
        </div>
      )}
    </div>
  );
}
