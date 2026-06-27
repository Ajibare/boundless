'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { uploadMilestoneDocuments } from '@/lib/api/upload';
import {
  useCampaign,
  useSubmitMilestoneEvidence,
} from '@/features/crowdfunding';
import { MilestoneDetailHeader } from '@/components/crowdfunding/milestone-detail-header';
import { MilestoneDetailInfo } from '@/components/crowdfunding/milestone-detail-info';
import { MilestoneDetailDescription } from '@/components/crowdfunding/milestone-detail-description';
import { MilestoneSubmitForm } from '@/components/crowdfunding/MilestoneSubmitForm';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ slug: string; milestoneIndex: string }>;
}

export default function MilestoneDetailPage({ params }: PageProps) {
  const { slug, milestoneIndex: milestoneParam } = use(params);

  const router = useRouter();
  const { data: campaign, isLoading, error } = useCampaign(slug);

  const milestones = campaign?.milestones ?? [];
  let milestone = milestones.find(m => m.id === milestoneParam) ?? null;
  let milestoneIndex = milestones.findIndex(m => m.id === milestoneParam);
  if (!milestone && /^\d+$/.test(milestoneParam)) {
    milestoneIndex = Number(milestoneParam);
    milestone = milestones[milestoneIndex] ?? null;
  }
  const campaignId = campaign?.id ?? '';

  const submitEvidence = useSubmitMilestoneEvidence(campaignId);

  const handleSubmitEvidence = async (formData: {
    submissionNotes: string;
    proofOfWorkLinks: string[];
    documents: File[];
  }) => {
    if (!campaign || !milestone?.id) return;

    let documentUrls: string[] = [];
    if (formData.documents.length > 0) {
      toast.loading(`Uploading ${formData.documents.length} file(s)...`);
      const uploadResult = await uploadMilestoneDocuments(
        formData.documents,
        campaign.slug,
        milestoneIndex
      );
      if (uploadResult.success) {
        documentUrls = uploadResult.data.map(
          (f: { secure_url: string }) => f.secure_url
        );
        toast.success('Files uploaded');
      } else {
        toast.error('Failed to upload documents');
        return;
      }
    }

    submitEvidence.mutate(
      {
        milestoneId: milestone.id,
        submissionNotes: formData.submissionNotes,
        proofOfWorkLinks: formData.proofOfWorkLinks,
        proofOfWorkFiles: documentUrls,
      },
      {
        onSuccess: () => {
          toast.success(
            'Evidence submitted. The team will review your submission.'
          );
          router.push(`/me/crowdfunding/${campaign!.slug}/milestones`);
        },
        onError: err => {
          toast.error(
            err instanceof Error ? err.message : 'Failed to submit evidence'
          );
        },
      }
    );
  };

  if (isLoading) {
    return <div className='py-12 text-center text-zinc-500'>Loading...</div>;
  }

  if (error || !campaign || !milestone) {
    return (
      <div className='py-12 text-center text-zinc-500'>
        Milestone not found.
      </div>
    );
  }

  const reviewStatus = milestone.reviewStatus?.toLowerCase();
  const canSubmit =
    reviewStatus === 'pending' || reviewStatus === 'resubmission_required';
  const isInReview = reviewStatus === 'submitted';
  const isRejected =
    reviewStatus === 'rejected' || reviewStatus === 'resubmission_required';
  const isApproved = reviewStatus === 'approved';

  const milestoneNumber = milestoneIndex + 1;
  const totalMilestones = milestones.length;

  const submittedLinks = milestone.proofOfWorkLinks ?? [];
  const submittedFiles = milestone.proofOfWorkFiles ?? [];
  const submittedNotes = milestone.submissionNotes ?? '';

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <MilestoneDetailHeader
        milestone={milestone}
        milestoneNumber={milestoneNumber}
        totalMilestones={totalMilestones}
        campaignTitle={campaign.project.title}
        backLink={`/me/crowdfunding/${campaign.slug}/milestones`}
      />

      <MilestoneDetailInfo milestone={milestone} campaign={campaign} />

      <MilestoneDetailDescription
        content={milestone.description || ''}
        title='What needs to be delivered'
      />

      {/* Rejection feedback */}
      {isRejected && (
        <div className='space-y-3 rounded-xl border border-amber-800/50 bg-amber-950/20 p-5'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='h-4 w-4 flex-shrink-0 text-amber-400' />
            <p className='text-sm font-semibold text-amber-300'>
              {reviewStatus === 'resubmission_required'
                ? 'Resubmission required'
                : 'Submission not accepted'}
            </p>
          </div>
          {milestone.rejectionFeedback ? (
            <p className='text-sm leading-relaxed text-amber-200/80'>
              {milestone.rejectionFeedback}
            </p>
          ) : (
            <p className='text-sm text-amber-200/60'>
              The review team has requested changes. Update your evidence below
              and resubmit.
            </p>
          )}
          {milestone.resubmissionDeadline && (
            <p className='text-xs text-amber-400/70'>
              Resubmit by:{' '}
              {new Date(milestone.resubmissionDeadline).toLocaleDateString(
                'en-US',
                { month: 'long', day: 'numeric', year: 'numeric' }
              )}
            </p>
          )}
        </div>
      )}

      {/* In-review: show what was submitted */}
      {isInReview && (
        <div className='space-y-4 rounded-xl border border-blue-800/40 bg-blue-950/15 p-5'>
          <div className='flex items-center gap-2'>
            <Clock className='h-4 w-4 text-blue-400' />
            <p className='text-sm font-semibold text-blue-300'>
              Under review — submission received
            </p>
          </div>
          <p className='text-xs text-blue-200/60'>
            The Boundless team is reviewing your evidence. You will be notified
            of the outcome.
          </p>

          {submittedNotes && (
            <div className='space-y-1'>
              <p className='text-xs font-medium text-zinc-400'>
                Your progress notes
              </p>
              <p className='rounded-lg bg-zinc-900/60 p-3 text-sm text-zinc-300'>
                {submittedNotes}
              </p>
            </div>
          )}

          {submittedLinks.length > 0 && (
            <div className='space-y-1'>
              <p className='text-xs font-medium text-zinc-400'>
                Proof of work links
              </p>
              <div className='space-y-1.5'>
                {submittedLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target='_blank'
                    rel='noreferrer'
                    className='flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300'
                  >
                    <ExternalLink className='h-3.5 w-3.5 flex-shrink-0' />
                    <span className='truncate'>{link}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {submittedFiles.length > 0 && (
            <div className='space-y-1'>
              <p className='text-xs font-medium text-zinc-400'>
                Supporting files
              </p>
              <div className='space-y-1.5'>
                {submittedFiles.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target='_blank'
                    rel='noreferrer'
                    className='flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300'
                  >
                    <FileText className='h-3.5 w-3.5 flex-shrink-0' />
                    <span className='truncate'>File {i + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence submission form */}
      {canSubmit && (
        <MilestoneSubmitForm
          milestoneName={milestone.title || milestone.name}
          isSubmitting={submitEvidence.isPending}
          onSubmit={handleSubmitEvidence}
        />
      )}

      {/* Approved: payout released by Boundless team */}
      {isApproved && (
        <div className='rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-6'>
          <div className='flex items-start gap-3'>
            <CheckCircle2 className='mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400' />
            <div>
              <h3 className='text-base font-semibold text-emerald-300'>
                Milestone approved
              </h3>
              <p className='mt-1 text-sm text-emerald-200/70'>
                Approved. The Boundless team will release the payout to your
                wallet. No action needed on your part.
              </p>
              {milestone.amount != null && (
                <p className='mt-3 text-xl font-bold text-white'>
                  ${milestone.amount.toLocaleString()} USDC
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
