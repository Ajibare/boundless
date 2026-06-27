'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BoundlessButton } from '@/components/buttons';
import {
  listRecommendationThresholds,
  setRecommendationThreshold,
  computeRecommendations,
  type RecommendationThreshold,
  type RecommendationComputeResult,
} from '@/lib/api/judge';
import {
  listOrganizerTracks,
  type HackathonTrack,
} from '@/lib/api/hackathons/tracks';

/**
 * Organizer config for recommendation thresholds: set a top-X% cut overall and
 * per track, then recompute to stamp advisory "recommended" flags. Never picks
 * winners.
 */
interface RecommendationThresholdsCardProps {
  organizationId: string;
  hackathonId: string;
}

interface ScopeRow {
  key: string; // 'overall' or a track id
  label: string;
  trackId?: string;
}

export default function RecommendationThresholdsCard({
  organizationId,
  hackathonId,
}: RecommendationThresholdsCardProps) {
  const [tracks, setTracks] = useState<HackathonTrack[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<RecommendationComputeResult | null>(
    null
  );

  const load = useCallback(async () => {
    try {
      const [thresholdsRes, trackRows] = await Promise.all([
        listRecommendationThresholds(organizationId, hackathonId),
        listOrganizerTracks(organizationId, hackathonId).catch(() => []),
      ]);
      setTracks((trackRows as HackathonTrack[]).filter(t => !t.isArchived));
      const next: Record<string, string> = {};
      for (const t of thresholdsRes.data ?? ([] as RecommendationThreshold[])) {
        next[t.trackId ?? 'overall'] = String(t.topPercent);
      }
      setValues(next);
    } catch {
      toast.error('Could not load recommendation thresholds.');
    }
  }, [organizationId, hackathonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: ScopeRow[] = [
    { key: 'overall', label: 'Overall' },
    ...tracks.map(t => ({ key: t.id, label: t.name, trackId: t.id })),
  ];

  const save = async (row: ScopeRow) => {
    const raw = (values[row.key] ?? '').trim();
    const pct = Number(raw);
    if (raw === '' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error('Enter a percent between 0 and 100.');
      return;
    }
    setSavingKey(row.key);
    try {
      await setRecommendationThreshold(organizationId, hackathonId, {
        ...(row.trackId ? { trackId: row.trackId } : {}),
        topPercent: pct,
      });
      toast.success(`Saved ${row.label} threshold.`);
    } catch {
      toast.error('Could not save threshold.');
    } finally {
      setSavingKey(null);
    }
  };

  const recompute = async () => {
    setComputing(true);
    try {
      const res = await computeRecommendations(organizationId, hackathonId);
      const data = res.data ?? null;
      setResult(data);
      const trackTotal =
        data?.tracks.reduce((s, t) => s + t.recommended, 0) ?? 0;
      const total = (data?.overallRecommended ?? 0) + trackTotal;
      const reasons = data?.diagnostics.reasons ?? [];
      if (total === 0 && reasons.length > 0) {
        // Nothing flagged: surface the actual reason instead of a bare "0".
        toast.warning(reasons[0]);
      } else {
        toast.success(
          `Recommended ${data?.overallRecommended ?? 0} overall and ${trackTotal} across tracks.`
        );
      }
    } catch {
      toast.error('Could not recompute recommendations.');
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className='space-y-4 rounded-2xl border border-white/5 bg-[#1C1D1B] p-5'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='text-sm font-bold text-white'>
            Recommendation thresholds
          </h3>
          <p className='mt-1 text-xs text-gray-400'>
            Flag the top X% as recommended. Advisory only, never selects
            winners.
          </p>
        </div>
        <BoundlessButton
          type='button'
          size='sm'
          variant='outline'
          loading={computing}
          onClick={recompute}
          className='gap-1.5'
        >
          <Sparkles className='h-3.5 w-3.5' /> Recompute
        </BoundlessButton>
      </div>

      <div className='space-y-2'>
        {rows.map(row => (
          <div key={row.key} className='flex items-center gap-2'>
            <span className='flex-1 truncate text-sm text-zinc-300'>
              {row.label}
              {row.key === 'overall' && (
                <span className='ml-1 text-xs text-zinc-500'>
                  (all submissions)
                </span>
              )}
            </span>
            <div className='flex items-center gap-1'>
              <Input
                value={values[row.key] ?? ''}
                inputMode='decimal'
                placeholder='—'
                onChange={e =>
                  setValues(prev => ({
                    ...prev,
                    [row.key]: e.target.value.replace(/[^0-9.]/g, ''),
                  }))
                }
                className='w-20 text-right'
              />
              <span className='text-xs text-zinc-500'>%</span>
            </div>
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={savingKey === row.key}
              onClick={() => void save(row)}
              className='border-white/10 bg-transparent text-gray-300 hover:bg-white/5'
            >
              Save
            </Button>
          </div>
        ))}
      </div>

      {result && (
        <div className='space-y-1 rounded-lg border border-white/5 bg-black/20 p-3 text-xs'>
          <p className='text-zinc-400'>
            {result.diagnostics.shortlistedSubmissions} shortlisted,{' '}
            {result.diagnostics.scoredSubmissions} scored,{' '}
            {(result.diagnostics.overallThresholdConfigured ? 1 : 0) +
              result.diagnostics.trackThresholdsConfigured}{' '}
            threshold(s) configured
          </p>
          {result.diagnostics.reasons.length > 0 ? (
            result.diagnostics.reasons.map((reason, i) => (
              <p key={i} className='text-amber-400/90'>
                {reason}
              </p>
            ))
          ) : (
            <p className='text-emerald-400/90'>
              Recommended {result.overallRecommended} overall,{' '}
              {result.tracks.reduce((s, t) => s + t.recommended, 0)} across
              tracks.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
