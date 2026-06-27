'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, Mail, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/auth';
import Loading from '@/components/Loading';
import { BoundlessButton } from '@/components/buttons';
import { useReceipt, useSendReceipt } from '@/features/treasury';

function formatUsdc(value: string): string {
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : value;
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;
  const receiptId = params.receiptId as string;

  const {
    data: receipt,
    isLoading,
    error,
  } = useReceipt(organizationId, receiptId);
  const sendReceipt = useSendReceipt(organizationId);

  const emailReceipt = async () => {
    try {
      await sendReceipt.mutateAsync({ receiptId });
      toast.success('Receipt emailed to you');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not email the receipt'
      );
    }
  };

  return (
    <AuthGuard redirectTo='/auth?mode=signin' fallback={<Loading />}>
      <div className='min-h-screen bg-black px-4 py-8'>
        {/* Toolbar (hidden when printing) */}
        <div className='mx-auto mb-6 flex max-w-2xl items-center justify-between print:hidden'>
          <button
            type='button'
            onClick={() => router.back()}
            className='inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white'
          >
            <ArrowLeft className='h-4 w-4' />
            Back
          </button>
          <div className='flex items-center gap-2'>
            <BoundlessButton
              variant='outline'
              className='border-gray-700'
              onClick={emailReceipt}
              disabled={sendReceipt.isPending || !receipt}
            >
              <span className='flex items-center gap-2'>
                {sendReceipt.isPending ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Mail className='h-4 w-4' />
                )}
                Email me a copy
              </span>
            </BoundlessButton>
            <BoundlessButton onClick={() => window.print()} disabled={!receipt}>
              <span className='flex items-center gap-2'>
                <Printer className='h-4 w-4' />
                Print / Save as PDF
              </span>
            </BoundlessButton>
          </div>
        </div>

        {isLoading ? (
          <div className='mx-auto flex max-w-2xl items-center gap-2 text-sm text-gray-500'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Loading receipt…
          </div>
        ) : error || !receipt ? (
          <p className='mx-auto max-w-2xl text-sm text-gray-500'>
            Receipt not found.
          </p>
        ) : (
          <article className='mx-auto max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-lg print:border-0 print:shadow-none'>
            {/* Header */}
            <div className='flex items-start justify-between border-b border-gray-200 px-8 py-6'>
              <div>
                <p className='text-lg font-bold tracking-tight'>Boundless</p>
                <p className='mt-1 text-xs tracking-widest text-gray-500 uppercase'>
                  Receipt
                </p>
              </div>
              <div className='text-right'>
                <p className='font-mono text-sm font-semibold'>
                  {receipt.receiptNumber}
                </p>
                {receipt.status === 'VOID' && (
                  <span className='mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700'>
                    VOID
                  </span>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className='border-b border-gray-200 px-8 py-8 text-center'>
              <p className='text-sm text-gray-500'>{receipt.typeLabel}</p>
              <p className='mt-1 text-4xl font-bold'>
                {formatUsdc(receipt.amount)}
                <span className='ml-2 text-base font-normal text-gray-400'>
                  {receipt.currency}
                </span>
              </p>
            </div>

            {/* Details */}
            <dl className='divide-y divide-gray-100 px-8 py-2 text-sm'>
              {receipt.fromLabel && <Row label='From'>{receipt.fromLabel}</Row>}
              {receipt.toAddress && (
                <Row label='To'>
                  <span className='font-mono text-xs break-all'>
                    {receipt.toAddress}
                  </span>
                </Row>
              )}
              {receipt.description && (
                <Row label='Note'>{receipt.description}</Row>
              )}
              <Row label='Date'>
                {new Date(receipt.issuedAt).toLocaleString()}
              </Row>
              <Row label='Status'>
                {receipt.status === 'VOID' ? 'Void' : 'Issued'}
              </Row>
              {receipt.onChainTxHash && (
                <Row label='Transaction'>
                  {receipt.explorerUrl ? (
                    <a
                      href={receipt.explorerUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center gap-1 text-sky-600 hover:underline print:text-gray-900'
                    >
                      <span className='font-mono text-xs break-all'>
                        {receipt.onChainTxHash}
                      </span>
                      <ExternalLink className='h-3 w-3 print:hidden' />
                    </a>
                  ) : (
                    <span className='font-mono text-xs break-all'>
                      {receipt.onChainTxHash}
                    </span>
                  )}
                </Row>
              )}
            </dl>

            {/* Footer */}
            <div className='border-t border-gray-200 bg-gray-50 px-8 py-4 print:bg-white'>
              <p className='text-xs text-gray-500'>
                This is an official receipt from Boundless. Keep it for your
                records. Questions? support@boundlessfi.xyz
              </p>
            </div>
          </article>
        )}
      </div>
    </AuthGuard>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex justify-between gap-4 py-3'>
      <dt className='shrink-0 text-gray-500'>{label}</dt>
      <dd className='max-w-[70%] text-right font-medium text-gray-900'>
        {children}
      </dd>
    </div>
  );
}
