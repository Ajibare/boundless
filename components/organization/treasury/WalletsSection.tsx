'use client';

import { useState, type ReactNode } from 'react';
import {
  Archive,
  ArrowDownToLine,
  Copy,
  Landmark,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { BoundlessButton } from '@/components/buttons';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { formatAddress } from '@/lib/wallet-utils';
import { copyToClipboard } from '@/lib/utils';
import { connectWallet } from '@/lib/wallet/wallet-kit';
import {
  useArchiveWallet,
  useArchivedTreasuryWallets,
  useCreateManagedWallet,
  useRegisterConnectedWallet,
  useRestoreWallet,
  useTreasuryWallets,
  useUpdateWallet,
  useWalletBalance,
  type TreasuryWallet,
} from '@/features/treasury';

export default function WalletsSection({
  organizationId,
}: {
  organizationId: string;
}) {
  const {
    data: wallets,
    isLoading,
    error,
  } = useTreasuryWallets(organizationId);
  const createManaged = useCreateManagedWallet(organizationId);
  const registerConnected = useRegisterConnectedWallet(organizationId);

  const [label, setLabel] = useState('');
  const [pendingConnect, setPendingConnect] = useState<string | null>(null);
  const [connectLabel, setConnectLabel] = useState('');

  const handleCreate = async () => {
    try {
      await createManaged.mutateAsync(label.trim() || 'Main treasury');
      toast.success('Treasury wallet created');
      setLabel('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not create wallet'
      );
    }
  };

  const handleConnect = async () => {
    try {
      const { address } = await connectWallet();
      setPendingConnect(address);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not connect');
    }
  };

  const handleRegister = async () => {
    if (!pendingConnect) return;
    try {
      await registerConnected.mutateAsync({
        publicKey: pendingConnect,
        label: connectLabel.trim() || 'Connected wallet',
        connectionMethod: 'walletkit_generic',
      });
      toast.success('Wallet connected');
      setPendingConnect(null);
      setConnectLabel('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not connect');
    }
  };

  return (
    <div className='space-y-8'>
      <div className='grid gap-4 sm:grid-cols-2'>
        {/* Managed */}
        <section className='rounded-2xl border border-gray-800 bg-gray-900/40 p-5'>
          <h3 className='flex items-center gap-2 text-sm font-medium text-white'>
            <ShieldCheck className='text-primary h-4 w-4' />
            Managed wallet
          </h3>
          <p className='mt-1 text-xs text-gray-400'>
            Boundless-custodial. We sponsor activation, the USDC trustline, and
            a fee float so it can transact.
          </p>
          <div className='mt-4 flex flex-col gap-2'>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder='Label (e.g. Main treasury)'
              maxLength={80}
              className='border-gray-700 bg-black text-white'
            />
            <BoundlessButton
              onClick={handleCreate}
              disabled={createManaged.isPending}
            >
              <span className='flex items-center gap-2'>
                {createManaged.isPending ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Plus className='h-4 w-4' />
                )}
                Create wallet
              </span>
            </BoundlessButton>
          </div>
        </section>

        {/* Connected */}
        <section className='rounded-2xl border border-gray-800 bg-gray-900/40 p-5'>
          <h3 className='flex items-center gap-2 text-sm font-medium text-white'>
            <Link2 className='text-primary h-4 w-4' />
            Connect a wallet
          </h3>
          <p className='mt-1 text-xs text-gray-400'>
            Use your own external or multisig wallet. Needs a USDC trustline;
            you sign in-browser.
          </p>
          <div className='mt-4 flex flex-col gap-2'>
            {pendingConnect ? (
              <>
                <p className='font-mono text-xs text-gray-300'>
                  {formatAddress(pendingConnect, 6)}
                </p>
                <Input
                  value={connectLabel}
                  onChange={e => setConnectLabel(e.target.value)}
                  placeholder='Label'
                  maxLength={80}
                  className='border-gray-700 bg-black text-white'
                />
                <div className='flex gap-2'>
                  <BoundlessButton
                    onClick={handleRegister}
                    disabled={registerConnected.isPending}
                  >
                    {registerConnected.isPending ? 'Connecting…' : 'Connect'}
                  </BoundlessButton>
                  <BoundlessButton
                    variant='outline'
                    onClick={() => setPendingConnect(null)}
                    className='border-gray-700'
                  >
                    Cancel
                  </BoundlessButton>
                </div>
              </>
            ) : (
              <BoundlessButton
                variant='outline'
                onClick={handleConnect}
                className='border-gray-700'
              >
                <span className='flex items-center gap-2'>
                  <Wallet className='h-4 w-4' />
                  Connect wallet
                </span>
              </BoundlessButton>
            )}
          </div>
        </section>
      </div>

      <section>
        <h3 className='mb-4 text-sm font-medium tracking-wider text-gray-500 uppercase'>
          Wallets
        </h3>
        {isLoading ? (
          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Loading wallets…
          </div>
        ) : error ? (
          <p className='text-sm text-gray-500'>
            Treasury is not available yet. Apply the treasury migration on the
            backend.
          </p>
        ) : !wallets || wallets.length === 0 ? (
          <p className='text-sm text-gray-500'>
            No treasury wallets yet. Create or connect one above.
          </p>
        ) : (
          <div className='space-y-3'>
            {wallets.map(w => (
              <WalletRow
                key={w.id}
                organizationId={organizationId}
                wallet={w}
              />
            ))}
          </div>
        )}
      </section>

      <ArchivedWalletsSection organizationId={organizationId} />
    </div>
  );
}

function WalletRow({
  organizationId,
  wallet,
}: {
  organizationId: string;
  wallet: TreasuryWallet;
}) {
  const updateWallet = useUpdateWallet(organizationId);
  const archiveWallet = useArchiveWallet(organizationId);
  const isManaged = wallet.kind === 'MANAGED';

  const handleSetDefault = async () => {
    try {
      await updateWallet.mutateAsync({
        walletId: wallet.id,
        patch: { isDefault: true },
      });
      toast.success(`"${wallet.label}" is now your default wallet`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not set default wallet'
      );
    }
  };

  const handleArchive = async () => {
    try {
      await archiveWallet.mutateAsync(wallet.id);
      toast.success(`"${wallet.label}" archived. You can restore it any time.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not archive wallet'
      );
    }
  };

  return (
    <div className='flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/40 p-4'>
      <div className='flex items-center gap-3'>
        <span className='bg-primary/10 flex h-9 w-9 items-center justify-center rounded-full'>
          {isManaged ? (
            <Landmark className='text-primary h-4 w-4' />
          ) : (
            <Wallet className='text-primary h-4 w-4' />
          )}
        </span>
        <div>
          <p className='flex items-center gap-2 text-sm font-medium text-white'>
            {wallet.label}
            {wallet.isDefault && (
              <span className='rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-300'>
                Default
              </span>
            )}
            {wallet.isMultisig && (
              <span className='rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-300'>
                Multisig
              </span>
            )}
          </p>
          <p className='mt-0.5'>
            <WalletBalanceFigure
              organizationId={organizationId}
              walletId={wallet.id}
            />
          </p>
          <p className='flex items-center gap-1 font-mono text-xs text-gray-400'>
            <button
              type='button'
              onClick={() => copyToClipboard(wallet.publicKey)}
              title='Copy full address'
              className='inline-flex items-center gap-1 transition-colors hover:text-gray-200'
            >
              {formatAddress(wallet.publicKey, 6)}
              <Copy className='h-3 w-3' />
            </button>
            <span>· {wallet.status.toLowerCase()}</span>
          </p>
        </div>
      </div>
      <div className='flex items-center gap-1'>
        <DepositDialog wallet={wallet} />
        {!wallet.isDefault && (
          <ConfirmDialog
            title='Set as default wallet?'
            description={`"${wallet.label}" will be used by default for organization funding and payouts.`}
            confirmLabel='Set as default'
            onConfirm={handleSetDefault}
            trigger={
              <button
                type='button'
                disabled={updateWallet.isPending}
                className='rounded-lg p-2 text-gray-500 hover:text-amber-300 disabled:opacity-50'
                title='Set as default'
              >
                <Star className='h-4 w-4' />
              </button>
            }
          />
        )}
        <ConfirmDialog
          destructive
          title='Archive this wallet?'
          description='It moves to Archived and is hidden from the active list. Your funds are not affected, and you can restore it any time.'
          confirmLabel='Archive'
          onConfirm={handleArchive}
          trigger={
            <button
              type='button'
              disabled={archiveWallet.isPending}
              className='flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:text-red-400 disabled:opacity-50'
            >
              <Archive className='h-3.5 w-3.5' />
              Archive
            </button>
          }
        />
      </div>
    </div>
  );
}

// ── Live balance ────────────────────────────────────────────────────────────
function WalletBalanceFigure({
  organizationId,
  walletId,
}: {
  organizationId: string;
  walletId: string;
}) {
  const { data, isLoading, isError } = useWalletBalance(
    organizationId,
    walletId
  );

  if (isLoading) {
    return (
      <span className='inline-flex items-center gap-1 text-xs text-gray-500'>
        <Loader2 className='h-3 w-3 animate-spin' />
        Loading balance…
      </span>
    );
  }
  if (isError || !data) {
    return <span className='text-xs text-gray-500'>Balance unavailable</span>;
  }

  const usdc = Number(data.usdc);
  const formatted = Number.isFinite(usdc)
    ? usdc.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : data.usdc;

  return (
    <span className='text-base font-semibold text-white'>
      {formatted}
      <span className='ml-1 text-xs font-normal text-gray-400'>USDC</span>
    </span>
  );
}

// ── Deposit (add funds) ─────────────────────────────────────────────────────
function DepositDialog({ wallet }: { wallet: TreasuryWallet }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type='button'
          className='hover:text-primary flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400'
        >
          <ArrowDownToLine className='h-3.5 w-3.5' />
          Deposit
        </button>
      </DialogTrigger>
      <DialogContent className='border-gray-800 bg-gray-950 text-white sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Add funds to {wallet.label}</DialogTitle>
          <DialogDescription className='text-gray-400'>
            Send USDC on the Stellar network to this address. It appears in your
            treasury balance once the transfer settles.
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col items-center gap-4 py-2'>
          <div className='rounded-xl bg-white p-3'>
            <QRCodeSVG value={wallet.publicKey} size={168} />
          </div>
          <button
            type='button'
            onClick={() => {
              copyToClipboard(wallet.publicKey);
              toast.success('Address copied');
            }}
            className='flex w-full items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 font-mono text-xs text-gray-300 transition-colors hover:text-white'
          >
            <span className='truncate'>{wallet.publicKey}</span>
            <Copy className='h-3.5 w-3.5 shrink-0' />
          </button>
          <p className='text-center text-xs text-gray-500'>
            Only send USDC on Stellar. Other assets or networks may be lost.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirmation dialog (sensitive/destructive actions) ─────────────────────
function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className='border-gray-800 text-white'>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className='text-gray-400'>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='border-gray-700 bg-transparent text-gray-200 hover:bg-gray-900 hover:text-white'>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-primary hover:bg-primary/90 text-black'
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Archived wallets (never deleted, always restorable) ─────────────────────
function ArchivedWalletsSection({
  organizationId,
}: {
  organizationId: string;
}) {
  const { data: archived, isLoading } =
    useArchivedTreasuryWallets(organizationId);

  if (isLoading || !archived || archived.length === 0) return null;

  return (
    <section>
      <h3 className='mb-1 text-sm font-medium tracking-wider text-gray-500 uppercase'>
        Archived ({archived.length})
      </h3>
      <p className='mb-3 text-xs text-gray-500'>
        Wallets are never deleted, only archived. Restore one any time to move
        it back to your active wallets.
      </p>
      <div className='space-y-3'>
        {archived.map(w => (
          <ArchivedWalletRow
            key={w.id}
            organizationId={organizationId}
            wallet={w}
          />
        ))}
      </div>
    </section>
  );
}

function ArchivedWalletRow({
  organizationId,
  wallet,
}: {
  organizationId: string;
  wallet: TreasuryWallet;
}) {
  const restoreWallet = useRestoreWallet(organizationId);

  const handleRestore = async () => {
    try {
      await restoreWallet.mutateAsync(wallet.id);
      toast.success(`"${wallet.label}" restored`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not restore wallet'
      );
    }
  };

  return (
    <div className='flex items-center justify-between rounded-xl border border-gray-800/60 bg-gray-900/20 p-4 opacity-80'>
      <div className='flex items-center gap-3'>
        <span className='flex h-9 w-9 items-center justify-center rounded-full bg-gray-800/60'>
          <Archive className='h-4 w-4 text-gray-400' />
        </span>
        <div>
          <p className='text-sm font-medium text-gray-300'>{wallet.label}</p>
          <p className='flex items-center gap-1 font-mono text-xs text-gray-500'>
            <button
              type='button'
              onClick={() => copyToClipboard(wallet.publicKey)}
              title='Copy full address'
              className='inline-flex items-center gap-1 transition-colors hover:text-gray-300'
            >
              {formatAddress(wallet.publicKey, 6)}
              <Copy className='h-3 w-3' />
            </button>
            <span>· archived</span>
          </p>
        </div>
      </div>
      <ConfirmDialog
        title='Restore this wallet?'
        description={`"${wallet.label}" will move back to your active wallets.`}
        confirmLabel='Restore'
        onConfirm={handleRestore}
        trigger={
          <button
            type='button'
            disabled={restoreWallet.isPending}
            className='flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 hover:text-emerald-300 disabled:opacity-50'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            Restore
          </button>
        }
      />
    </div>
  );
}
