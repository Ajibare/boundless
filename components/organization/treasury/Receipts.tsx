'use client';

import Link from 'next/link';
import { ExternalLink, FileText, Loader2, Mail, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useReceipts, useSendReceipt, type Receipt } from '@/features/treasury';

function formatUsdc(value: string): string {
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : value;
}

export default function Receipts({
  organizationId,
}: {
  organizationId: string;
}) {
  const { data, isLoading, error } = useReceipts(organizationId);
  const receipts = data?.data ?? [];

  return (
    <div className='space-y-5'>
      <p className='max-w-md text-sm text-gray-400'>
        Every payment generates a receipt with its own number. Open one to print
        it, save it as a PDF, or email yourself a copy.
      </p>

      {isLoading ? (
        <div className='flex items-center gap-2 text-sm text-gray-500'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading receipts…
        </div>
      ) : error ? (
        <p className='text-sm text-gray-500'>Receipts are not available yet.</p>
      ) : receipts.length === 0 ? (
        <p className='text-sm text-gray-500'>
          No receipts yet. They appear here after your first payment.
        </p>
      ) : (
        <div className='space-y-3'>
          {receipts.map(r => (
            <ReceiptRow
              key={r.id}
              organizationId={organizationId}
              receipt={r}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptRow({
  organizationId,
  receipt,
}: {
  organizationId: string;
  receipt: Receipt;
}) {
  const sendReceipt = useSendReceipt(organizationId);

  const emailMe = async () => {
    try {
      await sendReceipt.mutateAsync({ receiptId: receipt.id });
      toast.success('Receipt emailed to you');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not email the receipt'
      );
    }
  };

  const isVoid = receipt.status === 'VOID';

  return (
    <div className='flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-4'>
      <div className='flex min-w-0 items-center gap-3'>
        <span className='bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full'>
          <FileText className='text-primary h-4 w-4' />
        </span>
        <div className='min-w-0'>
          <p className='flex items-center gap-2 text-sm font-medium text-white'>
            <span className='font-mono'>{receipt.receiptNumber}</span>
            {isVoid && (
              <span className='rounded-full bg-red-950/40 px-2 py-0.5 text-[10px] text-red-300'>
                Void
              </span>
            )}
          </p>
          <p className='mt-0.5 truncate text-xs text-gray-400'>
            {receipt.typeLabel} · {formatUsdc(receipt.amount)}{' '}
            {receipt.currency} ·{' '}
            {new Date(receipt.issuedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        <button
          type='button'
          onClick={emailMe}
          disabled={sendReceipt.isPending}
          title='Email me a copy'
          className='hover:text-primary rounded-lg p-2 text-gray-500 disabled:opacity-50'
        >
          <Mail className='h-4 w-4' />
        </button>
        <Link
          href={`/organizations/${organizationId}/treasury/receipts/${receipt.id}`}
          target='_blank'
          className='hover:text-primary inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400'
        >
          <Printer className='h-3.5 w-3.5' />
          View / Print
          <ExternalLink className='h-3 w-3' />
        </Link>
      </div>
    </div>
  );
}
