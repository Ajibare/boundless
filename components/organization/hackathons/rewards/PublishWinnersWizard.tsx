'use client';

import React, { useState, useMemo } from 'react';
import { X, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Submission } from './types';
import { PrizeTier } from '@/components/organization/hackathons/new/tabs/schemas/rewardsSchema';
import { useWizardSteps } from '@/hooks/use-wizard-steps';
import { usePublishWinners } from '@/hooks/use-publish-winners';
import { AnnouncementStep } from './AnnouncementStep';
import { PreviewStep } from './PreviewStep';
import { WizardStepIndicator } from './WizardStepIndicator';
import { WizardFooter } from './WizardFooter';
import RewardPayoutProgressModal from './RewardPayoutProgressModal';

interface PublishWinnersWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissions: Submission[];
  prizeTiers: PrizeTier[];
  organizationId: string;
  hackathonId: string;
  onSuccess?: () => void;
}

export default function PublishWinnersWizard({
  open,
  onOpenChange,
  submissions,
  prizeTiers,
  organizationId,
  hackathonId,
  onSuccess,
}: PublishWinnersWizardProps) {
  // `maxRank` only counts OVERALL slots — track tiers don't have
  // numeric ranks. The previous code used `prizeTiers.length`, which
  // over-counted by the number of track tiers and could let a phantom
  // overall rank slip through.
  const maxRank = useMemo(
    () => prizeTiers.filter(t => !t.kind || t.kind === 'OVERALL').length,
    [prizeTiers]
  );

  // Include both overall winners (rank-keyed) AND track winners
  // (flagged by `isTrackWinner` via useHackathonRewards). The BE
  // trigger endpoint resolves the actual payout list itself; this
  // array only drives the preview UI.
  const winners = useMemo(
    () =>
      submissions.filter(
        s =>
          (s.rank !== undefined && s.rank !== null && s.rank <= maxRank) ||
          s.isTrackWinner
      ),
    [submissions, maxRank]
  );

  const [announcement, setAnnouncement] = useState('');
  // Drives the on-chain payout progress modal once the organizer commits.
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const {
    currentStep,
    setCurrentStep,
    stepsToShow,
    currentStepIndex,
    handleNext,
    handleBack,
  } = useWizardSteps({ open });

  const {
    isPublishing,
    publishWinners,
    phase,
    txHash,
    isCompleted,
    isFailed,
    error,
    reset,
  } = usePublishWinners({
    winners,
    prizeTiers,
    organizationId,
    hackathonId,
    announcement,
    // Fire the page's refetch on completion. The wizard + modal stay open
    // so the organizer sees the success state, then close on dismiss.
    onSuccess,
  });

  const handlePublish = async () => {
    setIsPayoutModalOpen(true);
    try {
      await publishWinners();
    } catch {
      // Pre-flight validation (missing wallet, no eligible winners, etc.)
      // throws before the on-chain runner starts, so the runner phase stays
      // `idle`. A toast already explained the problem — close the modal so it
      // doesn't hang on a step list that will never advance.
      setIsPayoutModalOpen(false);
      reset();
    }
  };

  const handlePayoutClose = () => {
    setIsPayoutModalOpen(false);
    reset();
    // A settled payout (success or aborted failure) closes the wizard too.
    onOpenChange(false);
  };

  const handlePayoutRetry = async () => {
    reset();
    try {
      await publishWinners();
    } catch {
      setIsPayoutModalOpen(false);
      reset();
    }
  };

  const canGoNext = true;

  const mappedPrizeTiers = useMemo(
    () =>
      prizeTiers.map(tier => ({
        rank: tier.rank,
        prizeAmount: tier.prizeAmount,
        currency: tier.currency,
        place: tier.place,
        kind: tier.kind,
        trackId: tier.trackId,
      })),
    [prizeTiers]
  );

  // Format the prize for a given rank-based tier slot (overall). Track
  // winners look up their prize via tier.trackId in WinnersGrid
  // instead; this helper stays focused on overall placements so the
  // preview's existing flow doesn't get gnarlier than needed.
  const getPrizeForRank = (rank: number) => {
    const tier = mappedPrizeTiers.find(
      t => (!t.kind || t.kind === 'OVERALL') && t.rank === rank
    );
    if (tier) {
      const amount = parseFloat(tier.prizeAmount || '0').toLocaleString(
        'en-US'
      );
      const currency = tier.currency || 'USDC';
      return { amount, currency, label: `${amount} ${currency}` };
    }
    return { amount: '0', currency: 'USDC', label: 'No prize configured' };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className='bg-background-card max-w-2xl! border-gray-900 p-0'
          showCloseButton={false}
        >
          <DialogHeader className='flex flex-row items-center gap-3 border-b border-gray-900 px-5 py-3'>
            <Megaphone className='h-4 w-4 text-white' />
            <DialogTitle className='text-sm font-semibold text-white'>
              Reward Winners
            </DialogTitle>
            <DialogClose asChild>
              <button className='ml-auto text-gray-400 transition-colors hover:text-white'>
                <X className='h-4 w-4' />
              </button>
            </DialogClose>
          </DialogHeader>

          <WizardStepIndicator
            steps={stepsToShow}
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
          />

          <div className='max-h-[65vh] overflow-y-auto px-5 py-4'>
            {currentStep === 'announcement' && (
              <AnnouncementStep
                announcement={announcement}
                onAnnouncementChange={setAnnouncement}
              />
            )}

            {currentStep === 'preview' && (
              <PreviewStep
                winners={winners}
                prizeTiers={mappedPrizeTiers}
                announcement={announcement}
                onEditAnnouncement={() => setCurrentStep('announcement')}
                getPrizeForRank={getPrizeForRank}
              />
            )}
          </div>

          <WizardFooter
            currentStepIndex={currentStepIndex}
            totalSteps={stepsToShow.length}
            isPublishing={isPublishing}
            canGoNext={canGoNext}
            onCancel={() => onOpenChange(false)}
            onBack={handleBack}
            onNext={handleNext}
            onPublish={handlePublish}
          />
        </DialogContent>
      </Dialog>

      <RewardPayoutProgressModal
        open={isPayoutModalOpen}
        phase={phase}
        txHash={txHash}
        error={error}
        isCompleted={isCompleted}
        isFailed={isFailed}
        fundingMode='MANAGED'
        onClose={handlePayoutClose}
        onRetry={handlePayoutRetry}
      />
    </>
  );
}
