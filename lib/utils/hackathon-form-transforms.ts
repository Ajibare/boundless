import type { HackathonDraft } from '@/features/hackathons';
import { InfoFormData } from '@/components/organization/hackathons/new/tabs/schemas/infoSchema';
import { TimelineFormData } from '@/components/organization/hackathons/new/tabs/schemas/timelineSchema';
import { ParticipantFormData } from '@/components/organization/hackathons/new/tabs/schemas/participantSchema';
import { RewardsFormData } from '@/components/organization/hackathons/new/tabs/schemas/rewardsSchema';
import { ResourcesFormData } from '@/components/organization/hackathons/new/tabs/schemas/resourcesSchema';
import { JudgingFormData } from '@/components/organization/hackathons/new/tabs/schemas/judgingSchema';
import { CollaborationFormData } from '@/components/organization/hackathons/new/tabs/schemas/collaborationSchema';

/**
 * Hydrate the wizard form state from a saved draft.
 *
 * The backend persists and returns each section FLAT (the generated
 * HackathonDraftData shape): `information.venueType`, `participation.require_*`
 * and `participation.*Tab`, `judging.criteria[].name`, `collaboration
 * .sponsorsPartners[].{name,logo,link}`. Read those fields directly. (An earlier
 * version read a nested shape - `venue.type`, `submissionRequirements.*`,
 * `tabVisibility.*` - that the response never carried, so on resume venue
 * fields, submission requirements and tab visibility silently reset to
 * defaults.)
 */
export const transformFromApiFormat = (draft: HackathonDraft) => {
  const info = draft.data?.information;
  const timeline = draft.data?.timeline;
  const participation = draft.data?.participation;
  const tracks = draft.data?.tracks;
  const rewards = draft.data?.rewards;
  const resources = draft.data?.resources;
  const judging = draft.data?.judging;
  const collaboration = draft.data?.collaboration;

  const categoriesArray: string[] = info?.categories ? info.categories : [];

  return {
    information: {
      name: info?.name || '',
      banner: info?.banner || '',
      description: info?.description || '',
      tagline: info?.tagline || '',
      categories: categoriesArray,
      venueType: info?.venueType || 'virtual',
      country: info?.country || '',
      state: info?.state || '',
      city: info?.city || '',
      venueName: info?.venueName || '',
      venueAddress: info?.venueAddress || '',
    } as InfoFormData,
    timeline: {
      startDate: timeline?.startDate ? new Date(timeline.startDate) : undefined,
      submissionDeadline: timeline?.submissionDeadline
        ? new Date(timeline.submissionDeadline)
        : undefined,
      timezone: timeline?.timezone || 'UTC',
      registrationDeadline: timeline?.registrationDeadline
        ? new Date(timeline.registrationDeadline)
        : undefined,
      judgingDeadline: timeline?.judgingDeadline
        ? new Date(timeline.judgingDeadline)
        : undefined,
      phases:
        timeline?.phases?.map(phase => ({
          name: phase.name,
          startDate: new Date(phase.startDate),
          endDate: new Date(phase.endDate),
          description: phase.description || '',
        })) || [],
    } as TimelineFormData,
    participation: {
      participantType: participation?.participantType || 'individual',
      teamMin: participation?.teamMin,
      teamMax: participation?.teamMax,
      maxParticipants: participation?.maxParticipants,
      require_github: participation?.require_github ?? false,
      require_demo_video: participation?.require_demo_video ?? false,
      require_other_links: participation?.require_other_links ?? false,
      // `?? true` (not `|| true`): preserve a tab the organizer explicitly
      // disabled (false) instead of forcing it back on.
      detailsTab: participation?.detailsTab ?? true,
      participantsTab: participation?.participantsTab ?? true,
      resourcesTab: participation?.resourcesTab ?? true,
      submissionTab: participation?.submissionTab ?? true,
      announcementsTab: participation?.announcementsTab ?? true,
      discussionTab: participation?.discussionTab ?? true,
      winnersTab: participation?.winnersTab ?? true,
      sponsorsTab: participation?.sponsorsTab ?? true,
      joinATeamTab: participation?.joinATeamTab ?? true,
      rulesTab: participation?.rulesTab ?? true,
    } as ParticipantFormData,
    tracks: {
      // Always present (DB default 3) so the Tracks section round-trips the cap
      // independent of whether any prize has been set yet.
      tracksMaxPerSubmission: tracks?.tracksMaxPerSubmission ?? 3,
    },
    rewards: {
      prizeTiers:
        rewards?.prizeTiers?.map((tier, index) => {
          const defaultPassMarks = [80, 70, 50, 40, 30];
          const passMark =
            tier.passMark != null && tier.passMark >= 0 && tier.passMark <= 100
              ? tier.passMark
              : (defaultPassMarks[index] ?? 50);
          return {
            id: tier.id ?? `tier-${index}`,
            place:
              tier.place ||
              `${index + 1}${['st', 'nd', 'rd'][index] ?? 'th'} Place`,
            prizeAmount: tier.prizeAmount ?? '0',
            currency: tier.currency || 'USDC',
            description: tier.description || '',
            rank: index + 1,
            passMark,
          };
        }) || [],
    } as RewardsFormData,
    resources: {
      resources:
        resources?.resources?.map((resource, index) => ({
          id: resource.id ?? `resource-${index}`,
          link: resource.link || '',
          description: resource.description || '',
          file: resource.file?.url
            ? {
                url: resource.file?.url || '',
                name: resource.file?.name || '',
              }
            : undefined,
        })) || [],
    } as ResourcesFormData,
    judging: {
      criteria:
        judging?.criteria?.map((criterion, index) => ({
          id: criterion.id ?? `criterion-${index}`,
          name: (criterion.name || '').trim() || `Criterion ${index + 1}`,
          weight: typeof criterion.weight === 'number' ? criterion.weight : 0,
          description: criterion.description || '',
        })) || [],
    } as JudgingFormData,
    collaboration: {
      contactEmail: collaboration?.contactEmail || '',
      telegram: collaboration?.telegram || '',
      discord: collaboration?.discord || '',
      socialLinks: collaboration?.socialLinks || [],
      sponsorsPartners:
        collaboration?.sponsorsPartners?.map((sp, i) => ({
          id:
            sp.id ||
            (typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `sponsor-${i}`),
          name: sp.name ?? '',
          logo: sp.logo ?? '',
          link: sp.link ?? '',
        })) || [],
    } as CollaborationFormData,
  };
};
