'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  Briefcase,
  ChevronRight,
  Flower,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { useHackathonData } from '@/lib/providers/hackathonProvider';
import {
  useHackathonTracks,
  useJoinHackathon,
} from '@/hooks/hackathon/use-hackathon-queries';
import RegistrationQuestionsDialog, {
  useRegistrationQuestions,
} from '../RegistrationQuestionsDialog';
import { useOptionalAuth } from '@/hooks/use-auth';
import { useRequireAuthForAction } from '@/hooks/use-require-auth-for-action';
import { useSubmission } from '@/features/hackathons';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { BoundlessButton } from '@/components/buttons';
import { effectivePrizeTiers } from '@/lib/utils/effective-prize-tiers';
import { toast } from 'sonner';
import { ExtendedBadge } from '@/components/hackathons/ExtendedBadge';
import { Participant } from '@/lib/api/hackathons';

function useCountdown(deadline?: string) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!deadline || !isMounted) return;

    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, isMounted]);

  return timeLeft;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PoolAndAction() {
  const params = useParams();
  const { user, isAuthenticated } = useOptionalAuth();
  const slug = params.slug as string;

  // React Query dedupes — MySubmissionPanel mounts the same query, so this
  // doesn't fire a second network request. We only need it here to know
  // whether to hide the Submit CTA.
  const { submission: mySubmission } = useSubmission({
    hackathonSlugOrId: slug,
    autoFetch: isAuthenticated && !!slug,
  });
  const hasSubmitted = !!mySubmission;

  const {
    currentHackathon: hackathon,
    submissions,
    error,
    loading,
    refreshCurrentHackathon,
  } = useHackathonData();
  const hackathonError = error;
  const isDataLoading = loading || !hackathon;

  // Load tracks when the hackathon uses a tracked structure so the prize
  // list can label TRACK tiers by the actual track name instead of
  // falling through to a generic "4th/5th Place" auto-label.
  const tracksEnabled =
    hackathon?.prizeStructure === 'OVERALL_AND_TRACKS' ||
    hackathon?.prizeStructure === 'TRACKS_ONLY';
  const { data: hackathonTracks = [] } = useHackathonTracks(
    slug,
    tracksEnabled
  );
  const trackById = new Map(hackathonTracks.map(t => [t.id, t] as const));
  const participants = hackathon?.participants || [];
  const deadline = hackathon?.submissionDeadline;
  const startDate = hackathon?.startDate;
  const timeLeft = useCountdown(deadline);

  const tiers = effectivePrizeTiers(hackathon);
  const totalPool = tiers.reduce(
    (acc, t) => acc + Number(t.prizeAmount || 0),
    0
  );

  const now = new Date();
  const isNotStarted = startDate ? now < new Date(startDate) : false;
  const isSubmissionClosed =
    ['COMPLETED', 'JUDGING', 'ARCHIVED', 'CANCELLED'].includes(
      hackathon?.status || ''
    ) || (deadline ? now > new Date(deadline) : false);

  const isLive =
    hackathon?.status === 'ACTIVE' && !isSubmissionClosed && !isNotStarted;
  const isEnded =
    ['COMPLETED', 'JUDGING', 'ARCHIVED', 'CANCELLED'].includes(
      hackathon?.status || ''
    ) || (deadline ? now > new Date(deadline) : false);
  const currency = tiers[0]?.currency ?? 'USDC';
  const categories = hackathon?.categories ?? [];

  const isParticipant = user
    ? participants.some((p: Participant) => p.userId === user.id)
    : false;

  const { withAuth } = useRequireAuthForAction();

  // For unauth users we open the auth modal in place. After they sign in
  // we want to match the authenticated path's UX: keep the hackathon page
  // interactive and open the submit form in a new tab. `onAuthSuccess`
  // fires inside LoginWrapper's success handler (gesture context is still
  // fresh from the sign-in click, so most browsers allow window.open). If
  // the popup IS blocked we fall back to a same-tab navigation.
  //
  // `redirectTo` is still set so Google sign-in (a full provider redirect
  // that bypasses onAuthSuccess) lands somewhere sensible.
  // A non-participant who wants to submit is routed through JOIN first (the
  // header JOIN does the same). A hackathon has no on-chain "join" — it's a DB
  // registration — so this is a plain mutation; on success the participation
  // refresh flips the CTA to "Submit Now". withAuth opens the auth modal when
  // the viewer is signed out.
  const joinMutation = useJoinHackathon(slug);
  const { data: registrationQuestions = [] } = useRegistrationQuestions(slug);
  const [regDialogOpen, setRegDialogOpen] = useState(false);

  const doJoin = async (answers?: Record<string, string | string[]>) => {
    await joinMutation.mutateAsync(answers);
    await refreshCurrentHackathon();
    toast.success('You joined the hackathon. You can now submit your project.');
  };

  const handleJoinToSubmit = withAuth(async () => {
    // Collect registration questions first when the organizer set any.
    if (registrationQuestions.length > 0) {
      setRegDialogOpen(true);
      return;
    }
    try {
      await doJoin();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to join hackathon'
      );
    }
  });

  const handleRegisterSubmit = async (
    answers: Record<string, string | string[]>
  ) => {
    try {
      await doJoin(answers);
      setRegDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to join hackathon'
      );
    }
  };

  if (isDataLoading) {
    return (
      <div className='space-y-6 overflow-hidden rounded-2xl border border-white/5 bg-[#1C1D1B] p-5'>
        <div className='flex gap-2'>
          <Skeleton className='h-6 w-16 rounded-full' />
          <Skeleton className='h-6 w-20 rounded-full' />
        </div>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-10 w-full' />
        </div>
        <div className='space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-12 w-full' />
        </div>
      </div>
    );
  }

  if (hackathonError) {
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center'>
        <AlertCircle className='mb-3 h-8 w-8 text-red-500' />
        <h3 className='text-sm font-bold text-white'>
          Failed to load hackathon
        </h3>
        <p className='mt-1 text-xs text-gray-400'>
          {typeof hackathonError === 'string'
            ? hackathonError
            : 'Please refresh the page and try again.'}
        </p>
      </div>
    );
  }

  const getButtonText = () => {
    if (hackathon?.status === 'ARCHIVED') return 'Hackathon Archived';
    if (hackathon?.status === 'CANCELLED') return 'Hackathon Cancelled';
    if (isEnded) return 'Submissions Closed';
    if (isNotStarted) return 'Hackathon Not Started';
    if (!isParticipant) return 'Join to Submit';
    return 'Submit Now';
  };

  // "Closed" = the hackathon itself can't take submissions (ended / not yet
  // started / archived / cancelled). NOT being a participant is NOT closed —
  // that's an actionable "join first" state, handled separately below.
  const isClosed =
    isEnded ||
    isNotStarted ||
    ['ARCHIVED', 'CANCELLED'].includes(hackathon?.status || '');

  return (
    <div className='overflow-hidden rounded-2xl border border-white/5 bg-linear-to-b from-[#1C1D1B] to-[#07090E]'>
      <div className='flex flex-wrap items-center gap-2 border-b border-white/5 px-5 py-4'>
        <Badge
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isLive
              ? 'bg-primary text-background'
              : 'bg-gray-700/10 text-gray-400'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-primary animate-pulse' : 'bg-gray-500'}`}
          />
          <Flower size={12} />
          {isLive ? 'Live' : (hackathon?.status ?? 'Upcoming')}
        </Badge>
        <ExtendedBadge
          submissionDeadline={hackathon?.submissionDeadline}
          submissionDeadlineOriginal={hackathon?.submissionDeadlineOriginal}
        />
        {categories.slice(0, 3).map(cat => (
          <Badge
            key={cat}
            className='bg-primary/10 border-primary/20 text-primary rounded-full border px-3 py-1 text-xs font-medium'
          >
            {cat}
          </Badge>
        ))}
      </div>

      <div className='p-5'>
        <div className='mb-5 flex items-center gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20'>
            <Image
              src='/assets/usdc.svg'
              width={20}
              height={20}
              alt=''
              className='h-10 w-10'
            />
          </div>
          <div>
            <p className='text-[11px] font-semibold tracking-widest text-gray-500 uppercase'>
              Total Prize Pool
            </p>
            <p className='text-2xl leading-tight font-bold text-white'>
              {totalPool.toLocaleString()}{' '}
              <span className='font-medium text-gray-400'>{currency}</span>
            </p>
          </div>
        </div>

        {hackathon &&
          tiers.length > 0 &&
          (() => {
            const ordinal = (i: number) =>
              `${i + 1}${['st', 'nd', 'rd'][i] ?? 'th'}`;
            const overallTiers = tiers.filter(
              t => !t.kind || t.kind === 'OVERALL'
            );
            const trackTiers = tiers.filter(t => t.kind === 'TRACK');
            // Group track placements under their track so each track shows its
            // own placement ladder, instead of interleaving them as flat dots.
            const order: string[] = [];
            const byTrack = new Map<string, typeof trackTiers>();
            for (const t of trackTiers) {
              const key = t.trackId ?? 'untracked';
              if (!byTrack.has(key)) {
                byTrack.set(key, []);
                order.push(key);
              }
              byTrack.get(key)!.push(t);
            }
            return (
              <div className='mb-5 space-y-4'>
                {overallTiers.length > 0 && (
                  <div className='relative ml-1'>
                    <div className='bg-primary/30 absolute top-2 bottom-2 left-[5px] w-[2px]' />
                    <div className='flex flex-col gap-3'>
                      {overallTiers.map((tier, i) => (
                        <div
                          key={tier.id ?? `o-${i}`}
                          className='flex items-start gap-4'
                        >
                          <span className='bg-primary relative z-10 mt-[5px] h-3 w-3 shrink-0 rounded-full ring-4 ring-[#11230F]' />
                          <div>
                            <p className='text-xs text-gray-500'>
                              {tier.name ?? `${ordinal(i)} Place`}
                            </p>
                            <p className='text-base font-bold text-white'>
                              {Number(tier.prizeAmount ?? 0).toLocaleString()}{' '}
                              <span className='font-medium text-gray-400'>
                                {tier.currency ?? currency}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.length > 0 && (
                  <div className='space-y-2.5'>
                    <p className='text-primary/80 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase'>
                      Track Prizes
                    </p>
                    {order.map(trackId => {
                      const placements = byTrack.get(trackId)!;
                      const track =
                        trackId !== 'untracked'
                          ? trackById.get(trackId)
                          : undefined;
                      const single = placements.length === 1;
                      return (
                        <div
                          key={trackId}
                          className='rounded-lg border border-white/5 bg-white/[0.02] p-3'
                        >
                          <p className='mb-2 truncate text-xs font-semibold text-gray-200'>
                            {track?.name ?? placements[0]?.name ?? 'Track'}
                          </p>
                          <div className='space-y-1.5'>
                            {placements.map((pl, pi) => (
                              <div
                                key={pl.id ?? `${trackId}-${pi}`}
                                className='flex items-center justify-between gap-2'
                              >
                                <span className='text-[11px] text-gray-500'>
                                  {single ? 'Winner' : `${ordinal(pi)} place`}
                                </span>
                                <span className='text-sm font-bold text-white'>
                                  {Number(pl.prizeAmount ?? 0).toLocaleString()}{' '}
                                  <span className='text-[11px] font-medium text-gray-400'>
                                    {pl.currency ?? currency}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        <div className='mb-5 flex items-stretch gap-0 overflow-hidden rounded-xl border border-[#252628] bg-[#191B1E]'>
          <div className='flex flex-1 flex-col gap-0.5 px-4 py-3'>
            <p className='text-[10px] font-semibold tracking-widest text-gray-500 uppercase'>
              Ends In
            </p>
            <div className='flex items-center gap-2 text-white'>
              <Clock className='h-4 w-4 text-gray-400' />
              <span className='text-xs font-semibold tabular-nums'>
                {String(timeLeft.d).padStart(2, '0')}d :{' '}
                {String(timeLeft.h).padStart(2, '0')}h :{' '}
                {String(timeLeft.m).padStart(2, '0')}m :{' '}
                {String(timeLeft.s).padStart(2, '0')}s
              </span>
            </div>
          </div>
          <div className='w-px self-stretch bg-white/5' />
          <div className='flex flex-1 flex-col gap-0.5 px-4 py-3'>
            <p className='text-[10px] font-semibold tracking-widest text-gray-500 uppercase'>
              Submissions
            </p>
            <div className='flex items-center gap-2 text-white'>
              <Briefcase className='h-4 w-4 text-gray-400' />
              <span className='text-sm font-semibold tabular-nums'>
                {hackathon?._count.submissions ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Once the user has a submission, the new "Your Submission" panel
            above carries the View / Edit affordances. Showing "Submit Now"
            here on top of that is redundant and confusing — we only keep the
            CTA to communicate closed/ended states for participants who
            haven't submitted.

            For an authenticated user with submissions open we render a real
            <Link target="_blank"> instead of a router.push handler. The
            submit page does a fair amount of synchronous work on mount
            (auth, hackathon, my-submission, my-team) and the perceived
            delay was hurting the click; opening in a new tab keeps the
            current page responsive while the form loads. Unauthenticated
            users still get the button so the auth modal can intercept
            in place. */}
        {!hasSubmitted &&
          (isClosed ? (
            // Non-actionable status (ended / not started / archived / cancelled).
            <BoundlessButton
              className='h-12 w-full cursor-not-allowed rounded-xl bg-gray-800 text-sm font-bold text-gray-500'
              disabled
              fullWidth
            >
              {getButtonText()}
            </BoundlessButton>
          ) : !isParticipant ? (
            // Open, but the viewer hasn't joined — JOIN first (auth-gated).
            <BoundlessButton
              className='group bg-primary hover:bg-primary/90 h-12 w-full rounded-xl text-sm font-bold text-black transition-all'
              onClick={handleJoinToSubmit}
              loading={joinMutation.isPending}
              iconPosition='right'
              fullWidth
              icon={<UserPlus className='h-4 w-4' />}
            >
              {getButtonText()}
            </BoundlessButton>
          ) : (
            // Participant + open — go to the submit form.
            <Link
              href={`/hackathons/${slug}/submit`}
              target='_blank'
              rel='noopener noreferrer'
              prefetch
              className='group bg-primary hover:bg-primary/90 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-black transition-all'
            >
              {getButtonText()}
              <ChevronRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
            </Link>
          ))}
      </div>

      <RegistrationQuestionsDialog
        open={regDialogOpen}
        onOpenChange={setRegDialogOpen}
        questions={registrationQuestions}
        submitting={joinMutation.isPending}
        onSubmit={handleRegisterSubmit}
      />
    </div>
  );
}
