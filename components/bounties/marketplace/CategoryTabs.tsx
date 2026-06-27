'use client';

import {
  BOUNTY_CATEGORIES,
  CATEGORY_LABELS,
  type BountyCategory,
} from '@/components/organization/bounties/new/tabs/schemas/scopeSchema';

export type CategoryFilter = 'all' | BountyCategory;

const TABS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...BOUNTY_CATEGORIES.map(c => ({ value: c, label: CATEGORY_LABELS[c] })),
];

/** Category switcher for the bounty marketplace. "All" first, then disciplines. */
export function CategoryTabs({
  value,
  onChange,
}: {
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
}) {
  return (
    <div
      role='tablist'
      aria-label='Filter bounties by category'
      className='mb-6 flex flex-wrap gap-1 border-b border-zinc-800'
    >
      {TABS.map(tab => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role='tab'
            aria-selected={active}
            type='button'
            onClick={() => onChange(tab.value)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
            {active && (
              <span className='bg-primary absolute inset-x-2 -bottom-px h-0.5 rounded-full' />
            )}
          </button>
        );
      })}
    </div>
  );
}
