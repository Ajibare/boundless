'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2, AlertTriangle, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getJudgeAiScorecard,
  runJudgeAiScore,
  type AiScorecard,
} from '@/lib/api/judge';

interface JudgeAiAssistProps {
  hackathonId: string;
  submissionId: string;
  /** Criterion id -> human label, for readable per-criterion rows. */
  criterionLabels: Record<string, string>;
  /** Judging closed / read-only: hide the run + apply actions. */
  disabled?: boolean;
  /** Copy the AI's per-criterion scores into the judge's own sliders. */
  onApply: (scores: Array<{ criterionId: string; score: number }>) => void;
}

/**
 * Judge-side AI assist. Advisory only: the judge can generate the AI
 * scorecard, read it, and optionally apply it as a starting point for their
 * own sliders. It never submits a score on the judge's behalf.
 */
export default function JudgeAiAssist({
  hackathonId,
  submissionId,
  criterionLabels,
  disabled = false,
  onApply,
}: JudgeAiAssistProps) {
  const [card, setCard] = useState<AiScorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getJudgeAiScorecard(hackathonId, submissionId);
      setCard(res.data ?? null);
    } catch {
      // Soft-fail: AI assist is optional and must never block scoring.
      setCard(null);
    } finally {
      setLoading(false);
    }
  }, [hackathonId, submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async () => {
    setRunning(true);
    try {
      await runJudgeAiScore(hackathonId, submissionId);
      await load();
      toast.success('AI scorecard ready.');
    } catch (err) {
      const e = err as { response?: { data?: { message?: unknown } } };
      const msg = e.response?.data?.message;
      toast.error(
        (Array.isArray(msg) ? String(msg[0]) : (msg as string)) ||
          'AI scoring failed.'
      );
    } finally {
      setRunning(false);
    }
  };

  const apply = () => {
    if (!card) return;
    onApply(
      card.criteriaScores.map(cs => ({
        criterionId: cs.criterionId,
        score: cs.score,
      }))
    );
    toast.success('Applied AI scores. Review and adjust before you submit.');
  };

  return (
    <div className='border-primary/20 bg-primary/5 rounded-2xl border p-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5'>
          <Sparkles className='text-primary h-4 w-4' />
          <span className='text-sm font-semibold text-white'>AI assist</span>
          <span className='rounded-full border border-white/10 px-1.5 text-[10px] text-gray-400'>
            Advisory
          </span>
        </div>
        {!disabled && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={running}
            onClick={() => void run()}
            className='h-7 border-white/10 bg-transparent text-xs text-gray-200 hover:bg-white/5'
          >
            {running ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : card ? (
              'Re-run'
            ) : (
              'Run AI score'
            )}
          </Button>
        )}
      </div>

      <p className='mt-1 text-[11px] text-gray-400'>
        A suggestion to help you score. It never submits for you.
      </p>

      {loading && !card && (
        <p className='mt-3 text-xs text-gray-500'>Loading scorecard</p>
      )}

      {card && (
        <div className='mt-3 space-y-2'>
          {card.tldr && <p className='text-xs text-gray-300'>{card.tldr}</p>}
          <div className='space-y-1'>
            {card.criteriaScores.map(cs => (
              <div
                key={cs.criterionId}
                className='flex items-center justify-between gap-2 text-xs'
              >
                <span className='truncate text-gray-400'>
                  {criterionLabels[cs.criterionId] ?? cs.criterionId}
                </span>
                <span className='font-mono text-white'>{cs.score}/10</span>
              </div>
            ))}
          </div>
          {card.flags?.meritsAttention && card.flags.meritsAttentionReason && (
            <p className='text-xs text-amber-400'>
              <Flag className='mr-1 inline h-3 w-3' />
              {card.flags.meritsAttentionReason}
            </p>
          )}
          {card.flags?.lowEffortSignal && card.flags.lowEffortReason && (
            <p className='text-xs text-red-400'>
              <AlertTriangle className='mr-1 inline h-3 w-3' />
              {card.flags.lowEffortReason}
            </p>
          )}
          {!disabled && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={apply}
              className='text-primary border-primary/40 hover:bg-primary/10 h-7 w-full text-xs'
            >
              Apply as starting point
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
