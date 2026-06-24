'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeDraft,
  updateDraftStep,
  updateDraftSteps,
  getDraft,
  getDrafts,
  updateHackathon,
  getHackathon,
  deleteHackathon,
  getHackathons,
  getParticipants,
  type Hackathon,
  type HackathonDraft,
  type UpdateHackathonRequest,
  type HackathonCategory,
  type Participant,
} from '@/lib/api/hackathons';
import { useOrganization } from '@/lib/providers/OrganizationProvider';

export interface UseHackathonsOptions {
  organizationId?: string;
  autoFetch?: boolean;
  initialPage?: number;
  pageSize?: number;
  filters?: {
    status?: 'published' | 'ongoing' | 'completed' | 'cancelled';
    category?: HackathonCategory;
    search?: string;
  };
  participantFilters?: {
    status?: string;
    type?: string;
    search?: string;
  };
}

export interface UseHackathonsReturn {
  // Published Hackathons
  hackathons: Hackathon[];
  hackathonsLoading: boolean;
  hackathonsError: string | null;
  hackathonsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // Drafts
  drafts: HackathonDraft[];
  draftsLoading: boolean;
  draftsError: string | null;
  draftsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // Current Hackathon/Draft
  currentHackathon: Hackathon | null;
  currentDraft: HackathonDraft | null;
  currentLoading: boolean;
  currentError: string | null;

  // Actions - Drafts
  initializeDraftAction: (organizationId: string) => Promise<HackathonDraft>;
  updateDraftStepAction: (
    draftId: string,
    step: string,
    data: any,
    autoSave?: boolean
  ) => Promise<HackathonDraft>;
  updateDraftStepsAction: (
    draftId: string,
    steps: { step: string; data: any }[]
  ) => Promise<HackathonDraft>;
  fetchDraft: (draftId: string) => Promise<void>;
  fetchDrafts: (page?: number, limit?: number) => Promise<void>;

  updateHackathonAction: (
    hackathonId: string,
    data: UpdateHackathonRequest
  ) => Promise<Hackathon>;
  deleteHackathonAction: (hackathonId: string) => Promise<void>;
  fetchHackathon: (hackathonId: string) => Promise<void>;
  fetchHackathons: (
    page?: number,
    limit?: number,
    filters?: UseHackathonsOptions['filters']
  ) => Promise<void>;

  // Participants
  participants: Participant[];
  participantsLoading: boolean;
  participantsError: string | null;
  participantsPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  fetchParticipants: (
    hackathonId: string,
    page?: number,
    limit?: number,
    filters?: UseHackathonsOptions['participantFilters']
  ) => Promise<void>;

  // Utility
  refetchAll: () => Promise<void>;
  setCurrentHackathon: (hackathon: Hackathon | null) => void;
  setCurrentDraft: (draft: HackathonDraft | null) => void;
  organizationId: string | null;
}

const DEFAULT_FILTERS = {};
const DEFAULT_PARTICIPANT_FILTERS = {};

export function useHackathons(
  options: UseHackathonsOptions = {}
): UseHackathonsReturn {
  const {
    organizationId: providedOrgId,
    autoFetch = true,
    initialPage = 1,
    pageSize = 10,
    filters: initialFilters = DEFAULT_FILTERS,
    participantFilters: initialParticipantFilters = DEFAULT_PARTICIPANT_FILTERS,
  } = options;

  // Get organizationId from context if not provided
  const { activeOrgId } = useOrganization();
  const organizationId = providedOrgId || activeOrgId || null;

  // Published Hackathons State
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [hackathonsLoading, setHackathonsLoading] = useState(false);
  const [hackathonsError, setHackathonsError] = useState<string | null>(null);
  const [hackathonsPagination, setHackathonsPagination] = useState({
    currentPage: initialPage,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: pageSize,
    hasNext: false,
    hasPrev: false,
  });

  // Drafts State
  const [drafts, setDrafts] = useState<HackathonDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [draftsPagination, setDraftsPagination] = useState({
    currentPage: initialPage,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: pageSize,
    hasNext: false,
    hasPrev: false,
  });

  // Current Hackathon/Draft State
  const [currentHackathon, setCurrentHackathon] = useState<Hackathon | null>(
    null
  );
  const [currentDraft, setCurrentDraft] = useState<HackathonDraft | null>(null);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);

  // Participants State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(
    null
  );
  const [participantsPagination, setParticipantsPagination] = useState({
    currentPage: initialPage,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: pageSize,
    hasNext: false,
    hasPrev: false,
  });

  // Refs to prevent duplicate fetches
  const isFetchingHackathonsRef = useRef(false);
  const isFetchingDraftsRef = useRef(false);
  const isFetchingCurrentRef = useRef(false);
  const isFetchingParticipantsRef = useRef(false);

  // Refs to track current page values (to avoid closure issues)
  const hackathonsPageRef = useRef(initialPage);
  const draftsPageRef = useRef(initialPage);
  const participantsPageRef = useRef(initialPage);

  // Fetch Published Hackathons
  const fetchHackathons = useCallback(
    async (
      page?: number,
      limit?: number,
      filters?: UseHackathonsOptions['filters']
    ) => {
      if (!organizationId) {
        setHackathonsError('Organization ID is required');
        return;
      }

      if (isFetchingHackathonsRef.current) return;

      isFetchingHackathonsRef.current = true;
      setHackathonsLoading(true);
      setHackathonsError(null);

      try {
        // Use ref to get current page (always up-to-date)
        const currentPage = page ?? hackathonsPageRef.current;
        const response = await getHackathons(currentPage, limit ?? pageSize, {
          ...(filters ?? initialFilters),
          organizationId, // Add organization filter
        });

        const pagination = (response.data?.pagination ||
          response.meta?.pagination) as any;
        setHackathons(response.data?.hackathons || []);
        setHackathonsPagination({
          currentPage: pagination?.page || 1,
          totalPages: pagination?.totalPages || 1,
          totalItems: pagination?.total || 0,
          itemsPerPage: pagination?.limit || pageSize,
          hasNext: !!pagination?.hasNext,
          hasPrev: !!pagination?.hasPrev,
        });
        // Update ref immediately
        hackathonsPageRef.current = pagination?.page || 1;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch hackathons';
        setHackathonsError(errorMessage);
      } finally {
        setHackathonsLoading(false);
        isFetchingHackathonsRef.current = false;
      }
    },
    [organizationId, pageSize, initialFilters]
  );

  // Fetch Drafts
  const fetchDrafts = useCallback(
    async (page?: number, limit?: number) => {
      if (!organizationId) {
        setDraftsError('Organization ID is required');
        return;
      }

      if (isFetchingDraftsRef.current) return;

      isFetchingDraftsRef.current = true;
      setDraftsLoading(true);
      setDraftsError(null);

      try {
        // Use ref to get current page (always up-to-date)
        const currentPage = page ?? draftsPageRef.current;
        const response = await getDrafts(
          organizationId,
          currentPage,
          limit ?? pageSize
        );

        setDrafts(response.data || []);
        setDraftsPagination(
          response.meta?.pagination
            ? {
                currentPage: response.meta.pagination.page,
                totalPages: response.meta.pagination.totalPages,
                totalItems: response.meta.pagination.total,
                itemsPerPage: response.meta.pagination.limit,
                hasNext: false,
                hasPrev: false,
              }
            : {
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                itemsPerPage: pageSize,
                hasNext: false,
                hasPrev: false,
              }
        );
        // Update ref immediately
        draftsPageRef.current = response.meta?.pagination?.page || 1;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch drafts';
        setDraftsError(errorMessage);
      } finally {
        setDraftsLoading(false);
        isFetchingDraftsRef.current = false;
      }
    },
    [organizationId, pageSize]
  );

  // Fetch Single Hackathon
  const fetchHackathon = useCallback(
    async (hackathonId: string) => {
      if (!organizationId) {
        setCurrentError('Organization ID is required');
        return;
      }

      if (isFetchingCurrentRef.current) return;

      isFetchingCurrentRef.current = true;
      setCurrentLoading(true);
      setCurrentError(null);

      try {
        const response = await getHackathon(hackathonId);
        setCurrentHackathon(response.data);
        setCurrentDraft(null);
      } catch (error) {
        // The public hackathon GET 404s for non-live hackathons. Fall back to
        // the org-scoped draft GET so a hackathon mid-publish
        // (DRAFT_AWAITING_FUNDING) still renders on the management page, where
        // the publish-status banner resumes it.
        try {
          const draftRes = await getDraft(organizationId, hackathonId);
          const draft = draftRes.data;
          const mapped = {
            id: draft.id,
            name: draft.data?.information?.name || 'Untitled Hackathon',
            slug: draft.data?.information?.slug || '',
            status: draft.status,
            organizationId,
          } as unknown as Hackathon;
          setCurrentHackathon(mapped);
          setCurrentDraft(draft);
        } catch {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to fetch hackathon';
          setCurrentError(errorMessage);
        }
      } finally {
        setCurrentLoading(false);
        isFetchingCurrentRef.current = false;
      }
    },
    [organizationId]
  );

  // Fetch Single Draft
  const fetchDraft = useCallback(
    async (draftId: string) => {
      if (!organizationId) {
        setCurrentError('Organization ID is required');
        return;
      }

      if (isFetchingCurrentRef.current) return;

      isFetchingCurrentRef.current = true;
      setCurrentLoading(true);
      setCurrentError(null);

      try {
        const response = await getDraft(organizationId, draftId);
        setCurrentDraft(response.data);
        setCurrentHackathon(null);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch draft';
        setCurrentError(errorMessage);
      } finally {
        setCurrentLoading(false);
        isFetchingCurrentRef.current = false;
      }
    },
    [organizationId]
  );

  // Initialize Draft (New API)
  const initializeDraftAction = useCallback(
    async (orgId: string): Promise<HackathonDraft> => {
      setDraftsLoading(true);
      setDraftsError(null);

      try {
        const response = await initializeDraft(orgId);
        if (response.data) {
          setDrafts(prev => [response!.data, ...prev]);
          return response.data;
        } else {
          throw new Error('No draft data received');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to initialize draft';
        setDraftsError(errorMessage);
        throw error;
      } finally {
        setDraftsLoading(false);
      }
    },
    []
  );

  // Update Draft Step (New API)
  const updateDraftStepAction = useCallback(
    async (
      draftId: string,
      step: string,
      data: any,
      autoSave?: boolean
    ): Promise<HackathonDraft> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      setDraftsLoading(true);
      setDraftsError(null);

      try {
        const response = await updateDraftStep(
          organizationId,
          draftId,
          step,
          data,
          autoSave
        );
        if (response.data) {
          setDrafts(prev =>
            prev.map(draft => (draft.id === draftId ? response.data! : draft))
          );
          if (currentDraft?.id === draftId) {
            setCurrentDraft(response.data);
          }
          return response.data;
        } else {
          throw new Error('No draft data received');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update draft step';
        setDraftsError(errorMessage);
        throw error;
      } finally {
        setDraftsLoading(false);
      }
    },
    [organizationId, currentDraft]
  );

  // Update several draft steps in one transactional PATCH (New API)
  const updateDraftStepsAction = useCallback(
    async (
      draftId: string,
      steps: { step: string; data: any }[]
    ): Promise<HackathonDraft> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      setDraftsLoading(true);
      setDraftsError(null);

      try {
        const response = await updateDraftSteps(organizationId, draftId, steps);
        if (response.data) {
          setDrafts(prev =>
            prev.map(draft => (draft.id === draftId ? response.data! : draft))
          );
          if (currentDraft?.id === draftId) {
            setCurrentDraft(response.data);
          }
          return response.data;
        } else {
          throw new Error('No draft data received');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update draft steps';
        setDraftsError(errorMessage);
        throw error;
      } finally {
        setDraftsLoading(false);
      }
    },
    [organizationId, currentDraft]
  );

  // Update Hackathon
  const updateHackathonAction = useCallback(
    async (
      hackathonId: string,
      data: UpdateHackathonRequest
    ): Promise<Hackathon> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      setHackathonsLoading(true);
      setHackathonsError(null);

      try {
        const response = await updateHackathon(hackathonId, data);
        setHackathons(prev =>
          prev.map(hackathon =>
            hackathon.id === hackathonId ? response.data : hackathon
          )
        );
        if (currentHackathon?.id === hackathonId) {
          setCurrentHackathon(response.data);
        }
        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update hackathon';
        setHackathonsError(errorMessage);
        throw error;
      } finally {
        setHackathonsLoading(false);
      }
    },
    [organizationId, currentHackathon]
  );

  // Delete Hackathon
  const deleteHackathonAction = useCallback(
    async (hackathonId: string): Promise<void> => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      setHackathonsLoading(true);
      setHackathonsError(null);

      try {
        await deleteHackathon(hackathonId);
        // Remove hackathon from list
        setHackathons(prev => prev.filter(h => h.id !== hackathonId));
        // Clear current hackathon if it was deleted
        if (currentHackathon?.id === hackathonId) {
          setCurrentHackathon(null);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete hackathon';
        setHackathonsError(errorMessage);
        throw error;
      } finally {
        setHackathonsLoading(false);
      }
    },
    [organizationId, currentHackathon]
  );

  // Fetch Participants
  const fetchParticipants = useCallback(
    async (
      hackathonId: string,
      page?: number,
      limit?: number,
      filters?: UseHackathonsOptions['participantFilters']
    ) => {
      if (!organizationId) {
        setParticipantsError('Organization ID is required');
        return;
      }

      if (isFetchingParticipantsRef.current) return;

      isFetchingParticipantsRef.current = true;
      setParticipantsLoading(true);
      setParticipantsError(null);

      try {
        const currentPage = page ?? participantsPageRef.current;
        const response = await getParticipants(
          organizationId,
          hackathonId,
          currentPage,
          limit ?? pageSize,
          filters ?? initialParticipantFilters
        );

        const pagination = (response.data?.pagination ||
          response.meta?.pagination) as any;
        const responsePage = pagination?.page || 1;
        const totalItems = pagination?.total || 0;
        const itemsPerPage = pagination?.limit || pageSize;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        setParticipants(response.data?.participants || []);
        setParticipantsPagination({
          currentPage: responsePage,
          totalPages,
          totalItems,
          itemsPerPage,
          hasNext: !!pagination?.hasNext || responsePage < totalPages,
          hasPrev: !!pagination?.hasPrev || responsePage > 1,
        });
        participantsPageRef.current = responsePage;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch participants';
        setParticipantsError(errorMessage);
      } finally {
        setParticipantsLoading(false);
        isFetchingParticipantsRef.current = false;
      }
    },
    [organizationId, pageSize, initialParticipantFilters]
  );

  // Refetch All
  const refetchAll = useCallback(async () => {
    if (!organizationId) return;

    await Promise.all([fetchHackathons(), fetchDrafts()]);
  }, [organizationId, fetchHackathons, fetchDrafts]);

  // Auto-fetch on mount and when organizationId changes
  useEffect(() => {
    if (autoFetch && organizationId) {
      fetchHackathons();
      fetchDrafts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, organizationId]); // Only depend on organizationId for initial fetch

  return {
    // Published Hackathons
    hackathons,
    hackathonsLoading,
    hackathonsError,
    hackathonsPagination,

    // Drafts
    drafts,
    draftsLoading,
    draftsError,
    draftsPagination,

    // Current
    currentHackathon,
    currentDraft,
    currentLoading,
    currentError,

    // Actions - Drafts
    initializeDraftAction,
    updateDraftStepAction,
    updateDraftStepsAction,
    fetchDraft,
    fetchDrafts,

    // Actions - Published
    updateHackathonAction,
    deleteHackathonAction,
    fetchHackathon,
    fetchHackathons,

    // Participants
    participants,
    participantsLoading,
    participantsError,
    participantsPagination,
    fetchParticipants,

    // Utility
    refetchAll,
    setCurrentHackathon,
    setCurrentDraft,
    organizationId,
  };
}
