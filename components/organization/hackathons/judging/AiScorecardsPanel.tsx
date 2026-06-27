'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  listAiScorecards,
  runAiScore,
  setAiScorePromotion,
  type AiScorecard,
} from '@/lib/api/judge';
import { getJudgingCoverage } from '@/lib/api/hackathons/judging';

/**
 * AI Judging Assist (advisory). Lists the AI scorecards for a hackathon's
 * submissions and lets the organizer run / re-run scoring. The scores are
 * advisory only and never count toward ranking (see backend AI_ASSIST
 * exclusion); promoting a scorecard to a counting score is a separate action.
 */
interface AiScorecardsPanelProps {
  organizationId: string;
  hackathonId: string;
  /** Judging rubric, used to show criterion names instead of raw ids. */
  criteria?: Array<{ id?: string; name?: string }>;
}

export default function AiScorecardsPanel({
  organizationId,
  hackathonId,
  criteria = [],
}: AiScorecardsPanelProps) {
  const criterionNameById = new Map(
    criteria
      .filter((c): c is { id: string; name?: string } => Boolean(c.id))
      .map(c => [c.id, c.name ?? c.id] as const)
  );
  const [byId, setById] = useState<Record<string, AiScorecard>>({});
  const [submissions, setSubmissions] = useState<
    Array<{ submissionId: string; projectName: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Coverage lists every SHORTLISTED submission, so an unscored one can
      // still be AI-scored. (The aggregated results only include submissions
      // that already have a counted score, which would hide fresh ones.)
      const [scorecardsRes, coverageRes] = await Promise.all([
        listAiScorecards(organizationId, hackathonId),
        getJudgingCoverage(organizationId, hackathonId),
      ]);
      const map: Record<string, AiScorecard> = {};
      for (const sc of scorecardsRes.data ?? []) map[sc.submissionId] = sc;
      setById(map);
      setSubmissions(
        (coverageRes.data?.submissions ?? []).map(s => ({
          submissionId: s.submissionId,
          projectName: s.projectName,
        }))
      );
    } catch {
      toast.error('Could not load AI scorecards.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, hackathonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (submissionId: string) => {
    setRunningId(submissionId);
    try {
      await runAiScore(organizationId, hackathonId, submissionId);
      await load();
      setExpanded(submissionId);
      toast.success('AI scorecard ready.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: unknown } } };
      const msg = e.response?.data?.message;
      toast.error(
        (Array.isArray(msg) ? String(msg[0]) : (msg as string)) ||
          'AI scoring failed.'
      );
    } finally {
      setRunningId(null);
    }
  };

  const togglePromote = async (submissionId: string, next: boolean) => {
    setPromotingId(submissionId);
    try {
      await setAiScorePromotion(
        organizationId,
        hackathonId,
        submissionId,
        next
      );
      await load();
      toast.success(
        next ? 'Promoted to a counting score.' : 'Reverted to advisory.'
      );
    } catch {
      toast.error('Could not update promotion.');
    } finally {
      setPromotingId(null);
    }
  };

  return (
    <div className='space-y-3 rounded-2xl border border-white/5 bg-[#1C1D1B] p-5'>
      <div className='flex items-center gap-2'>
        <Sparkles className='text-primary h-4 w-4' />
        <h3 className='text-sm font-bold text-white'>AI Judging Assist</h3>
        <Badge
          variant='outline'
          className='h-4 border-white/10 py-0 text-[10px] text-gray-400'
        >
          Advisory
        </Badge>
        {loading && (
          <Loader2 className='h-3.5 w-3.5 animate-spin text-gray-500' />
        )}
      </div>
      <p className='text-xs text-gray-400'>
        Run AI scoring for advice against the rubric. A scorecard is advisory
        until you Promote it, which makes it count toward ranking as the AI
        judge.
      </p>

      {submissions.length === 0 ? (
        <p className='py-4 text-sm text-zinc-500'>
          No submissions to score yet.
        </p>
      ) : (
        <div className='divide-y divide-white/5'>
          {submissions.map(r => {
            const sc = byId[r.submissionId];
            const isOpen = expanded === r.submissionId;
            return (
              <div key={r.submissionId} className='py-2'>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setExpanded(isOpen ? null : r.submissionId)}
                    disabled={!sc}
                    className='flex flex-1 items-center gap-2 text-left disabled:cursor-default'
                  >
                    {sc && (
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform',
                          isOpen && 'rotate-180'
                        )}
                      />
                    )}
                    <span className='flex-1 truncate text-sm text-zinc-200'>
                      {r.projectName}
                    </span>
                    {sc && (
                      <span className='font-mono text-xs text-white'>
                        {sc.totalScore.toFixed(1)}
                      </span>
                    )}
                    {sc?.counts && (
                      <Badge
                        variant='outline'
                        className='h-4 border-emerald-500/40 bg-emerald-500/10 py-0 text-[10px] text-emerald-400'
                      >
                        Counts
                      </Badge>
                    )}
                    {sc?.promoted && !sc?.counts && (
                      <Badge
                        variant='outline'
                        className='h-4 border-amber-500/40 bg-amber-500/10 py-0 text-[10px] text-amber-400'
                      >
                        Not counting
                      </Badge>
                    )}
                    {sc?.flags?.meritsAttention && (
                      <Flag className='h-3.5 w-3.5 text-amber-400' />
                    )}
                    {sc?.flags?.lowEffortSignal && (
                      <AlertTriangle className='h-3.5 w-3.5 text-red-400' />
                    )}
                  </button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    disabled={runningId === r.submissionId}
                    onClick={() => void run(r.submissionId)}
                    className='border-white/10 bg-transparent text-gray-300 hover:bg-white/5'
                  >
                    {runningId === r.submissionId ? (
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    ) : sc ? (
                      'Re-run'
                    ) : (
                      'Run AI score'
                    )}
                  </Button>
                </div>

                {sc && isOpen && (
                  <div className='mt-2 space-y-2 rounded-lg border border-white/5 bg-black/20 p-3'>
                    {sc.tldr && (
                      <p className='text-xs text-gray-300'>{sc.tldr}</p>
                    )}
                    <div className='space-y-1'>
                      {sc.criteriaScores.map(cs => (
                        <div key={cs.criterionId} className='text-xs'>
                          <div className='flex items-center justify-between gap-2'>
                            <span className='text-gray-400'>
                              {criterionNameById.get(cs.criterionId) ??
                                cs.criterionId}
                            </span>
                            <span className='font-mono text-white'>
                              {cs.score}
                            </span>
                          </div>
                          {cs.comment && (
                            <p className='text-gray-500'>{cs.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {sc.flags?.meritsAttention &&
                      sc.flags.meritsAttentionReason && (
                        <p className='text-xs text-amber-400'>
                          <Flag className='mr-1 inline h-3 w-3' />
                          {sc.flags.meritsAttentionReason}
                        </p>
                      )}
                    {sc.flags?.lowEffortSignal && sc.flags.lowEffortReason && (
                      <p className='text-xs text-red-400'>
                        <AlertTriangle className='mr-1 inline h-3 w-3' />
                        {sc.flags.lowEffortReason}
                      </p>
                    )}
                    <div className='flex items-center justify-between gap-2 border-t border-white/5 pt-2'>
                      <span className='text-[11px] text-gray-500'>
                        {sc.counts
                          ? 'Counts toward ranking as the AI judge.'
                          : sc.promoted
                            ? 'Promoted, but the AI judge is inactive, so it is not counting. Re-activate to count it.'
                            : 'Advisory only. Promote to count it toward ranking.'}
                      </span>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={promotingId === r.submissionId}
                        onClick={() =>
                          void togglePromote(r.submissionId, !sc.counts)
                        }
                        className={cn(
                          'h-7 text-xs',
                          sc.counts
                            ? 'border-white/10 text-gray-300'
                            : 'border-primary/40 text-primary'
                        )}
                      >
                        {promotingId === r.submissionId ? (
                          <Loader2 className='h-3.5 w-3.5 animate-spin' />
                        ) : sc.counts ? (
                          'Revert promotion'
                        ) : sc.promoted ? (
                          'Re-activate'
                        ) : (
                          'Promote to counting score'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
