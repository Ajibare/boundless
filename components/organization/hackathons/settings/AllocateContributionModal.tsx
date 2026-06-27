'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Trash2,
  Trophy,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  allocateContribution,
  getContributionAllocations,
  listAllocatablePrizes,
  undoAllocation,
  type AllocatablePrize,
  type AllocationRecord,
  type AllocationTarget,
  type ContributionAllocationDetail,
  type PartnerContribution,
} from '@/lib/api/hackathons/partners';
import { extractApiErrorMessage } from '@/lib/api/api';
import { reportError } from '@/lib/error-reporting';
import { cn } from '@/lib/utils';

interface AllocateContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  hackathonId: string;
  contribution: PartnerContribution;
  onAllocated: () => void;
}

interface DraftLine {
  id: string;
  placementId?: string;
  amount: string;
}

const formatAmount = (raw: string | number) => {
  const value = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (Number.isNaN(value)) return String(raw);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const newDraftLine = (): DraftLine => ({
  id: Math.random().toString(36).slice(2),
  amount: '',
});

export default function AllocateContributionModal({
  open,
  onOpenChange,
  organizationId,
  hackathonId,
  contribution,
  onAllocated,
}: AllocateContributionModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [prizes, setPrizes] = useState<AllocatablePrize[]>([]);
  const [detail, setDetail] = useState<ContributionAllocationDetail | null>(
    null
  );
  const [drafts, setDrafts] = useState<DraftLine[]>([newDraftLine()]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [allocsRes, prizesRes] = await Promise.all([
          getContributionAllocations(
            organizationId,
            hackathonId,
            contribution.id
          ),
          listAllocatablePrizes(organizationId, hackathonId),
        ]);
        if (cancelled) return;
        setDetail(allocsRes.data ?? null);
        setPrizes(prizesRes ?? []);
        setDrafts([newDraftLine()]);
      } catch (err) {
        reportError(err, { context: 'allocate-modal-load' });
        toast.error(
          extractApiErrorMessage(err, 'Failed to load allocation data')
        );
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, organizationId, hackathonId, contribution.id, onOpenChange]);

  const draftSum = useMemo(
    () =>
      drafts.reduce((sum, d) => {
        const v = parseFloat(d.amount);
        return sum + (Number.isNaN(v) ? 0 : v);
      }, 0),
    [drafts]
  );

  const remaining = detail ? parseFloat(detail.unallocatedAmount) : 0;
  const overallocated = draftSum - remaining > 0.000001;
  const hasDrafts = drafts.some(d => parseFloat(d.amount) > 0);

  const handleAddLine = () => {
    setDrafts(d => [...d, newDraftLine()]);
  };

  const handleRemoveLine = (id: string) => {
    setDrafts(d => (d.length === 1 ? d : d.filter(line => line.id !== id)));
  };

  const handleChange = (id: string, patch: Partial<DraftLine>) => {
    setDrafts(d =>
      d.map(line => (line.id === id ? { ...line, ...patch } : line))
    );
  };

  const handleAllocateAll = () => {
    if (drafts.length !== 1) return;
    setDrafts(d => d.map(line => ({ ...line, amount: remaining.toFixed(2) })));
  };

  const handleSubmit = async () => {
    if (!detail) return;

    const targets: AllocationTarget[] = [];
    for (const d of drafts) {
      const amount = parseFloat(d.amount);
      if (Number.isNaN(amount) || amount <= 0) continue;
      if (!d.placementId) {
        toast.error('Select a prize placement for each row');
        return;
      }
      targets.push({ placementId: d.placementId, amount });
    }

    if (targets.length === 0) {
      toast.error('Add at least one allocation');
      return;
    }
    if (overallocated) {
      toast.error(
        `Allocation total (${formatAmount(draftSum)}) exceeds remaining (${formatAmount(remaining)})`
      );
      return;
    }

    try {
      setSubmitting(true);
      await allocateContribution(organizationId, hackathonId, contribution.id, {
        targets,
      });
      toast.success(
        targets.length === 1
          ? 'Allocation saved'
          : `${targets.length} allocations saved`
      );
      onAllocated();
      onOpenChange(false);
    } catch (err) {
      reportError(err, { context: 'allocate-contribution' });
      toast.error(
        extractApiErrorMessage(err, 'Failed to allocate contribution')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndo = async (allocation: AllocationRecord) => {
    if (
      !confirm(
        `Undo allocation of ${formatAmount(allocation.amount)} ${contribution.currency} to "${allocation.tierLabel}"?`
      )
    )
      return;
    try {
      await undoAllocation(organizationId, hackathonId, allocation.id);
      toast.success('Allocation undone');
      // Refresh both modal state and parent
      const [allocsRes, prizesRes] = await Promise.all([
        getContributionAllocations(
          organizationId,
          hackathonId,
          contribution.id
        ),
        listAllocatablePrizes(organizationId, hackathonId),
      ]);
      setDetail(allocsRes.data ?? null);
      setPrizes(prizesRes ?? []);
      onAllocated();
    } catch (err) {
      reportError(err, { context: 'undo-allocation' });
      toast.error(extractApiErrorMessage(err, 'Failed to undo allocation'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Sparkles className='text-primary h-4 w-4' />
            Allocate {contribution.partnerName}&apos;s contribution
          </DialogTitle>
          <DialogDescription>
            Distribute this sponsorship across prize placements. You can top up
            any placement, and you don&apos;t have to allocate it all at once.
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className='flex justify-center py-12'>
            <Loader2 className='text-primary h-5 w-5 animate-spin' />
          </div>
        ) : (
          <>
            <div className='grid grid-cols-3 gap-3 rounded-lg border border-gray-900 bg-gray-950/40 p-3 text-xs'>
              <SummaryCell
                label='Pledged'
                value={`${formatAmount(detail.pledgedAmount)} ${contribution.currency}`}
              />
              <SummaryCell
                label='Allocatable'
                value={`${formatAmount(detail.allocatableAmount)} ${contribution.currency}`}
                hint={
                  typeof detail.escrowFeeRate === 'number'
                    ? `after ${(detail.escrowFeeRate * 100).toFixed(2)}% platform fee`
                    : 'after platform fee'
                }
              />
              <SummaryCell
                label='Remaining'
                value={`${formatAmount(detail.unallocatedAmount)} ${contribution.currency}`}
                emphasis
              />
            </div>

            {detail.allocations.length > 0 && (
              <div className='space-y-2'>
                <div className='text-xs font-medium tracking-wide text-gray-400 uppercase'>
                  Existing allocations
                </div>
                {detail.allocations.map(a => (
                  <div
                    key={a.id}
                    className='flex items-center justify-between rounded-lg border border-gray-900 bg-gray-950/40 px-3 py-2 text-sm'
                  >
                    <div className='flex items-center gap-2'>
                      <Trophy className='h-3.5 w-3.5 text-gray-500' />
                      <span className='text-white'>{a.tierLabel}</span>
                      {a.createdNewTier && (
                        <Badge variant='outline' className='text-[10px]'>
                          new tier
                        </Badge>
                      )}
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='font-mono text-white'>
                        +{formatAmount(a.amount)} {contribution.currency}
                      </span>
                      <button
                        onClick={() => handleUndo(a)}
                        className='text-xs text-gray-500 transition-colors hover:text-red-400'
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {remaining > 0.000001 ? (
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='text-xs font-medium tracking-wide text-gray-400 uppercase'>
                    New allocation
                  </div>
                  {drafts.length === 1 && (
                    <button
                      type='button'
                      onClick={handleAllocateAll}
                      className='text-primary text-xs underline-offset-4 hover:underline'
                    >
                      Use full remaining ({formatAmount(remaining)}{' '}
                      {contribution.currency})
                    </button>
                  )}
                </div>

                {drafts.map(line => (
                  <DraftLineRow
                    key={line.id}
                    line={line}
                    prizes={prizes}
                    canRemove={drafts.length > 1}
                    onChange={patch => handleChange(line.id, patch)}
                    onRemove={() => handleRemoveLine(line.id)}
                    currency={contribution.currency}
                  />
                ))}

                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => handleAddLine()}
                  >
                    <Plus className='mr-1.5 h-3.5 w-3.5' />
                    Add allocation
                  </Button>
                </div>

                <div className='flex items-center justify-between rounded-lg border border-gray-900 bg-gray-950/40 px-3 py-2 text-sm'>
                  <span className='text-gray-400'>Allocation total</span>
                  <span
                    className={cn(
                      'font-mono',
                      overallocated ? 'text-red-400' : 'text-white'
                    )}
                  >
                    {formatAmount(draftSum)} / {formatAmount(remaining)}{' '}
                    {contribution.currency}
                  </span>
                </div>

                {overallocated && (
                  <div className='flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400'>
                    <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                    <span>
                      Total exceeds remaining allocatable amount. Reduce one of
                      the rows.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className='rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300'>
                This contribution is fully allocated.
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Close
          </Button>
          {!loading && detail && remaining > 0.000001 && (
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={submitting || !hasDrafts || overallocated}
            >
              {submitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save allocation'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCell({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className='text-[10px] tracking-wide text-gray-500 uppercase'>
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-sm',
          emphasis ? 'text-primary' : 'text-white'
        )}
      >
        {value}
      </div>
      {hint && <div className='text-[10px] text-gray-600'>{hint}</div>}
    </div>
  );
}

function DraftLineRow({
  line,
  prizes,
  canRemove,
  onChange,
  onRemove,
  currency,
}: {
  line: DraftLine;
  prizes: AllocatablePrize[];
  canRemove: boolean;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
  currency: string;
}) {
  // Group placements by prize so the picker shows which prize/track each
  // placement belongs to, instead of one flat list of every slot.
  const ordinal = (n: number) => `${n}${['st', 'nd', 'rd'][n - 1] ?? 'th'}`;
  const fundablePrizes = prizes.filter(p => p.placements.length > 0);

  return (
    <div className='space-y-3 rounded-xl border border-gray-900 bg-gray-950/30 p-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex-1 space-y-2'>
          <Label className='text-xs text-gray-400'>Prize placement</Label>
          <select
            value={line.placementId ?? ''}
            onChange={e =>
              onChange({ placementId: e.target.value || undefined })
            }
            className='focus:border-primary w-full rounded-md border border-gray-800 bg-black/40 px-3 py-2 text-sm text-white outline-none'
          >
            <option value=''>Select a placement...</option>
            {fundablePrizes.length === 0 ? (
              <option value='' disabled>
                No prize placements yet. Add them in the Rewards step.
              </option>
            ) : (
              fundablePrizes.map(p => (
                <optgroup
                  key={p.id}
                  label={
                    p.trackIds.length > 0
                      ? `Track · ${p.name}`
                      : `Overall · ${p.name}`
                  }
                >
                  {p.placements.map(pl => (
                    <option key={pl.id} value={pl.id}>
                      {pl.label || `${ordinal(pl.position)} place`} (now{' '}
                      {formatAmount(pl.amount)} {pl.currency || currency})
                    </option>
                  ))}
                </optgroup>
              ))
            )}
          </select>
        </div>
        {canRemove && (
          <button
            type='button'
            onClick={onRemove}
            className='mt-7 text-gray-500 transition-colors hover:text-red-400'
          >
            <Trash2 className='h-4 w-4' />
          </button>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor={`amount-${line.id}`} className='text-xs text-gray-400'>
          Amount ({currency})
        </Label>
        <Input
          id={`amount-${line.id}`}
          type='number'
          inputMode='decimal'
          min='0'
          step='0.01'
          value={line.amount}
          onChange={e => onChange({ amount: e.target.value })}
          placeholder='0.00'
          className='font-mono'
        />
      </div>
    </div>
  );
}
