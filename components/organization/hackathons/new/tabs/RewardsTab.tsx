'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Trophy } from 'lucide-react';
import { BoundlessButton } from '@/components/buttons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RegenerateSectionButton from '../RegenerateSectionButton';
import { listOrganizerTracks } from '@/lib/api/hackathons/tracks';
import { useDraft } from '@/features/hackathons';
import type { HackathonDraftPrize } from '@/features/hackathons/types';
import type { RewardsFormData } from './schemas/rewardsSchema';

/**
 * Rewards / Prizes step. Rebuilt around the Prize entity (named prize -> linked
 * tracks -> one or more placements) instead of the old flat-tier list. Saves the
 * `prizes` write shape; the backend writes the Prize entity and derives the
 * legacy prizeTiers shadow. The legacy prizeTiers on `initialData` (AI drafts /
 * existing drafts) are grouped into editable prize cards on load.
 *
 * v1 scope: dnd reorder, presets, and the funding fee-preview dialog from the
 * old tab are intentionally dropped; re-add once the prize-card model is settled.
 */
export interface TrackOption {
  id: string;
  name: string;
  slug: string;
  isArchived: boolean;
}

interface RewardsTabProps {
  onContinue?: () => void;
  onSave?: (data: RewardsFormData) => Promise<void>;
  initialData?: RewardsFormData;
  isLoading?: boolean;
  organizationId?: string;
  hackathonId?: string;
  /** Tracks the organizer created; when omitted the tab fetches them. */
  availableTracks?: TrackOption[];
}

interface LocalPlacement {
  key: string;
  label: string;
  amount: string;
}
interface LocalPrize {
  key: string;
  name: string;
  description: string;
  trackIds: string[];
  placements: LocalPlacement[];
}

let _uid = 0;
const uid = (p = 'k') => `${p}_${(_uid++).toString(36)}`;

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const placeLabel = (i: number) => ORDINALS[i] ?? `${i + 1}th`;

type LegacyTier = NonNullable<RewardsFormData['prizeTiers']>[number];

/** Group legacy flat tiers into prize cards: overall tiers collapse into one
 *  "Overall" prize; track tiers group per track. */
function tiersToPrizes(
  tiers: LegacyTier[] | undefined,
  trackName: (id: string) => string
): LocalPrize[] {
  const list = tiers ?? [];
  if (list.length === 0) return [];

  const overall = list.filter(t => t.kind !== 'TRACK');
  const trackGroups = new Map<string, LegacyTier[]>();
  for (const t of list) {
    if (t.kind === 'TRACK' && t.trackId) {
      const arr = trackGroups.get(t.trackId) ?? [];
      arr.push(t);
      trackGroups.set(t.trackId, arr);
    }
  }

  const toPlacements = (ts: LegacyTier[]): LocalPlacement[] =>
    ts.map((t, i) => ({
      key: uid('pl'),
      label: t.place || placeLabel(i),
      amount: String(t.prizeAmount ?? ''),
    }));

  const prizes: LocalPrize[] = [];
  if (overall.length > 0) {
    prizes.push({
      key: uid('pz'),
      name: 'Overall',
      description: '',
      trackIds: [],
      placements: toPlacements(overall),
    });
  }
  for (const [trackId, ts] of trackGroups) {
    prizes.push({
      key: uid('pz'),
      name: trackName(trackId) || 'Track Prize',
      description: '',
      trackIds: [trackId],
      placements: toPlacements(ts),
    });
  }
  return prizes;
}

function emptyPrize(): LocalPrize {
  return {
    key: uid('pz'),
    name: '',
    description: '',
    trackIds: [],
    placements: [{ key: uid('pl'), label: placeLabel(0), amount: '' }],
  };
}

/** Seed prize cards from the persisted Prize entity (carries the names the
 *  legacy prizeTiers shadow does not). */
function prizesFromEntity(prizes: HackathonDraftPrize[]): LocalPrize[] {
  return prizes.map(p => ({
    key: uid('pz'),
    name: p.name,
    description: p.description ?? '',
    trackIds: p.trackIds ?? [],
    placements:
      p.placements && p.placements.length > 0
        ? p.placements.map(pl => ({
            key: uid('pl'),
            label: pl.label ?? '',
            amount: String(pl.amount ?? ''),
          }))
        : [{ key: uid('pl'), label: placeLabel(0), amount: '' }],
  }));
}

/** LocalPrize[] -> the `prizes` write shape the rewards step accepts. */
function toRewardsFormData(
  prizes: LocalPrize[],
  allowWinnerStacking?: boolean,
  tracksMaxPerSubmission?: number
): RewardsFormData {
  return {
    prizes: prizes.map(p => ({
      name: p.name.trim(),
      description: p.description.trim() || undefined,
      trackIds: p.trackIds,
      placements: p.placements.map((pl, i) => ({
        position: i + 1,
        label: pl.label.trim() || placeLabel(i),
        amount: pl.amount.trim() || '0',
      })),
    })),
    ...(allowWinnerStacking != null ? { allowWinnerStacking } : {}),
    ...(tracksMaxPerSubmission != null ? { tracksMaxPerSubmission } : {}),
  };
}

// Field-keyed errors so the UI can highlight the exact input that needs fixing,
// rather than a single transient toast. Keys: 'form', `name:<prizeKey>`,
// `placements:<prizeKey>`, `amount:<placementKey>`.
type FieldErrors = Record<string, string>;

function buildPrizeErrors(prizes: LocalPrize[]): FieldErrors {
  const errs: FieldErrors = {};
  if (prizes.length === 0) {
    errs.form = 'Add at least one prize.';
    return errs;
  }
  for (const p of prizes) {
    if (!p.name.trim()) errs[`name:${p.key}`] = 'Give this prize a name.';
    if (p.placements.length === 0) {
      errs[`placements:${p.key}`] = 'Add at least one placement.';
    }
    for (const pl of p.placements) {
      const n = parseFloat(pl.amount);
      if (pl.amount.trim() === '' || isNaN(n) || n < 0) {
        errs[`amount:${pl.key}`] = 'Enter a valid amount.';
      }
    }
  }
  return errs;
}

export default function RewardsTab({
  onContinue,
  onSave,
  initialData,
  isLoading,
  organizationId,
  hackathonId,
  availableTracks: availableTracksProp,
}: RewardsTabProps) {
  const [internalTracks, setInternalTracks] = useState<TrackOption[]>([]);
  const availableTracks = availableTracksProp ?? internalTracks;
  const [prizes, setPrizes] = useState<LocalPrize[]>([]);
  const [targetPool, setTargetPool] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const clearError = (field: string) =>
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  const initialized = useRef(false);
  // Self-fetch the draft so we can seed names from the Prize entity (the legacy
  // rewards.prizeTiers passed as initialData has no prize name).
  const draftQuery = useDraft(organizationId ?? '', hackathonId);

  // Fetch tracks when the parent does not own them; exposed as a callback so
  // the tracks manager can refresh the chips after add/rename/remove.
  const loadTracks = useCallback(async () => {
    if (availableTracksProp || !organizationId || !hackathonId) return;
    try {
      const rows = await listOrganizerTracks(organizationId, hackathonId);
      setInternalTracks(rows as unknown as TrackOption[]);
    } catch {
      /* tracks are optional here; overall prizes still work */
    }
  }, [availableTracksProp, organizationId, hackathonId]);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  const trackName = useMemo(() => {
    const map = new Map(availableTracks.map(t => [t.id, t.name]));
    return (id: string) => map.get(id) ?? '';
  }, [availableTracks]);

  // Seed the prize cards once. Prefer the Prize entity (it carries names the
  // legacy prizeTiers shadow lacks); fall back to grouping legacy tiers.
  useEffect(() => {
    if (initialized.current) return;
    // When editing a saved draft, wait for the entity query to settle so names
    // come through instead of the nameless shadow.
    if (hackathonId && draftQuery.isLoading) return;
    const entityPrizes = draftQuery.data?.prizes;
    const seeded =
      entityPrizes && entityPrizes.length > 0
        ? prizesFromEntity(entityPrizes)
        : tiersToPrizes(initialData?.prizeTiers, trackName);
    setPrizes(seeded.length > 0 ? seeded : [emptyPrize()]);
    initialized.current = true;
  }, [
    draftQuery.data,
    draftQuery.isLoading,
    hackathonId,
    initialData,
    trackName,
  ]);

  const activeTracks = availableTracks.filter(t => !t.isArchived);

  const poolTotal = useMemo(
    () =>
      prizes.reduce(
        (sum, p) =>
          sum +
          p.placements.reduce((s, pl) => s + (parseFloat(pl.amount) || 0), 0),
        0
      ),
    [prizes]
  );

  const update = (key: string, patch: Partial<LocalPrize>) =>
    setPrizes(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)));

  const toggleTrack = (prize: LocalPrize, trackId: string) =>
    update(prize.key, {
      trackIds: prize.trackIds.includes(trackId)
        ? prize.trackIds.filter(id => id !== trackId)
        : [...prize.trackIds, trackId],
    });

  const addPlacement = (prize: LocalPrize) =>
    update(prize.key, {
      placements: [
        ...prize.placements,
        {
          key: uid('pl'),
          label: placeLabel(prize.placements.length),
          amount: '',
        },
      ],
    });

  const updatePlacement = (
    prize: LocalPrize,
    plKey: string,
    patch: Partial<LocalPlacement>
  ) =>
    update(prize.key, {
      placements: prize.placements.map(pl =>
        pl.key === plKey ? { ...pl, ...patch } : pl
      ),
    });

  const removePlacement = (prize: LocalPrize, plKey: string) =>
    update(prize.key, {
      placements: prize.placements.filter(pl => pl.key !== plKey),
    });

  const applyRegeneratedPrizes = (data: Record<string, unknown>) => {
    const tiers = data.prizeTiers as LegacyTier[] | undefined;
    if (!tiers) return;
    const next = tiersToPrizes(tiers, trackName);
    setPrizes(next.length > 0 ? next : [emptyPrize()]);
  };

  const handleSave = async () => {
    const fieldErrors = buildPrizeErrors(prizes);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      await onSave?.(toRewardsFormData(prizes));
      onContinue?.();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: unknown } };
        message?: string;
      };
      const msg = e.response?.data?.message ?? e.message;
      toast.error(
        (Array.isArray(msg) ? msg[0] : msg) ||
          'Failed to save prizes. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='text-lg font-medium text-white'>Prizes</h3>
          <p className='mt-1 text-sm text-zinc-500'>
            Create named prizes, link them to tracks, and add one or more
            placements under each.
          </p>
        </div>
        <div className='flex flex-shrink-0 items-center gap-2'>
          <RegenerateSectionButton
            section='prizes'
            onApply={applyRegeneratedPrizes}
          />
        </div>
      </div>

      <div className='space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4'>
        <div className='flex items-center justify-between gap-4'>
          <label className='flex items-center gap-2 text-sm text-zinc-400'>
            <Trophy className='h-4 w-4' /> Target prize pool (optional)
          </label>
          <div className='flex items-center gap-2'>
            <Input
              value={targetPool}
              inputMode='decimal'
              placeholder='e.g. 10000'
              onChange={e =>
                setTargetPool(e.target.value.replace(/[^0-9.]/g, ''))
              }
              className='w-32 text-right'
            />
            <span className='text-xs text-zinc-500'>USDC</span>
          </div>
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-zinc-400'>Allocated across placements</span>
          <span className='font-mono font-medium text-white'>
            {poolTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            USDC
          </span>
        </div>
        {(parseFloat(targetPool) || 0) > 0 && (
          <div className='flex items-center justify-between text-sm'>
            <span className='text-zinc-400'>Remaining to allocate</span>
            <span
              className={cn(
                'font-mono font-medium',
                (parseFloat(targetPool) || 0) - poolTotal < -1e-9
                  ? 'text-red-400'
                  : 'text-emerald-400'
              )}
            >
              {((parseFloat(targetPool) || 0) - poolTotal).toLocaleString(
                undefined,
                { maximumFractionDigits: 2 }
              )}{' '}
              USDC
            </span>
          </div>
        )}
      </div>

      <div className='space-y-4'>
        {prizes.map(prize => (
          <div
            key={prize.key}
            className='space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4'
          >
            <div className='flex items-start gap-3'>
              <div className='flex-1 space-y-2'>
                <Input
                  value={prize.name}
                  placeholder='Prize name (e.g. Grand Prize, Best UI/UX)'
                  aria-invalid={!!errors[`name:${prize.key}`]}
                  onChange={e => {
                    update(prize.key, { name: e.target.value });
                    clearError(`name:${prize.key}`);
                    clearError('form');
                  }}
                  className={cn(
                    errors[`name:${prize.key}`] && 'border-red-500'
                  )}
                />
                {errors[`name:${prize.key}`] && (
                  <p className='text-xs text-red-400'>
                    {errors[`name:${prize.key}`]}
                  </p>
                )}
                <Textarea
                  value={prize.description}
                  placeholder='What does this prize celebrate? (optional)'
                  rows={2}
                  onChange={e =>
                    update(prize.key, { description: e.target.value })
                  }
                />
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label='Remove prize'
                onClick={() =>
                  setPrizes(prev => prev.filter(p => p.key !== prize.key))
                }
                className='text-zinc-500 hover:text-red-400'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>

            {/* Track links (empty = overall prize) */}
            {activeTracks.length > 0 && (
              <div className='space-y-1.5'>
                <p className='text-xs text-zinc-500'>
                  Tracks (leave empty for an overall prize)
                </p>
                <div className='flex flex-wrap gap-2'>
                  {activeTracks.map(t => {
                    const on = prize.trackIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type='button'
                        onClick={() => toggleTrack(prize, t.id)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs transition-colors',
                          on
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        )}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Placements */}
            <div className='space-y-2'>
              <p className='text-xs text-zinc-500'>Placements</p>
              {prize.placements.map((pl, i) => (
                <div key={pl.key}>
                  <div className='flex items-center gap-2'>
                    <Input
                      value={pl.label}
                      placeholder={placeLabel(i)}
                      onChange={e =>
                        updatePlacement(prize, pl.key, {
                          label: e.target.value,
                        })
                      }
                      className='w-32'
                    />
                    <Input
                      value={pl.amount}
                      inputMode='decimal'
                      placeholder='Amount'
                      aria-invalid={!!errors[`amount:${pl.key}`]}
                      onChange={e => {
                        updatePlacement(prize, pl.key, {
                          amount: e.target.value,
                        });
                        clearError(`amount:${pl.key}`);
                      }}
                      className={cn(
                        'flex-1',
                        errors[`amount:${pl.key}`] && 'border-red-500'
                      )}
                    />
                    <span className='text-xs text-zinc-500'>USDC</span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      aria-label='Remove placement'
                      disabled={prize.placements.length <= 1}
                      onClick={() => removePlacement(prize, pl.key)}
                      className='text-zinc-500 hover:text-red-400 disabled:opacity-40'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                  {errors[`amount:${pl.key}`] && (
                    <p className='mt-1 text-xs text-red-400'>
                      {errors[`amount:${pl.key}`]}
                    </p>
                  )}
                </div>
              ))}
              {errors[`placements:${prize.key}`] && (
                <p className='text-xs text-red-400'>
                  {errors[`placements:${prize.key}`]}
                </p>
              )}
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => addPlacement(prize)}
                className='text-primary hover:text-primary gap-1'
              >
                <Plus className='h-3.5 w-3.5' /> Add placement
              </Button>
            </div>
          </div>
        ))}
      </div>

      {errors.form && <p className='text-sm text-red-400'>{errors.form}</p>}
      <Button
        type='button'
        variant='outline'
        onClick={() => {
          setPrizes(prev => [...prev, emptyPrize()]);
          clearError('form');
        }}
        className='w-full gap-2 border-dashed border-zinc-700 text-zinc-300'
      >
        <Plus className='h-4 w-4' /> Add prize
      </Button>

      <div className='flex justify-end pt-2'>
        <BoundlessButton
          type='button'
          loading={saving || isLoading}
          onClick={handleSave}
        >
          {onContinue ? 'Save & Continue' : 'Save'}
        </BoundlessButton>
      </div>
    </div>
  );
}
