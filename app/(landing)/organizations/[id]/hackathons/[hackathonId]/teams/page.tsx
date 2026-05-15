'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Crown,
} from 'lucide-react';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { AuthGuard } from '@/components/auth';
import Loading from '@/components/Loading';
import MetricsCard from '@/components/organization/cards/MetricsCard';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { getTeams } from '@/lib/api/hackathons/teams';
import type { Team } from '@/lib/api/hackathons/teams';
import { getHackathon } from '@/lib/api/hackathons';
import { reportError } from '@/lib/error-reporting';
import BasicAvatar from '@/components/avatars/BasicAvatar';

type StatusFilter = 'all' | 'open' | 'closed';
type SubmissionFilter = 'all' | 'submitted' | 'not_submitted';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export default function OrganizerTeamsPage() {
  const params = useParams();
  const organizationId = params?.id as string;
  const hackathonId = params?.hackathonId as string;

  const [teams, setTeams] = useState<Team[]>([]);
  const [hackathonSlug, setHackathonSlug] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [submissionFilter, setSubmissionFilter] =
    useState<SubmissionFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTeams, setTotalTeams] = useState(0);

  useEffect(() => {
    if (!hackathonId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const limit = Math.min(pageSize, MAX_PAGE_SIZE);
        const teamsRes = await getTeams(hackathonId, {
          page,
          limit,
          search: search.trim() || undefined,
          openOnly: false,
        });
        if (cancelled) return;
        setTeams(teamsRes?.data?.teams ?? []);
        setTotalPages(teamsRes?.data?.pagination?.totalPages ?? 0);
        setTotalTeams(teamsRes?.data?.pagination?.total ?? 0);
      } catch (err) {
        reportError(err, {
          context: 'organizer-teams-load',
          organizationId,
          hackathonId,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [hackathonId, organizationId, page, pageSize, search]);

  useEffect(() => {
    if (!hackathonId) return;
    let cancelled = false;
    const loadHackathon = async () => {
      try {
        const hackRes = await getHackathon(hackathonId);
        if (!cancelled) {
          setHackathonSlug(hackRes?.data?.slug ?? hackathonId);
        }
      } catch (err) {
        reportError(err, {
          context: 'organizer-teams-load-hackathon',
          organizationId,
          hackathonId,
        });
        if (!cancelled) setHackathonSlug(hackathonId);
      }
    };
    loadHackathon();
    return () => {
      cancelled = true;
    };
  }, [hackathonId, organizationId]);

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      if (statusFilter === 'open' && !team.isOpen) return false;
      if (statusFilter === 'closed' && team.isOpen) return false;
      if (submissionFilter === 'submitted' && !team.hasSubmission) return false;
      if (submissionFilter === 'not_submitted' && team.hasSubmission)
        return false;
      return true;
    });
  }, [teams, statusFilter, submissionFilter]);

  const table = useReactTable({
    data: teams,
    columns: [],
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: updater => {
      if (typeof updater === 'function') {
        const next = updater({ pageIndex: page - 1, pageSize });
        if (next.pageSize !== pageSize) {
          setPageSize(Math.min(next.pageSize, MAX_PAGE_SIZE));
          setPage(1);
        } else {
          setPage(next.pageIndex + 1);
        }
      }
    },
  });

  const stats = useMemo(() => {
    const submittedOnPage = teams.filter(t => t.hasSubmission).length;
    const openOnPage = teams.filter(t => t.isOpen).length;
    return {
      total: totalTeams,
      open: openOnPage,
      submitted: submittedOnPage,
      notSubmitted: teams.length - submittedOnPage,
    };
  }, [teams, totalTeams]);

  return (
    <AuthGuard redirectTo='/auth?mode=signin' fallback={<Loading />}>
      <div className='min-h-screen bg-black'>
        <div className='border-b border-gray-900 p-4'>
          <div className='mx-auto max-w-7xl'>
            <h1 className='text-3xl font-light tracking-tight text-white sm:text-4xl'>
              Teams
            </h1>
            <p className='mt-2 text-sm text-gray-400'>
              All teams formed for this hackathon and whether they have
              submitted.
            </p>
          </div>
        </div>

        <div className='mx-auto max-w-7xl space-y-6 px-6 py-12 sm:px-8 lg:px-12'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <MetricsCard
              title='Total Teams'
              value={stats.total}
              subtitle={loading ? 'Loading...' : `${stats.total} formed`}
            />
            <MetricsCard
              title='Open Teams'
              value={stats.open}
              subtitle={
                loading ? 'Loading...' : `${stats.open} recruiting members`
              }
            />
            <MetricsCard
              title='Submitted'
              value={stats.submitted}
              subtitle={
                loading ? 'Loading...' : `${stats.submitted} have a submission`
              }
            />
            <MetricsCard
              title='Not Submitted'
              value={stats.notSubmitted}
              subtitle={
                loading ? 'Loading...' : `${stats.notSubmitted} pending`
              }
            />
          </div>

          <div className='flex flex-col gap-3 rounded-xl border border-gray-800/50 bg-gray-900/20 p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between'>
            <div className='relative flex-1 md:max-w-md'>
              <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
              <Input
                type='text'
                placeholder='Search by team or leader...'
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className='focus:border-primary focus:ring-primary border-gray-700/50 bg-gray-900/50 pl-10 text-white placeholder:text-gray-500'
              />
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Select
                value={statusFilter}
                onValueChange={value => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className='w-[160px] border-gray-700/50 bg-gray-900/50 text-white'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All statuses</SelectItem>
                  <SelectItem value='open'>Open</SelectItem>
                  <SelectItem value='closed'>Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={submissionFilter}
                onValueChange={value =>
                  setSubmissionFilter(value as SubmissionFilter)
                }
              >
                <SelectTrigger className='w-[180px] border-gray-700/50 bg-gray-900/50 text-white'>
                  <SelectValue placeholder='Submission' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All submission states</SelectItem>
                  <SelectItem value='submitted'>Submitted</SelectItem>
                  <SelectItem value='not_submitted'>Not submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className='flex min-h-[400px] items-center justify-center'>
              <div className='flex flex-col items-center gap-3'>
                <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
                <p className='text-sm text-gray-500'>Loading teams...</p>
              </div>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-800/50 bg-gray-900/20 py-16 text-center'>
              <Users className='h-10 w-10 text-gray-700' />
              <p className='text-base font-medium text-gray-400'>
                {teams.length === 0
                  ? 'No teams yet for this hackathon.'
                  : 'No teams match the current filters.'}
              </p>
            </div>
          ) : (
            <div className='overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900/20'>
              <div className='hidden grid-cols-12 gap-4 border-b border-gray-800/50 px-4 py-3 text-[11px] font-bold tracking-wider text-gray-500 uppercase md:grid'>
                <div className='col-span-4'>Team</div>
                <div className='col-span-3'>Leader</div>
                <div className='col-span-2'>Members</div>
                <div className='col-span-2'>Submission</div>
                <div className='col-span-1 text-right'>Status</div>
              </div>
              <ul>
                {filteredTeams.map(team => {
                  const href = `/hackathons/${hackathonSlug}/teams/${team.id}`;
                  return (
                    <li
                      key={team.id}
                      className='border-b border-gray-800/30 last:border-b-0'
                    >
                      <Link
                        href={href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='grid grid-cols-12 items-center gap-4 px-4 py-4 transition-colors hover:bg-white/5'
                      >
                        <div className='col-span-12 md:col-span-4'>
                          <div className='flex items-center gap-3'>
                            <div className='text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#232B20] text-sm font-black'>
                              {team.teamName?.charAt(0).toUpperCase()}
                            </div>
                            <div className='min-w-0'>
                              <p className='truncate font-medium text-white'>
                                {team.teamName}
                              </p>
                              <p className='truncate text-xs text-gray-500'>
                                Created{' '}
                                {new Date(team.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className='col-span-12 md:col-span-3'>
                          {team.leader ? (
                            <div className='flex items-center gap-2'>
                              <BasicAvatar
                                image={team.leader.image ?? ''}
                                name={team.leader.name}
                                username={
                                  team.leader.username ?? team.leader.id
                                }
                                truncate={false}
                              />
                              <Crown className='h-3 w-3 text-amber-400' />
                            </div>
                          ) : (
                            <span className='text-sm text-gray-500'>
                              No leader
                            </span>
                          )}
                        </div>
                        <div className='col-span-6 md:col-span-2'>
                          <span className='inline-flex items-center gap-1 text-sm text-gray-300'>
                            <Users className='h-3.5 w-3.5 text-gray-500' />
                            {team.memberCount}/{team.maxSize}
                          </span>
                        </div>
                        <div className='col-span-6 md:col-span-2'>
                          {team.hasSubmission ? (
                            <span className='inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-green-400 uppercase'>
                              <CheckCircle2 className='h-3 w-3' />
                              Submitted
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800/50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-gray-400 uppercase'>
                              <XCircle className='h-3 w-3' />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className='col-span-12 text-left md:col-span-1 md:text-right'>
                          <span
                            className={
                              team.isOpen
                                ? 'inline-flex rounded border border-[#2A3347] bg-[#1E232F]/50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#5470B8] uppercase'
                                : 'inline-flex rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold tracking-wider text-gray-500 uppercase'
                            }
                          >
                            {team.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className='flex justify-end'>
            <DataTablePagination table={table} loading={loading} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
