import type { StepKey } from '@/components/organization/hackathons/new/constants';
import type { InfoFormData } from '@/components/organization/hackathons/new/tabs/schemas/infoSchema';
import type { TimelineFormData } from '@/components/organization/hackathons/new/tabs/schemas/timelineSchema';
import type { ParticipantFormData } from '@/components/organization/hackathons/new/tabs/schemas/participantSchema';
import type { RewardsFormData } from '@/components/organization/hackathons/new/tabs/schemas/rewardsSchema';
import type { ResourcesFormData } from '@/components/organization/hackathons/new/tabs/schemas/resourcesSchema';
import type { JudgingFormData } from '@/components/organization/hackathons/new/tabs/schemas/judgingSchema';
import type { CollaborationFormData } from '@/components/organization/hackathons/new/tabs/schemas/collaborationSchema';

interface StepData {
  information?: InfoFormData;
  timeline?: TimelineFormData;
  participation?: ParticipantFormData;
  rewards?: RewardsFormData;
  resources?: ResourcesFormData;
  judging?: JudgingFormData;
  collaboration?: CollaborationFormData;
}

/**
 * Checks if a step has meaningful data in the transformed form data.
 */
export const isStepDataValid = (
  stepKey: StepKey,
  formData: StepData
): boolean => {
  // Tracks (a default "All Submissions" track always exists) and custom
  // questions are optional, so neither section blocks navigation or publish.
  // Treat them as always valid.
  if (stepKey === 'tracks' || stepKey === 'custom-questions') return true;

  const stepData = formData[stepKey as keyof StepData];
  if (!stepData) return false;

  switch (stepKey) {
    case 'information': {
      const info = stepData as InfoFormData;
      // Check if required fields have actual values (not empty strings)
      return !!(
        info.name?.trim() &&
        info.banner?.trim() &&
        info.description?.trim()
      );
    }
    case 'timeline': {
      const timeline = stepData as TimelineFormData;
      return !!(
        timeline.startDate &&
        timeline.submissionDeadline &&
        timeline.timezone
      );
    }
    case 'participation': {
      const participation = stepData as ParticipantFormData;
      // Participation always has a default participantType from transformFromApiFormat.
      // For team types, we can check if team constraints exist.
      // For individual type, we check if participantType exists (it always will from transform).
      if (
        participation.participantType === 'team' ||
        participation.participantType === 'team_or_individual'
      ) {
        return !!(participation.teamMin && participation.teamMax);
      }
      // For individual, we assume it's valid if participantType exists
      // (though this may not be 100% accurate due to transform defaults)
      return !!participation.participantType;
    }
    case 'rewards': {
      const rewards = stepData as RewardsFormData;
      // Check if there's at least one prize tier with actual data
      return !!(
        rewards.prizeTiers &&
        rewards.prizeTiers.length > 0 &&
        rewards.prizeTiers.some(
          tier => tier.place?.trim() && tier.prizeAmount?.trim()
        )
      );
    }
    case 'resources': {
      const resources = stepData as ResourcesFormData;
      // Resources are optional, so return true if resources array exists
      // (even if empty, since it's optional)
      return resources.resources !== undefined;
    }
    case 'judging': {
      const judging = stepData as JudgingFormData;
      // Check if there's at least one criterion with actual data
      return !!(
        judging.criteria &&
        judging.criteria.length > 0 &&
        judging.criteria.some(criterion => criterion.name?.trim())
      );
    }
    case 'collaboration': {
      const collaboration = stepData as CollaborationFormData;
      // Check if required contact email exists and is valid
      return !!(
        collaboration.contactEmail?.trim() &&
        collaboration.contactEmail.includes('@')
      );
    }
    default:
      return false;
  }
};
