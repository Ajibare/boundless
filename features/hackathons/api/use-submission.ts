'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getMySubmission,
  type CreateSubmissionRequest,
  type ParticipantSubmission,
} from '@/lib/api/hackathons';
import type { ApiError } from '@/lib/api/api';
import { useAuthStatus } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { reportError } from '@/lib/error-reporting';

function getApiErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as ApiError | undefined;
  if (apiErr && typeof apiErr.message === 'string' && apiErr.message) {
    const first = Array.isArray(apiErr.errors) ? apiErr.errors[0] : undefined;
    const fieldMsg = first?.message;
    // `debug` is only present outside production; surfaces the real Prisma
    // reason when the generic "Data validation failed" fires.
    const debug = first?.debug;
    if (debug && debug !== apiErr.message) {
      return `${apiErr.message}: ${debug}`;
    }
    if (fieldMsg && fieldMsg !== apiErr.message) {
      return `${apiErr.message}: ${fieldMsg}`;
    }
    return apiErr.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// Type for submission data from form (without backend-specific fields)
export type SubmissionFormData = Omit<
  CreateSubmissionRequest,
  'organizationId' | 'participationType'
> & {
  participationType?: 'INDIVIDUAL' | 'TEAM';
  teamName?: string;
  teamMembers?: Array<{
    userId?: string;
    email?: string;
    name: string;
    role: string;
    username?: string;
    avatar?: string;
  }>;
};

/**
 * Fields the backend `UpdateSubmissionDto` accepts. Backend rejects any
 * other field after PR #187 (forbidNonWhitelisted: true). Keep this list
 * in sync with src/modules/hackathons/dto/submission.dto.ts.
 *
 * Notably NOT on update: participationType, teamId, teamName,
 * organizationId, hackathonId, participantId. Those are set on create
 * only and cannot be changed via PATCH.
 */
const UPDATE_SUBMISSION_FIELDS: readonly (keyof SubmissionFormData)[] = [
  'projectName',
  'category',
  'description',
  'logo',
  'banner',
  'videoUrl',
  'introduction',
  'links',
  'socialLinks',
  'teamMembers',
  'trackIds',
  'trackAnswers',
  'customAnswers',
  'tagline',
  'builtWith',
  'screenshots',
  'license',
  'codeAttested',
] as const;

function pickUpdateSubmissionFields(
  data: Partial<SubmissionFormData>
): Partial<SubmissionFormData> {
  const out: Partial<SubmissionFormData> = {};
  for (const key of UPDATE_SUBMISSION_FIELDS) {
    if (key in data && data[key] !== undefined) {
      // The index type below is awkward because SubmissionFormData has
      // many optional fields with different shapes. The cast is safe
      // because each `key` is a real key of SubmissionFormData.
      (out as Record<string, unknown>)[key] = data[key];
    }
  }
  // teamMembers entries must match the backend TeamMemberDto exactly:
  // { userId, name, username?, role } — no `email`, no `avatar`. Project
  // each entry down to that shape so unknown fields never reach the wire.
  if (Array.isArray(out.teamMembers)) {
    out.teamMembers = out.teamMembers.map(member => ({
      userId: member.userId,
      name: member.name,
      role: member.role,
      ...(member.username ? { username: member.username } : {}),
    }));
  }
  return out;
}

interface UseSubmissionOptions {
  hackathonSlugOrId: string;
  organizationId?: string;
  autoFetch?: boolean;
}

export function useSubmission({
  hackathonSlugOrId,
  organizationId,
  autoFetch = true,
}: UseSubmissionOptions) {
  const { isAuthenticated } = useAuthStatus();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single shared, cached "my submission" query — replaces the manual
  // useEffect+fetch that re-fired on every render / StrictMode pass and once per
  // component using this hook, hammering /my-submission into 429s. A 404 means
  // "no submission yet": map it to empty data so React Query caches it rather
  // than re-requesting (the global config also doesn't retry 4xx).
  const myQuery = useQuery({
    queryKey: ['hackathon', hackathonSlugOrId, 'my-submission'],
    queryFn: async () => {
      try {
        return await getMySubmission(hackathonSlugOrId);
      } catch (err) {
        const status =
          (err as { status?: number })?.status ??
          (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          return { success: true, data: null } as Awaited<
            ReturnType<typeof getMySubmission>
          >;
        }
        throw err;
      }
    },
    enabled: autoFetch && isAuthenticated && !!hackathonSlugOrId,
    staleTime: 60_000,
  });

  const submission: ParticipantSubmission | null =
    myQuery.data?.success && myQuery.data.data ? myQuery.data.data : null;
  const isFetching = myQuery.isFetching;

  const setSubmissionCache = useCallback(
    (next: ParticipantSubmission | null) => {
      queryClient.setQueryData(
        ['hackathon', hackathonSlugOrId, 'my-submission'],
        { success: true, data: next }
      );
    },
    [queryClient, hackathonSlugOrId]
  );

  const fetchMySubmission = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['hackathon', hackathonSlugOrId, 'my-submission'],
    });
  }, [queryClient, hackathonSlugOrId]);

  const create = useCallback(
    async (data: SubmissionFormData) => {
      if (!isAuthenticated) {
        toast.error('Please sign in to submit a project');
        throw new Error('Authentication required');
      }

      if (!hackathonSlugOrId) {
        toast.error('Hackathon ID is required');
        throw new Error('Hackathon ID is required');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await createSubmission(
          hackathonSlugOrId,
          {
            ...data,
            participationType: data.participationType || 'INDIVIDUAL',
            links: data.links || [],
          },
          organizationId
        );

        if (response?.success && response?.data) {
          setSubmissionCache(response.data);
          toast.success(response.message || 'Submission created successfully!');
          return response.data;
        }
        throw new Error(
          (response as { message?: string })?.message ||
            'Submission creation failed'
        );
      } catch (err) {
        const errorMessage = getApiErrorMessage(
          err,
          'Failed to create submission'
        );
        setError(errorMessage);
        toast.error('Submission failed', {
          description: errorMessage,
          duration: 8000,
        });
        reportError(err, {
          context: 'hackathon-createSubmission',
          hackathonSlugOrId,
        });
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [hackathonSlugOrId, isAuthenticated, organizationId, setSubmissionCache]
  );

  const update = useCallback(
    async (submissionId: string, data: Partial<SubmissionFormData>) => {
      if (!isAuthenticated) {
        toast.error('Please sign in to update your submission');
        throw new Error('Authentication required');
      }

      if (!hackathonSlugOrId || !submissionId) {
        toast.error('Hackathon ID and Submission ID are required');
        throw new Error('Hackathon ID and Submission ID are required');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        // Strip create-only fields (participationType, teamId, teamName,
        // organizationId, ...) and per-team-member email so the request
        // matches UpdateSubmissionDto under forbidNonWhitelisted: true.
        const payload = pickUpdateSubmissionFields(data);
        const response = await updateSubmission(submissionId, payload);

        if (response?.success && response?.data) {
          setSubmissionCache(response.data);
          toast.success(response.message || 'Submission updated successfully!');
          return response.data;
        }
        throw new Error(
          (response as { message?: string })?.message ||
            'Submission update failed'
        );
      } catch (err) {
        const errorMessage = getApiErrorMessage(
          err,
          'Failed to update submission'
        );
        setError(errorMessage);
        toast.error('Update failed', {
          description: errorMessage,
          duration: 8000,
        });
        reportError(err, {
          context: 'hackathon-updateSubmission',
          submissionId,
        });
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [hackathonSlugOrId, isAuthenticated, setSubmissionCache]
  );

  const remove = useCallback(
    async (submissionId: string) => {
      if (!isAuthenticated || !hackathonSlugOrId) {
        toast.error('Unable to delete submission');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await deleteSubmission(submissionId);
        setSubmissionCache(null);
        toast.success('Submission deleted successfully');
        return true;
      } catch (err) {
        const errorMessage = getApiErrorMessage(
          err,
          'Failed to delete submission'
        );
        setError(errorMessage);
        toast.error('Delete failed', {
          description: errorMessage,
          duration: 8000,
        });
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [hackathonSlugOrId, isAuthenticated, setSubmissionCache]
  );

  return {
    submission,
    isSubmitting,
    isFetching,
    error,
    create,
    update,
    remove,
    fetchMySubmission,
    hasSubmission: !!submission,
  };
}
