'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const MODE_OPTIONS = [
  { value: 'all', label: 'All modes' },
  { value: 'single_claim', label: 'Single claim' },
  { value: 'competition', label: 'Competition' },
  { value: 'application', label: 'Application' },
] as const;

export type ModeFilter = (typeof MODE_OPTIONS)[number]['value'];

interface BountiesFiltersHeaderProps {
  search: string;
  status: string;
  mode: ModeFilter;
  totalCount: number;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onMode: (value: ModeFilter) => void;
}

export default function BountiesFiltersHeader({
  search,
  status,
  mode,
  totalCount,
  onSearch,
  onStatus,
  onMode,
}: BountiesFiltersHeaderProps) {
  return (
    <div className='mb-8'>
      <div className='mb-2 flex items-end justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-white'>
            Bounties
          </h1>
          <p className='mt-1 text-sm text-zinc-400'>
            Discover open bounties and start earning.
          </p>
        </div>
        <span className='shrink-0 text-sm text-zinc-500'>
          {totalCount} bount{totalCount === 1 ? 'y' : 'ies'}
        </span>
      </div>

      <div className='mt-4 flex flex-wrap items-center gap-3'>
        <div className='relative min-w-52 flex-1'>
          <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500' />
          <Input
            type='search'
            placeholder='Search bounties...'
            value={search}
            onChange={e => onSearch(e.target.value)}
            className='focus:border-primary h-10 rounded-xl border-zinc-800/50 bg-zinc-900/30 pl-10 text-sm text-white placeholder:text-zinc-500 hover:border-zinc-700'
          />
        </div>

        <Select value={status} onValueChange={onStatus}>
          <SelectTrigger className='h-10 w-40 rounded-xl border-zinc-800/50 bg-zinc-900/30 text-sm text-white hover:border-zinc-700'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='border-zinc-800/50 bg-zinc-950'>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mode} onValueChange={v => onMode(v as ModeFilter)}>
          <SelectTrigger className='h-10 w-40 rounded-xl border-zinc-800/50 bg-zinc-900/30 text-sm text-white hover:border-zinc-700'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='border-zinc-800/50 bg-zinc-950'>
            {MODE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
