import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { transformFromApiFormat } from '@/lib/utils/hackathon-form-transforms';
import type { InfoFormData } from '@/components/organization/hackathons/new/tabs/schemas/infoSchema';
import type { TimelineFormData } from '@/components/organization/hackathons/new/tabs/schemas/timelineSchema';
import type { ParticipantFormData } from '@/components/organization/hackathons/new/tabs/schemas/participantSchema';
import type { RewardsFormData } from '@/components/organization/hackathons/new/tabs/schemas/rewardsSchema';
import type { ResourcesFormData } from '@/components/organization/hackathons/new/tabs/schemas/resourcesSchema';
import type { JudgingFormData } from '@/components/organization/hackathons/new/tabs/schemas/judgingSchema';
import type { CollaborationFormData } from '@/components/organization/hackathons/new/tabs/schemas/collaborationSchema';
import {
  type StepKey,
  STEP_ORDER,
} from '@/components/organization/hackathons/new/constants';
import { isStepDataValid } from '@/lib/utils/hackathon-step-validation';
import {
  DRAFT_SECTIONS,
  useCreateDraft,
  useDraft,
  useUpdateDraft,
  type UpdateHackathonDraftBody,
} from '@/features/hackathons';

interface StepData {
  information?: InfoFormData;
  timeline?: TimelineFormData;
  participation?: ParticipantFormData;
  tracks?: { tracksMaxPerSubmission?: number };
  rewards?: RewardsFormData;
  resources?: ResourcesFormData;
  judging?: JudgingFormData;
  collaboration?: CollaborationFormData;
}

interface UseHackathonDraftProps {
  organizationId?: string;
  initialDraftId?: string;
  onDraftLoaded?: (formData: StepData, firstIncompleteStep: StepKey) => void;
}

/**
 * Wizard draft orchestration on React Query. Loads an existing draft (resume
 * flow) via `useDraft`, creates on first save via `useCreateDraft`, and persists
 * sections through the single flat `useUpdateDraft` PATCH (one section for a
 * per-step Continue, several for Save draft). Server state lives in the query
 * cache; only the in-progress form snapshot is local.
 */
export const useHackathonDraft = ({
  organizationId,
  initialDraftId,
  onDraftLoaded,
}: UseHackathonDraftProps) => {
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [stepData, setStepData] = useState<StepData>({});
  // Fires onDraftLoaded once per resumed draft id.
  const loadedRef = useRef<string | null>(null);

  const orgId = organizationId ?? '';
  // Only fetch for the resume flow (an initial draft id in the URL). Fresh
  // drafts keep their form state locally until the first save.
  const draftQuery = useDraft(orgId, initialDraftId);
  const createDraft = useCreateDraft(orgId);
  const updateDraft = useUpdateDraft(orgId);

  useEffect(() => {
    const draft = draftQuery.data;
    if (!draft || !initialDraftId || draft.id !== initialDraftId) return;
    if (loadedRef.current === draft.id) return;
    loadedRef.current = draft.id;

    const formData = transformFromApiFormat(draft);
    setStepData(formData);
    if (!draftId) setDraftId(draft.id);

    const firstIncompleteStep =
      STEP_ORDER.find(key => !isStepDataValid(key, formData)) ?? 'review';
    onDraftLoaded?.(formData, firstIncompleteStep);
  }, [draftQuery.data, initialDraftId, draftId, onDraftLoaded]);

  /** Resolve the draft id, creating an empty draft on first use. */
  const ensureDraftId = async (): Promise<string> => {
    if (draftId) return draftId;
    const draft = await createDraft.mutateAsync();
    setDraftId(draft.id);
    return draft.id;
  };

  const saveDraft = async () => {
    if (!organizationId) {
      toast.error('Organization ID is required');
      return;
    }
    try {
      const id = await ensureDraftId();
      const body = {} as UpdateHackathonDraftBody;
      for (const section of DRAFT_SECTIONS) {
        const value = stepData[section];
        if (value !== undefined) {
          (body as Record<string, unknown>)[section] = value;
        }
      }
      if (Object.keys(body).length > 0) {
        await updateDraft.mutateAsync({ id, body });
      }
      toast.success('Draft saved successfully');
    } catch {
      toast.error('Failed to save draft');
      throw new Error('Failed to save draft');
    }
  };

  const saveStep = async (
    stepKey: StepKey,
    data:
      | InfoFormData
      | TimelineFormData
      | ParticipantFormData
      | RewardsFormData
      | ResourcesFormData
      | JudgingFormData
      | CollaborationFormData
  ) => {
    if (!organizationId) {
      toast.error('Organization ID is required');
      return;
    }

    const id = await ensureDraftId();
    await updateDraft.mutateAsync({
      id,
      body: { [stepKey]: data } as UpdateHackathonDraftBody,
    });

    const updatedStepData = { ...stepData, [stepKey]: data };
    setStepData(updatedStepData);
    return updatedStepData;
  };

  return {
    draftId,
    /** Server-side draft status ('DRAFT' | 'DRAFT_AWAITING_FUNDING'); undefined for an unsaved /new draft. */
    draftStatus: draftQuery.data?.status,
    stepData,
    setStepData,
    isLoadingDraft: Boolean(initialDraftId) && draftQuery.isLoading,
    currentError:
      initialDraftId && draftQuery.error
        ? draftQuery.error.message || 'Failed to load draft'
        : null,
    isSavingDraft: createDraft.isPending || updateDraft.isPending,
    saveDraft,
    saveStep,
  };
};
