'use client';

import * as React from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { getPublicHackathonsList, type Hackathon } from '@/lib/api/hackathons';
import { effectivePrizeTiers } from '@/lib/utils/effective-prize-tiers';
import type { HackathonFilters } from './use-hackathon-filters';
import { mapSortToAPI, mapStatusToAPI } from './use-hackathon-filters';

type SortOption =
  | 'newest'
  | 'oldest'
  | 'prize_pool_high'
  | 'prize_pool_low'
  | 'deadline_soon'
  | 'deadline_far';

interface UseHackathonsListOptions {
  initialPage?: number;
  pageSize?: number;
  initialFilters?: HackathonFilters;
}

interface UseHackathonsListReturn {
  hackathons: Hackathon[];
  featuredHackathons: Hackathon[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
  loadMore: () => void;
  refetch: () => void;
}

// ─── Client-side helpers (API doesn't support these dimensions) ──────────────

function getHackathonDeadline(hackathon: Hackathon): number {
  try {
    if (hackathon?.submissionDeadline) {
      return new Date(hackathon.submissionDeadline).getTime();
    }
  } catch {
    // ignore unparseable dates
  }
  return 0;
}

function getPrizePoolTotal(hackathon: Hackathon): number {
  const tiers = effectivePrizeTiers(hackathon);
  return tiers.reduce((sum, tier) => {
    const raw = tier.prizeAmount ?? (tier as { amount?: string }).amount;
    const parsed = Number(raw);
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
}

/** Reverse-sort options the API can't do server-side (others are API-sorted). */
function sortHackathons(
  list: Hackathon[],
  sortOption?: SortOption
): Hackathon[] {
  if (!sortOption) return list;
  const sorted = [...list];
  switch (sortOption) {
    case 'prize_pool_low':
      return sorted.sort((a, b) => getPrizePoolTotal(a) - getPrizePoolTotal(b));
    case 'deadline_far':
      return sorted.sort((a, b) => {
        const aDeadline = getHackathonDeadline(a);
        const bDeadline = getHackathonDeadline(b);
        if (aDeadline === 0) return 1;
        if (bDeadline === 0) return -1;
        return bDeadline - aDeadline;
      });
    default:
      return sorted;
  }
}

function filterByLocation(list: Hackathon[], location?: string): Hackathon[] {
  if (!location) return list;
  if (location === 'virtual') {
    return list.filter(h => h.venueType === 'VIRTUAL');
  }
  if (location === 'physical') {
    return list.filter(h => h.venueType === 'PHYSICAL');
  }
  const searchLocation = location.toLowerCase();
  return list.filter(h => {
    const country = h.country?.toLowerCase();
    const city = h.city?.toLowerCase();
    const state = h.state?.toLowerCase();
    return (
      country?.includes(searchLocation) ||
      city?.includes(searchLocation) ||
      state?.includes(searchLocation)
    );
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Public hackathons list, backed by React Query (`useInfiniteQuery`).
 *
 * The query key is **value-based** — built from the mapped API params, not the
 * `initialFilters` object reference. That's the whole fix for the page firing
 * `/hackathons?page=1&limit=10` multiple times: `useHackathonFilters` hands a
 * fresh object every render, which used to churn local state + re-run a manual
 * fetch effect. With a structural key, identical filter *values* resolve to one
 * cached query, so the list loads once per unique filter set (deduped across any
 * component that calls this hook).
 *
 * Location and reverse-sort are client-only dimensions; they are deliberately
 * NOT in the key, so toggling them re-derives from the already-fetched pages
 * instead of hitting the API again.
 */
export const useHackathonsList = (
  options: UseHackathonsListOptions = {}
): UseHackathonsListReturn => {
  const { pageSize = 10, initialFilters = {} } = options;

  const apiParams = {
    limit: pageSize,
    status: mapStatusToAPI(initialFilters.status),
    category: initialFilters.category,
    search: initialFilters.search,
    sort: mapSortToAPI(initialFilters.sort),
  };

  const query = useInfiniteQuery({
    queryKey: ['hackathons', 'list', apiParams],
    queryFn: ({ pageParam }) =>
      getPublicHackathonsList({ ...apiParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const rawHackathons = React.useMemo(
    () => (query.data?.pages ?? []).flatMap(page => page.hackathons ?? []),
    [query.data]
  );

  // Apply client-side location filter + reverse sort to the accumulated pages.
  const hackathons = React.useMemo(() => {
    let list = filterByLocation(rawHackathons, initialFilters.location);
    if (
      initialFilters.sort === 'prize_pool_low' ||
      initialFilters.sort === 'deadline_far'
    ) {
      list = sortHackathons(list, initialFilters.sort as SortOption);
    }
    return list;
  }, [rawHackathons, initialFilters.location, initialFilters.sort]);

  const pages = query.data?.pages ?? [];
  const totalCount =
    pages.length > 0 ? (pages[pages.length - 1].total ?? 0) : 0;

  const loadMore = React.useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  const refetch = React.useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    hackathons,
    featuredHackathons: [],
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: query.hasNextPage,
    currentPage: pages.length || 1,
    totalCount,
    loadMore,
    refetch,
  };
};
