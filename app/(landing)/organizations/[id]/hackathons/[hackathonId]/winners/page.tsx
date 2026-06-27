'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PublishWinnersWizard from '@/components/organization/hackathons/rewards/PublishWinnersWizard';
import { RewardsPageHeader } from '@/components/organization/hackathons/rewards/RewardsPageHeader';
import { RewardsPageContent } from '@/components/organization/hackathons/rewards/RewardsPageContent';
import { useHackathonRewards } from '@/hooks/use-hackathon-rewards';
import {
  publishJudgingResults,
  getJudgingCompleteness,
  type JudgingCompletenessPreview,
} from '@/lib/api/hackathons/judging';
import type { WinnersBoard as WinnersBoardData } from '@/lib/api/hackathons/winners';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AuthGuard } from '@/components/auth';
import Loading from '@/components/Loading';

export default function WinnersPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const hackathonId = params.hackathonId as string;

  const {
    submissions,
    prizeTiers,
    isLoading,
    isLoadingSubmissions,
    error,
    refetchHackathon,
    resultsPublished,
    hackathon,
    trackWinners,
  } = useHackathonRewards(organizationId, hackathonId);

  const [isPublishWizardOpen, setIsPublishWizardOpen] = useState(false);

  // Winners board snapshot (reported up from WinnersBoard). Drives the
  // "X of Y prizes have a winner" summary and gates Confirm so results can
  // never be published with zero winners.
  const [board, setBoard] = useState<WinnersBoardData | null>(null);
  const placements = useMemo(
    () => board?.prizes.flatMap(p => p.placements) ?? [],
    [board]
  );
  const totalPlacements = placements.length;
  const winnersChosen = placements.filter(pl => pl.selected).length;
  const eligiblePlacements = placements.filter(
    pl => pl.candidates.length > 0
  ).length;
  // Prizes with no winner (withheld or simply unfilled). Their escrowed money
  // is not paid out — disclosed at confirm so the organizer acknowledges it.
  const unawardedPlacements = placements.filter(pl => !pl.selected);
  const unawardedCount = unawardedPlacements.length;
  const unawardedAmount = unawardedPlacements.reduce(
    (sum, pl) => sum + (Number.parseFloat(pl.amount) || 0),
    0
  );
  const unawardedCurrency = placements[0]?.currency ?? 'USDC';

  // ── Confirm winners (publish results) ──────────────────────────────
  // Reuses the judging completeness + acceptPartial UX so publishing here
  // handles incomplete judging the same way.
  const [isPublishResultsDialogOpen, setIsPublishResultsDialogOpen] =
    useState(false);
  const [isPublishingResults, setIsPublishingResults] = useState(false);
  const [completeness, setCompleteness] =
    useState<JudgingCompletenessPreview | null>(null);
  const [completenessLoading, setCompletenessLoading] = useState(false);
  const [acceptPartial, setAcceptPartial] = useState(false);
  // Separate acknowledgement that unawarded prizes won't be paid out.
  const [acceptUnawarded, setAcceptUnawarded] = useState(false);

  // Pull the completeness snapshot every time the dialog opens so the
  // organizer sees fresh numbers before publishing.
  useEffect(() => {
    if (!isPublishResultsDialogOpen) {
      setAcceptPartial(false);
      setAcceptUnawarded(false);
      return;
    }
    let cancelled = false;
    setCompletenessLoading(true);
    getJudgingCompleteness(organizationId, hackathonId)
      .then(res => {
        if (cancelled) return;
        if (res.success && res.data) setCompleteness(res.data);
      })
      .catch(() => {
        // Non-fatal: the dialog still works, organizer just won't see
        // the incompleteness summary.
      })
      .finally(() => {
        if (!cancelled) setCompletenessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPublishResultsDialogOpen, organizationId, hackathonId]);

  const handlePublishResults = async () => {
    setIsPublishingResults(true);
    try {
      const res = await publishJudgingResults(organizationId, hackathonId, {
        acceptPartial,
      });
      if (res.success) {
        toast.success('Winners confirmed and announced!');
        setIsPublishResultsDialogOpen(false);
        setAcceptPartial(false);
        await refetchHackathon();
      } else {
        toast.error(
          (res as { message?: string }).message || 'Failed to confirm winners'
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to confirm winners'
      );
    } finally {
      setIsPublishingResults(false);
    }
  };

  // `maxRank` is the number of OVERALL prize tier slots; track tiers
  // are not rank-numbered so they don't contribute to this cap. The
  // rank-based rendering (podium, rank-keyed lookups) still uses
  // `maxRank`. Track winners flow through `isTrackWinner` instead.
  const maxRank = useMemo(
    () => prizeTiers.filter(t => !t.kind || t.kind === 'OVERALL').length,
    [prizeTiers]
  );
  const winners = useMemo(
    () =>
      submissions.filter(s => (s.rank && s.rank <= maxRank) || s.isTrackWinner),
    [submissions, maxRank]
  );
  const hasWinners = winners.length > 0;

  // Pay step gate: the hackathon must be funded on-chain (events contract
  // published) before winners can be paid. The Hackathon type has no
  // dedicated escrow-event flag, so gate on the lifecycle status — a
  // hackathon that left DRAFT/DRAFT_AWAITING_FUNDING is funded on-chain.
  const canReward = useMemo(() => {
    const status = hackathon?.status;
    if (!status) return false;
    return status !== 'DRAFT' && status !== 'DRAFT_AWAITING_FUNDING';
  }, [hackathon?.status]);

  return (
    <AuthGuard redirectTo='/auth?mode=signin' fallback={<Loading />}>
      <div className='bg-background min-h-screen p-4 text-white sm:p-6 md:p-8'>
        <RewardsPageHeader />

        {isLoading && (
          <div className='flex items-center justify-center py-16'>
            <div className='flex flex-col items-center gap-4'>
              <Loader2 className='text-primary h-10 w-10 animate-spin' />
              <p className='text-base font-medium text-gray-300'>
                Loading winners...
              </p>
              <p className='text-sm text-gray-500'>
                Please wait while we fetch the information
              </p>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <Alert variant='destructive' className='mb-8'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (
          <RewardsPageContent
            organizationId={organizationId}
            hackathonId={hackathonId}
            submissions={submissions}
            isLoadingSubmissions={isLoadingSubmissions}
            maxRank={maxRank}
            hasWinners={hasWinners}
            onPublishClick={() => setIsPublishWizardOpen(true)}
            onPublishResults={() => setIsPublishResultsDialogOpen(true)}
            isPublishingResults={isPublishingResults}
            resultsPublished={resultsPublished}
            canReward={canReward}
            trackWinners={trackWinners}
            onBoardLoaded={setBoard}
            winnersChosen={winnersChosen}
            totalPlacements={totalPlacements}
            eligiblePlacements={eligiblePlacements}
          />
        )}

        <PublishWinnersWizard
          open={isPublishWizardOpen}
          onOpenChange={setIsPublishWizardOpen}
          submissions={submissions}
          prizeTiers={prizeTiers}
          organizationId={organizationId}
          hackathonId={hackathonId}
          onSuccess={() => refetchHackathon()}
        />

        {/* Confirm winners: locks the rankings + announces, then unlocks pay. */}
        <AlertDialog
          open={isPublishResultsDialogOpen}
          onOpenChange={setIsPublishResultsDialogOpen}
        >
          <AlertDialogContent className='border-white/5 bg-[#101010] text-white'>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm the winners?</AlertDialogTitle>
              <AlertDialogDescription className='text-gray-400'>
                This locks in the {winnersChosen} winner
                {winnersChosen === 1 ? '' : 's'} you picked and announces them
                to participants. You can pay out prizes next. The winner list
                cannot be changed afterwards.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {completenessLoading && (
              <p className='text-xs text-gray-500'>
                Checking judging progress…
              </p>
            )}

            {completeness && completeness.complete && (
              <p className='rounded-md border border-emerald-800/40 bg-emerald-900/20 p-3 text-xs text-emerald-200'>
                All {completeness.expectedJudgeCount} active judges have scored
                every shortlisted submission.
              </p>
            )}

            {completeness && !completeness.complete && (
              <div className='space-y-3'>
                <div className='rounded-md border border-amber-800/40 bg-amber-950/30 p-3 text-xs text-amber-200'>
                  <p className='font-medium'>Judging is incomplete.</p>
                  <p className='mt-1'>
                    {completeness.incompleteSubmissionCount} of{' '}
                    {completeness.totalShortlisted} shortlisted submissions are
                    missing scores from one or more active judges.
                  </p>
                </div>
                {completeness.incompleteJudges.length > 0 && (
                  <div className='rounded-md border border-white/10 bg-black/40 p-3 text-xs text-gray-300'>
                    <p className='mb-1.5 text-[10px] tracking-wider text-gray-500 uppercase'>
                      Judges still scoring
                    </p>
                    <ul className='space-y-1'>
                      {completeness.incompleteJudges.map(j => (
                        <li key={j.id} className='flex justify-between'>
                          <span>{j.name}</span>
                          <span className='text-gray-500'>
                            {j.missingCount} left
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <label className='flex cursor-pointer items-start gap-2 rounded-md border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-amber-200'>
                  <input
                    type='checkbox'
                    checked={acceptPartial}
                    onChange={e => setAcceptPartial(e.target.checked)}
                    className='accent-primary mt-0.5 h-3.5 w-3.5'
                  />
                  <span>
                    I understand some judges have not finished, and I want to
                    confirm the winners anyway.
                  </span>
                </label>
              </div>
            )}

            {unawardedCount > 0 && (
              <label className='flex cursor-pointer items-start gap-2 rounded-md border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-amber-200'>
                <input
                  type='checkbox'
                  checked={acceptUnawarded}
                  onChange={e => setAcceptUnawarded(e.target.checked)}
                  className='accent-primary mt-0.5 h-3.5 w-3.5'
                />
                <span>
                  {unawardedCount} prize{unawardedCount === 1 ? '' : 's'} (
                  {unawardedAmount.toLocaleString('en-US')} {unawardedCurrency})
                  won&apos;t be awarded. That money stays in the prize pool and
                  is not paid out. I understand.
                </span>
              </label>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel className='border-white/10 bg-transparent text-gray-300 hover:bg-white/5'>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePublishResults}
                disabled={
                  isPublishingResults ||
                  completenessLoading ||
                  winnersChosen === 0 ||
                  (unawardedCount > 0 && !acceptUnawarded) ||
                  Boolean(
                    completeness && !completeness.complete && !acceptPartial
                  )
                }
                className='bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
              >
                {isPublishingResults
                  ? 'Confirming…'
                  : completeness && !completeness.complete && acceptPartial
                    ? 'Confirm anyway'
                    : 'Confirm winners'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  );
}
