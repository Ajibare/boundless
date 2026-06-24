'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BoundlessButton } from '@/components/buttons';
import { cn } from '@/lib/utils';
import {
  listOrganizerTracks,
  createTrack,
  updateTrack,
  deleteTrack,
  updateTracksConfig,
  type HackathonTrack,
} from '@/lib/api/hackathons/tracks';

/**
 * Dedicated Tracks section of the create wizard. Sits before Rewards so prizes
 * can link to real tracks. Owns track CRUD (the default "All Submissions" track
 * is auto-created with the draft and can be renamed; the last track can't be
 * removed) plus the hackathon-level `tracksMaxPerSubmission` cap, which is saved
 * through its own endpoint rather than the prize-coupled rewards step. Once the
 * hackathon is published these tracks drive the public Tracks tab.
 */
interface TracksTabProps {
  organizationId?: string;
  hackathonId?: string;
  /** Seeded from the draft so the cap round-trips across reloads. */
  initialMaxPerSubmission?: number;
  onContinue?: () => void;
  /** Lets the parent keep its draft snapshot in sync after a config save. */
  onConfigSaved?: (maxPerSubmission: number) => void;
  /** Jumps to the Information step so the organizer can create the draft. */
  onGoToInformation?: () => void;
}

export default function TracksTab({
  organizationId,
  hackathonId,
  initialMaxPerSubmission,
  onContinue,
  onConfigSaved,
  onGoToInformation,
}: TracksTabProps) {
  const ready = !!organizationId && !!hackathonId;
  const [tracks, setTracks] = useState<HackathonTrack[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [maxPerSubmission, setMaxPerSubmission] = useState(
    initialMaxPerSubmission != null ? String(initialMaxPerSubmission) : '3'
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId || !hackathonId) return;
    setLoading(true);
    try {
      const rows = await listOrganizerTracks(organizationId, hackathonId);
      const active = rows.filter(t => !t.isArchived);
      setTracks(active);
      setNames(Object.fromEntries(active.map(t => [t.id, t.name])));
    } catch {
      toast.error('Could not load tracks.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, hackathonId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The draft loads after mount; seed the cap field once it arrives.
  useEffect(() => {
    if (initialMaxPerSubmission != null) {
      setMaxPerSubmission(String(initialMaxPerSubmission));
    }
  }, [initialMaxPerSubmission]);

  const add = async () => {
    const name = newName.trim();
    if (!name || !organizationId || !hackathonId) return;
    setBusy(true);
    try {
      await createTrack(organizationId, hackathonId, {
        name,
        eligibility: 'OPT_IN',
      });
      setNewName('');
      await load();
      toast.success('Track added.');
    } catch {
      toast.error('Could not add track.');
    } finally {
      setBusy(false);
    }
  };

  const rename = async (track: HackathonTrack) => {
    const name = (names[track.id] ?? '').trim();
    if (!name || name === track.name || !organizationId || !hackathonId) return;
    try {
      await updateTrack(organizationId, hackathonId, track.id, { name });
      await load();
    } catch {
      toast.error('Could not rename track.');
      setNames(prev => ({ ...prev, [track.id]: track.name }));
    }
  };

  const toggleEligibility = async (track: HackathonTrack) => {
    if (!organizationId || !hackathonId) return;
    const next = track.eligibility === 'OPEN' ? 'OPT_IN' : 'OPEN';
    // Optimistic: flip the chip immediately, revert if the write fails.
    setTracks(prev =>
      prev.map(t => (t.id === track.id ? { ...t, eligibility: next } : t))
    );
    try {
      await updateTrack(organizationId, hackathonId, track.id, {
        eligibility: next,
      });
    } catch {
      toast.error('Could not change track eligibility.');
      setTracks(prev =>
        prev.map(t =>
          t.id === track.id ? { ...t, eligibility: track.eligibility } : t
        )
      );
    }
  };

  const remove = async (track: HackathonTrack) => {
    if (!organizationId || !hackathonId) return;
    try {
      await deleteTrack(organizationId, hackathonId, track.id);
      await load();
      toast.success('Track removed.');
    } catch {
      toast.error('Could not remove track.');
    }
  };

  const handleSaveContinue = async () => {
    if (organizationId && hackathonId) {
      const n = parseInt(maxPerSubmission, 10);
      const max = Number.isFinite(n) ? Math.min(Math.max(n, 1), 20) : 3;
      setSaving(true);
      try {
        const res = await updateTracksConfig(organizationId, hackathonId, {
          tracksMaxPerSubmission: max,
        });
        onConfigSaved?.(res.tracksMaxPerSubmission);
      } catch {
        toast.error('Could not save track settings.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    onContinue?.();
  };

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium text-white'>Tracks</h3>
        <p className='mt-1 text-sm text-zinc-500'>
          Tracks group submissions and let you award per-track prizes on the
          next step. Once you publish, they become the public Tracks tab. Rename
          the default track or add your own.
        </p>
      </div>

      {!ready ? (
        <div className='flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center'>
          <Layers className='h-6 w-6 text-zinc-600' />
          <p className='text-sm text-zinc-400'>
            Tracks unlock once your draft is created.
          </p>
          <p className='text-xs text-zinc-600'>
            Fill in the Information step and save to start managing tracks.
          </p>
          {onGoToInformation && (
            <BoundlessButton
              variant='outline'
              size='sm'
              className='mt-2 border-zinc-700'
              onClick={onGoToInformation}
            >
              Go to Information
            </BoundlessButton>
          )}
        </div>
      ) : (
        <>
          <div className='space-y-2'>
            {loading ? (
              <div className='flex justify-center py-6'>
                <Loader2 className='h-5 w-5 animate-spin text-zinc-500' />
              </div>
            ) : (
              tracks.map(track => (
                <div
                  key={track.id}
                  className='flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-2'
                >
                  <Input
                    value={names[track.id] ?? ''}
                    onChange={e =>
                      setNames(prev => ({
                        ...prev,
                        [track.id]: e.target.value,
                      }))
                    }
                    onBlur={() => void rename(track)}
                    className='flex-1 border-0 bg-transparent focus-visible:ring-0'
                  />
                  <button
                    type='button'
                    onClick={() => void toggleEligibility(track)}
                    title={
                      track.eligibility === 'OPEN'
                        ? 'Every submission is automatically eligible'
                        : 'Submitters explicitly opt into this track'
                    }
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      track.eligibility === 'OPEN'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    {track.eligibility === 'OPEN' ? 'Open' : 'Opt-in'}
                  </button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    aria-label='Remove track'
                    disabled={tracks.length <= 1}
                    onClick={() => void remove(track)}
                    className='text-zinc-500 hover:text-red-400 disabled:opacity-40'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Input
              value={newName}
              placeholder='New track name (e.g. Best UI/UX)'
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void add();
                }
              }}
              className='flex-1'
            />
            <BoundlessButton
              type='button'
              size='sm'
              loading={busy}
              onClick={() => void add()}
              className='gap-1'
            >
              <Plus className='h-4 w-4' /> Add track
            </BoundlessButton>
          </div>

          <p className='text-xs text-zinc-600'>
            <span className='text-zinc-400'>Open</span> tracks auto-include
            every submission; <span className='text-zinc-400'>Opt-in</span>{' '}
            tracks only include submissions that choose to enter.
          </p>

          <div className='space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4'>
            <label className='text-sm font-medium text-zinc-300'>
              Max tracks per submission
            </label>
            <Input
              value={maxPerSubmission}
              inputMode='numeric'
              placeholder='3'
              onChange={e =>
                setMaxPerSubmission(e.target.value.replace(/[^0-9]/g, ''))
              }
              className='w-40'
            />
            <p className='text-xs text-zinc-500'>
              How many tracks a single submission may enter (1-20).
            </p>
          </div>
        </>
      )}

      <div className='flex justify-end pt-2'>
        <BoundlessButton
          type='button'
          loading={saving}
          onClick={handleSaveContinue}
        >
          {onContinue ? 'Save & Continue' : 'Save'}
        </BoundlessButton>
      </div>
    </div>
  );
}
