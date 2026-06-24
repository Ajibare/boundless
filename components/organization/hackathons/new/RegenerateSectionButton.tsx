'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { BoundlessButton } from '@/components/buttons';
import { ApiError } from '@/lib/api';
import {
  useDraft,
  useRegenerateDraftSection,
  type DraftRegenSection,
} from '@/features/hackathons';

interface RegenerateSectionButtonProps {
  /** Which AI section to regenerate (criteria | prizes | timeline | description). */
  section: DraftRegenSection;
  /** Apply the regenerated values (wizard section shape) to the tab's form. */
  onApply: (data: Record<string, unknown>) => void;
  label?: string;
}

/**
 * Self-contained "Regenerate with AI" button for a wizard step. Derives the org
 * + draft from the route, and renders only on AI-generated drafts (the server
 * owns the suggestion, surfaced via `draft.aiGeneration`). On success it hands
 * the regenerated section back to the tab to apply to its form.
 */
export default function RegenerateSectionButton({
  section,
  onApply,
  label = 'Regenerate with AI',
}: RegenerateSectionButtonProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const organizationId = (params?.id as string) ?? '';
  const draftId =
    (params?.draftId as string) ?? searchParams.get('draftId') ?? '';

  const { data: draft } = useDraft(organizationId, draftId || undefined);
  const regenerate = useRegenerateDraftSection(organizationId);

  // Available only on AI-generated drafts.
  if (!draftId || !draft?.aiGeneration) return null;

  const handleClick = async () => {
    try {
      const result = await regenerate.mutateAsync({
        draftId,
        body: { section },
      });
      onApply(result.data as Record<string, unknown>);
      toast.success('Section regenerated. Review the new values.');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 503) {
          toast.error('The AI assistant is busy. Try again in a moment.');
          return;
        }
        toast.error(err.message || 'Could not regenerate this section.');
        return;
      }
      toast.error('Could not regenerate this section.');
    }
  };

  return (
    <BoundlessButton
      type='button'
      variant='outline'
      size='sm'
      className='gap-2'
      loading={regenerate.isPending}
      onClick={handleClick}
    >
      <Sparkles className='h-4 w-4' />
      {label}
    </BoundlessButton>
  );
}
