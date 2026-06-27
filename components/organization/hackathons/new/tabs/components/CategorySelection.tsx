'use client';

import { useState } from 'react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Control } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Check, Search, X } from 'lucide-react';

// Keep in sync with HACKATHON_CATEGORIES in boundless-nestjs
// (src/modules/hackathons/dto/hackathon-steps.dto.ts).
const categories = [
  'DeFi',
  'Payments',
  'Stablecoins',
  'Lending & Borrowing',
  'Trading & DEXs',
  'Derivatives',
  'Prediction Markets',
  'NFTs',
  'Creator Economy',
  'Social',
  'Social Tokens',
  'DAOs',
  'Governance',
  'Web3 Gaming',
  'Metaverse',
  'Layer 1',
  'Layer 2',
  'Cross-chain',
  'Interoperability',
  'Infrastructure',
  'Developer Tooling',
  'Wallets',
  'Account Abstraction',
  'Oracles',
  'Data & Indexing',
  'Analytics',
  'AI',
  'AI Agents',
  'DePIN',
  'DeSci',
  'Privacy',
  'Zero-Knowledge',
  'Security',
  'Identity',
  'Real World Assets',
  'Tokenization',
  'Supply Chain',
  'Sustainability',
  'Climate',
  'Education',
  'Healthcare',
  'Consumer Apps',
  'Mobile',
  'Other',
];

interface CategorySelectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  name: string;
}

export default function CategorySelection({
  control,
  name,
}: CategorySelectionProps) {
  const [query, setQuery] = useState('');

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected: string[] = Array.isArray(field.value)
          ? field.value
          : [];
        const toggle = (cat: string) =>
          field.onChange(
            selected.includes(cat)
              ? selected.filter(c => c !== cat)
              : [...selected, cat]
          );
        const q = query.trim().toLowerCase();
        const filtered = q
          ? categories.filter(c => c.toLowerCase().includes(q))
          : categories;

        return (
          <FormItem>
            <FormLabel className='text-sm font-medium text-white'>
              Categories <span className='text-red-500'>*</span>
            </FormLabel>
            <p className='mb-3 text-sm text-zinc-500'>
              Search and pick the categories that apply
              {selected.length > 0 ? ` (${selected.length} selected)` : ''}.
            </p>

            <FormControl>
              <div className='space-y-3'>
                {/* Selected chips */}
                {selected.length > 0 && (
                  <div className='flex flex-wrap gap-1.5'>
                    {selected.map(cat => (
                      <span
                        key={cat}
                        className='border-primary/40 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium'
                      >
                        {cat}
                        <button
                          type='button'
                          aria-label={`Remove ${cat}`}
                          onClick={() => toggle(cat)}
                          className='hover:text-white'
                        >
                          <X className='h-3 w-3' />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className='relative'>
                  <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500' />
                  <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder='Search categories...'
                    className='pl-9'
                  />
                </div>

                {/* Options (scrollable, compact) */}
                <div className='max-h-44 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/20 p-2'>
                  {filtered.length === 0 ? (
                    <p className='px-2 py-3 text-sm text-zinc-600'>
                      No categories match “{query}”.
                    </p>
                  ) : (
                    <div className='flex flex-wrap gap-1.5'>
                      {filtered.map(cat => {
                        const on = selected.includes(cat);
                        return (
                          <button
                            key={cat}
                            type='button'
                            onClick={() => toggle(cat)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                              on
                                ? 'border-primary bg-primary/15 text-primary'
                                : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                            )}
                          >
                            {on && (
                              <Check className='h-3 w-3' strokeWidth={3} />
                            )}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </FormControl>

            <FormMessage className='text-xs text-red-500' />
          </FormItem>
        );
      }}
    />
  );
}
