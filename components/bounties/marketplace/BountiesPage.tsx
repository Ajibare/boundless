'use client';

import React, { useEffect, useMemo, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import { BoundlessButton } from '@/components/buttons';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import type { BountyPublic } from '@/features/bounties';
import { BountyCard } from './BountyCard';
import BountiesFiltersHeader, {
  type ModeFilter,
} from './BountiesFiltersHeader';
import { CategoryTabs, type CategoryFilter } from './CategoryTabs';
import { useInfiniteBounties } from './use-bounties-marketplace';

/** Client-side mode narrowing (the public list endpoint doesn't filter on mode). */
function matchesMode(b: BountyPublic, mode: ModeFilter): boolean {
  switch (mode) {
    case 'single_claim':
      return b.claimType === 'SINGLE_CLAIM';
    case 'competition':
      return b.claimType === 'COMPETITION';
    case 'application':
      return (
        b.entryType === 'APPLICATION_LIGHT' ||
        b.entryType === 'APPLICATION_FULL'
      );
    default:
      return true;
  }
}

export default function BountiesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [mode, setMode] = useState<ModeFilter>('all');

  // Debounce the search so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    bounties,
    totalCount,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = useInfiniteBounties({
    status: status === 'all' ? undefined : status,
    category: category === 'all' ? undefined : category,
    search: debouncedSearch || undefined,
  });

  const visible = useMemo(
    () => bounties.filter(b => matchesMode(b, mode)),
    [bounties, mode]
  );

  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  useInfiniteScroll(sentinel, {
    onLoadMore: loadMore,
    hasMore: !!hasMore,
    loading: loadingMore,
    rootMargin: '0px 0px 1200px 0px',
  });

  const hasFilters =
    !!debouncedSearch ||
    status !== 'all' ||
    category !== 'all' ||
    mode !== 'all';
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setCategory('all');
    setMode('all');
  };

  return (
    <div id='explore-bounties'>
      <BountiesFiltersHeader
        search={search}
        status={status}
        mode={mode}
        totalCount={totalCount}
        onSearch={setSearch}
        onStatus={setStatus}
        onMode={setMode}
      />

      <CategoryTabs value={category} onChange={setCategory} />

      {loading && (
        <div className='flex items-center justify-center py-24'>
          <LoadingSpinner size='md' variant='spinner' color='white' />
        </div>
      )}

      {!loading && error && (
        <div className='py-16'>
          <EmptyState
            title="Couldn't load bounties"
            description={error}
            type='compact'
          />
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className='py-16 text-center'>
          <EmptyState
            title='No bounties found'
            description={
              hasFilters
                ? 'Try adjusting your filters to see more bounties.'
                : 'No bounties are available right now.'
            }
            type='compact'
          />
          {hasFilters && (
            <div className='mt-3'>
              <BoundlessButton
                variant='outline'
                onClick={clearFilters}
                className='border-primary text-primary hover:bg-primary/10'
              >
                Clear filters
              </BoundlessButton>
            </div>
          )}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3'>
            {visible.map(b => (
              <BountyCard key={b.id} bounty={b} />
            ))}
          </div>

          <div ref={setSentinel} className='h-px w-full' aria-hidden />

          {loadingMore && (
            <div className='mt-6 flex items-center justify-center gap-2 py-4 text-zinc-400'>
              <LoadingSpinner size='sm' variant='spinner' color='white' />
              <span className='text-sm'>Loading more...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
