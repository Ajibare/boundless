import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityType, UseFollowReturn } from '@/types/follow';
import { followApi } from '@/lib/api/follow';
import { useOptionalAuth } from './use-auth';

export const useFollow = (
  entityType: EntityType,
  entityId: string,
  initialIsFollowing = false
): UseFollowReturn => {
  const { user } = useOptionalAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared, cached follow-status query. Replaces a manual useEffect that re-ran
  // whenever the `user` object identity changed (every auth refresh) and once
  // per component using this hook — which rate-limited /follows/.../check (429).
  // The stable string key dedupes across components and caches the result; the
  // global QueryClient config doesn't retry 4xx.
  const statusQuery = useQuery({
    queryKey: ['follow', entityType, entityId],
    queryFn: async () => {
      const response = await followApi.checkFollowStatus(entityType, entityId);
      // Backend returns { success, data: { isFollowing } }; the axios layer
      // wraps it once more, so both shapes are unwrapped here.
      return (
        response.data?.data?.isFollowing ?? response.data?.isFollowing ?? false
      );
    },
    enabled: !!user && !!entityId,
    staleTime: 60_000,
  });

  const isFollowing = statusQuery.data ?? initialIsFollowing;

  const follow = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to follow');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await followApi.followEntity(entityType, entityId);
      queryClient.setQueryData(['follow', entityType, entityId], true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to follow';
      setError(errorMessage);
      throw err; // Re-throw for component handling
    } finally {
      setIsLoading(false);
    }
  }, [user, entityType, entityId, queryClient]);

  const unfollow = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to unfollow');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await followApi.unfollowEntity(entityType, entityId);
      queryClient.setQueryData(['follow', entityType, entityId], false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to unfollow';
      setError(errorMessage);
      throw err; // Re-throw for component handling
    } finally {
      setIsLoading(false);
    }
  }, [user, entityType, entityId, queryClient]);

  const toggleFollow = useCallback(async () => {
    if (isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  }, [isFollowing, follow, unfollow]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isFollowing,
    isLoading,
    follow,
    unfollow,
    toggleFollow,
    error,
    clearError,
  };
};
