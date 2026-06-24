'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Printer,
  Send,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { BoundlessButton } from '@/components/buttons';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatAddress, getTransactionExplorerUrl } from '@/lib/wallet-utils';
import {
  useReceiptByReference,
  useRequestSendFundsOtp,
  useSendDestinationReadiness,
  useSendFunds,
  useSpendRequests,
  useTreasuryWallets,
  useVerifySendFundsOtp,
  useWalletBalance,
  type SendDestinationReadiness,
  type SpendRequest,
  type SpendStatus,
  type TreasuryWallet,
} from '@/features/treasury';

// Plain-language status, no governance jargon.
const STATUS_LABEL: Record<SpendStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Processing',
  AWAITING_SIGNATURES: 'Awaiting signature',
  SUBMITTED: 'Sending',
  COMPLETED: 'Sent',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const STATUS_TONE: Record<SpendStatus, string> = {
  PENDING: 'border-amber-900/50 bg-amber-950/30 text-amber-300',
  APPROVED: 'border-blue-900/50 bg-blue-950/30 text-blue-300',
  AWAITING_SIGNATURES: 'border-blue-900/50 bg-blue-950/30 text-blue-300',
  SUBMITTED: 'border-blue-900/50 bg-blue-950/30 text-blue-300',
  COMPLETED: 'border-green-900/50 bg-green-950/30 text-green-300',
  REJECTED: 'border-red-900/50 bg-red-950/30 text-red-300',
  FAILED: 'border-red-900/50 bg-red-950/30 text-red-300',
  CANCELLED: 'border-gray-800 bg-gray-900 text-gray-400',
};

// Stellar public key: 56-char base32 starting with G.
const isStellarAddress = (v: string) => /^G[A-Z2-7]{55}$/.test(v.trim());

function errMsg(err: unknown, fallback: string): string {
  const r = err as {
    response?: { data?: { message?: unknown } };
    message?: string;
  };
  const m = r?.response?.data?.message ?? r?.message;
  if (Array.isArray(m)) return m.filter(Boolean).join(', ');
  return typeof m === 'string' && m ? m : fallback;
}

function formatUsdc(value: string): string {
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : value;
}

export default function SendFunds({
  organizationId,
}: {
  organizationId: string;
}) {
  const { data: wallets } = useTreasuryWallets(organizationId);
  const { data: spends, isLoading } = useSpendRequests(organizationId);

  const activeWallets = useMemo(
    () => (wallets ?? []).filter(w => w.status === 'ACTIVE'),
    [wallets]
  );
  const walletById = useMemo(
    () => new Map((wallets ?? []).map(w => [w.id, w] as const)),
    [wallets]
  );

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='max-w-md text-sm text-gray-400'>
          Send USDC from a treasury wallet to any Stellar address. You review
          every payment before it goes out, and we email you a code to confirm
          it is really you.
        </p>
        <SendFundsDialog
          organizationId={organizationId}
          wallets={activeWallets}
        />
      </div>

      <section>
        <h3 className='mb-3 text-sm font-medium tracking-wider text-gray-500 uppercase'>
          Recent sends
        </h3>
        {isLoading ? (
          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Loading…
          </div>
        ) : !spends || spends.length === 0 ? (
          <p className='text-sm text-gray-500'>
            No payments yet. Use “Send funds” to make your first one.
          </p>
        ) : (
          <div className='space-y-3'>
            {spends.map(s => (
              <SendRow
                key={s.id}
                spend={s}
                wallet={walletById.get(s.sourceWalletId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SendRow({
  spend,
  wallet,
}: {
  spend: SpendRequest;
  wallet?: TreasuryWallet;
}) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-4'>
      <div className='min-w-0'>
        <p className='text-sm font-medium text-white'>
          {formatUsdc(spend.amount)} {spend.currency} to{' '}
          {formatAddress(spend.destination, 4)}
        </p>
        <p className='mt-0.5 truncate text-xs text-gray-400'>
          {spend.purpose} · from {wallet?.label ?? 'wallet'} ·{' '}
          {new Date(spend.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className='flex shrink-0 flex-col items-end gap-1'>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_TONE[spend.status]}`}
        >
          {STATUS_LABEL[spend.status]}
        </span>
        {spend.onChainTxHash && (
          <a
            href={getTransactionExplorerUrl(spend.onChainTxHash)}
            target='_blank'
            rel='noreferrer'
            className='hover:text-primary inline-flex items-center gap-1 text-xs text-gray-500'
          >
            View on Stellar.expert
            <ExternalLink className='h-3 w-3' />
          </a>
        )}
      </div>
    </div>
  );
}

// Live recipient status: can this address receive USDC?
function DestinationStatus({
  readiness,
}: {
  readiness: {
    isLoading: boolean;
    isError: boolean;
    data?: SendDestinationReadiness;
  };
}) {
  if (readiness.isLoading) {
    return (
      <p className='mt-1 flex items-center gap-1 text-xs text-gray-500'>
        <Loader2 className='h-3 w-3 animate-spin' />
        Checking recipient…
      </p>
    );
  }
  if (readiness.isError) {
    return (
      <p className='mt-1 text-xs text-amber-300'>
        Could not check the recipient right now. We will verify again before
        sending.
      </p>
    );
  }
  const d = readiness.data;
  if (!d) return null;
  if (!d.exists) {
    return (
      <p className='mt-1 flex items-start gap-1 text-xs text-red-400'>
        <TriangleAlert className='mt-0.5 h-3 w-3 shrink-0' />
        This address is not active on Stellar yet, so it cannot receive funds.
      </p>
    );
  }
  if (!d.hasUsdcTrustline) {
    return (
      <p className='mt-1 flex items-start gap-1 text-xs text-red-400'>
        <TriangleAlert className='mt-0.5 h-3 w-3 shrink-0' />
        This address has not added a USDC trustline, so it cannot receive USDC
        yet.
      </p>
    );
  }
  return (
    <p className='text-success-500 mt-1 flex items-center gap-1 text-xs'>
      <CheckCircle2 className='h-3 w-3' />
      Ready to receive USDC.
    </p>
  );
}

// ── Guided send (details -> review -> verify -> done) ────────────────────────
type Step = 'form' | 'review' | 'verify' | 'done';

function SendFundsDialog({
  organizationId,
  wallets,
}: {
  organizationId: string;
  wallets: TreasuryWallet[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');

  const defaultWallet = useMemo(
    () => wallets.find(w => w.isDefault) ?? wallets[0],
    [wallets]
  );

  const [sourceWalletId, setSourceWalletId] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<SpendRequest | null>(null);

  const send = useSendFunds(organizationId);
  const requestOtp = useRequestSendFundsOtp(organizationId);
  const verifyOtp = useVerifySendFundsOtp(organizationId);
  // Receipt issued for the completed send (resolved by the spend id).
  const receipt = useReceiptByReference(organizationId, result?.id);

  // Default the source to the org default wallet once wallets load.
  useEffect(() => {
    if (!sourceWalletId && defaultWallet) setSourceWalletId(defaultWallet.id);
  }, [defaultWallet, sourceWalletId]);

  const selectedWallet = wallets.find(w => w.id === sourceWalletId);
  const balance = useWalletBalance(organizationId, sourceWalletId || undefined);
  const balanceNum = balance.data ? Number(balance.data.usdc) : null;

  const amountNum = Number(amount);
  const validAddress = isStellarAddress(destination);

  // Live check that the recipient can actually receive USDC (exists + trustline).
  const readiness = useSendDestinationReadiness(
    organizationId,
    destination.trim(),
    validAddress
  );
  const destNotReady =
    !!readiness.data &&
    (!readiness.data.exists || !readiness.data.hasUsdcTrustline);

  const insufficient =
    balanceNum != null &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    amountNum > balanceNum;
  const isConnected = selectedWallet?.kind === 'CONNECTED';
  const canReview =
    !!sourceWalletId &&
    validAddress &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    !insufficient &&
    !isConnected &&
    !destNotReady;

  const busy = send.isPending || requestOtp.isPending || verifyOtp.isPending;

  const reset = () => {
    setStep('form');
    setDestination('');
    setAmount('');
    setNote('');
    setCode('');
    setResult(null);
    setSourceWalletId(defaultWallet?.id ?? '');
  };

  const doSend = async () => {
    try {
      const res = await send.mutateAsync({
        sourceWalletId,
        destination: destination.trim(),
        amount: amount.trim(),
        note: note.trim() || undefined,
      });
      if (res.status === 'FAILED') {
        toast.error('The payment failed on-chain. Your funds were not moved.');
        setStep('review');
        return;
      }
      setResult(res);
      setStep('done');
      toast.success(`Sent ${formatUsdc(res.amount)} ${res.currency}`);
    } catch (err) {
      toast.error(errMsg(err, 'Could not send funds. Please try again.'));
      setStep('review');
    }
  };

  // From review: decide whether email step-up is needed, then send.
  const handleConfirm = async () => {
    try {
      const res = await requestOtp.mutateAsync();
      if (!res.required || res.alreadyVerified) {
        await doSend();
        return;
      }
      setStep('verify');
      if (res.sent) toast.message('We emailed you a 6-digit code.');
    } catch (err) {
      toast.error(errMsg(err, 'Could not start the send. Please try again.'));
    }
  };

  const handleVerify = async () => {
    try {
      await verifyOtp.mutateAsync(code.trim());
    } catch (err) {
      toast.error(
        errMsg(err, 'That code is not right. Check it and try again.')
      );
      return;
    }
    await doSend();
  };

  const resend = async () => {
    try {
      await requestOtp.mutateAsync();
      toast.message('We sent a new code.');
    } catch (err) {
      toast.error(errMsg(err, 'Could not resend the code.'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <BoundlessButton disabled={wallets.length === 0}>
          <span className='flex items-center gap-2'>
            <Send className='h-4 w-4' />
            Send funds
          </span>
        </BoundlessButton>
      </DialogTrigger>
      <DialogContent className='text-white sm:max-w-md'>
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Send funds</DialogTitle>
              <DialogDescription className='text-gray-400'>
                Choose where the money comes from and where it goes.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-1'>
              <div>
                <label className='mb-1 block text-xs text-gray-400'>From</label>
                {wallets.length > 1 ? (
                  <select
                    value={sourceWalletId}
                    onChange={e => setSourceWalletId(e.target.value)}
                    className='w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white'
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.label}
                        {w.isDefault ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className='rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm text-white'>
                    {selectedWallet?.label ?? '—'}
                  </p>
                )}
                <p className='mt-1 text-xs text-gray-500'>
                  {balance.isLoading
                    ? 'Checking balance…'
                    : balanceNum != null
                      ? `Balance: ${formatUsdc(balance.data!.usdc)} USDC`
                      : 'Balance unavailable'}
                </p>
              </div>

              <div>
                <label className='mb-1 block text-xs text-gray-400'>
                  Send to
                </label>
                <Input
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder='Recipient Stellar address (starts with G)'
                  className='border-gray-700 bg-black font-mono text-white'
                />
                {destination.trim().length > 0 && !validAddress && (
                  <p className='mt-1 text-xs text-red-400'>
                    That does not look like a Stellar address.
                  </p>
                )}
                {validAddress && <DestinationStatus readiness={readiness} />}
              </div>

              <div>
                <label className='mb-1 block text-xs text-gray-400'>
                  Amount (USDC)
                </label>
                <Input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder='0.00'
                  inputMode='decimal'
                  className='border-gray-700 bg-black text-white'
                />
                {insufficient && (
                  <p className='mt-1 text-xs text-red-400'>
                    That is more than this wallet holds.
                  </p>
                )}
              </div>

              <div>
                <label className='mb-1 block text-xs text-gray-400'>
                  Note (optional)
                </label>
                <Input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder='What is this for?'
                  maxLength={120}
                  className='border-gray-700 bg-black text-white'
                />
              </div>

              {isConnected && (
                <p className='flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5 text-xs text-amber-300'>
                  <TriangleAlert className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                  Sending directly from a connected wallet is coming soon. Pick
                  your managed treasury wallet, or send from your wallet app.
                </p>
              )}
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <BoundlessButton
                disabled={!canReview}
                onClick={() => setStep('review')}
              >
                Review
              </BoundlessButton>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle>Check the details</DialogTitle>
              <DialogDescription className='text-gray-400'>
                Make sure everything is right. Stellar payments cannot be
                reversed.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-3 py-2'>
              <div className='rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-center'>
                <p className='text-3xl font-semibold text-white'>
                  {formatUsdc(amount)}
                  <span className='ml-1 text-base font-normal text-gray-400'>
                    USDC
                  </span>
                </p>
              </div>
              <dl className='space-y-2 text-sm'>
                <div className='flex justify-between gap-3'>
                  <dt className='text-gray-400'>To</dt>
                  <dd className='font-mono text-white'>
                    {formatAddress(destination.trim(), 6)}
                  </dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-gray-400'>From</dt>
                  <dd className='text-white'>{selectedWallet?.label}</dd>
                </div>
                {note.trim() && (
                  <div className='flex justify-between gap-3'>
                    <dt className='text-gray-400'>Note</dt>
                    <dd className='max-w-[60%] truncate text-white'>
                      {note.trim()}
                    </dd>
                  </div>
                )}
              </dl>
              <p className='flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5 text-xs text-amber-300'>
                <TriangleAlert className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                Double-check the address. Funds sent to the wrong address cannot
                be recovered.
              </p>
            </div>
            <div className='flex justify-between gap-2 pt-2'>
              <BoundlessButton
                variant='outline'
                className='border-gray-700'
                onClick={() => setStep('form')}
                disabled={busy}
              >
                <span className='flex items-center gap-1.5'>
                  <ArrowLeft className='h-4 w-4' />
                  Back
                </span>
              </BoundlessButton>
              <BoundlessButton onClick={handleConfirm} disabled={busy}>
                <span className='flex items-center gap-2'>
                  {busy ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <ShieldCheck className='h-4 w-4' />
                  )}
                  Confirm and send
                </span>
              </BoundlessButton>
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm it is you</DialogTitle>
              <DialogDescription className='text-gray-400'>
                We emailed a 6-digit code. Enter it to send {formatUsdc(amount)}{' '}
                USDC.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-3 py-2'>
              <div className='flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-400'>
                <Mail className='h-4 w-4 shrink-0 text-gray-500' />
                Check your inbox for the code. It expires in 10 minutes.
              </div>
              <Input
                value={code}
                onChange={e =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder='123456'
                inputMode='numeric'
                maxLength={6}
                className='border-gray-700 bg-black text-center text-lg tracking-[0.5em] text-white'
              />
              <button
                type='button'
                onClick={resend}
                disabled={busy}
                className='text-primary text-xs hover:underline disabled:opacity-50'
              >
                Resend code
              </button>
            </div>
            <div className='flex justify-between gap-2 pt-2'>
              <BoundlessButton
                variant='outline'
                className='border-gray-700'
                onClick={() => setStep('review')}
                disabled={busy}
              >
                <span className='flex items-center gap-1.5'>
                  <ArrowLeft className='h-4 w-4' />
                  Back
                </span>
              </BoundlessButton>
              <BoundlessButton
                onClick={handleVerify}
                disabled={busy || code.length !== 6}
              >
                <span className='flex items-center gap-2'>
                  {busy ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Send className='h-4 w-4' />
                  )}
                  Verify and send
                </span>
              </BoundlessButton>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>Funds sent</DialogTitle>
            </DialogHeader>
            <div className='flex flex-col items-center gap-3 py-4 text-center'>
              <CheckCircle2 className='h-12 w-12 text-green-400' />
              <p className='text-lg font-semibold text-white'>
                {formatUsdc(result?.amount ?? amount)} USDC sent
              </p>
              <p className='text-sm text-gray-400'>
                To {formatAddress(destination.trim(), 6)}
              </p>
              {result?.onChainTxHash && (
                <a
                  href={getTransactionExplorerUrl(result.onChainTxHash)}
                  target='_blank'
                  rel='noreferrer'
                  className='hover:text-primary inline-flex items-center gap-1 font-mono text-xs text-gray-400'
                >
                  View transaction on Stellar.expert
                  <ExternalLink className='h-3 w-3' />
                </a>
              )}
            </div>
            <div className='flex justify-between gap-2 pt-2'>
              {result && (
                <BoundlessButton
                  variant='outline'
                  className='border-gray-700'
                  disabled={!receipt.data}
                  onClick={() =>
                    receipt.data &&
                    window.open(
                      `/organizations/${organizationId}/treasury/receipts/${receipt.data.id}`,
                      '_blank'
                    )
                  }
                >
                  <span className='flex items-center gap-2'>
                    {receipt.isLoading ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Printer className='h-4 w-4' />
                    )}
                    Receipt
                  </span>
                </BoundlessButton>
              )}
              <BoundlessButton
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Done
              </BoundlessButton>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
