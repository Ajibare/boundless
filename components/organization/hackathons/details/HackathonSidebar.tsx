import {
  Trophy,
  Settings,
  LayoutDashboard,
  Users,
  UsersRound,
  BarChartBig,
  Megaphone,
  FileText,
  Menu,
  Info,
  CalendarDays,
  BookOpen,
  Scale,
  Handshake,
  ClipboardCheck,
  ClipboardList,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useWindowSize } from '@/hooks/use-window-size';
import { useHackathons } from '@/hooks/use-hackathons';
import { STEP_ORDER } from '@/components/organization/hackathons/new/constants';
import type { StepKey } from '@/components/organization/hackathons/new/constants';
import HackathonSelector from './HackathonSelector';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface Hackathon {
  id: string;
  name: string;
  status: 'draft' | 'ongoing' | 'completed';
  href: string;
}

interface HackathonSidebarProps {
  organizationId?: string;
  hackathons?: Hackathon[];
}

// 'available' renders an active link; 'after-publish' renders a greyed,
// non-clickable row that tells the organizer the page unlocks once the
// hackathon is published (no more misleading "coming soon").
type ItemState = 'available' | 'after-publish';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description: string;
  state: ItemState;
  // Present on Setup items: the wizard ?step= key this row drives.
  stepKey?: StepKey;
}

interface SidebarContentProps {
  hackathonData: Hackathon[];
  currentHackathon?: Hackathon;
  setupItems: MenuItem[];
  manageItems: MenuItem[];
  isLoading: boolean;
  normalizedPath: string | null;
  activeStep: string | null;
  organizationId?: string;
}

const SETUP_META: Record<
  StepKey,
  { label: string; icon: LucideIcon; description: string }
> = {
  information: {
    label: 'Information',
    icon: Info,
    description: 'Name, banner, details',
  },
  timeline: {
    label: 'Timeline',
    icon: CalendarDays,
    description: 'Dates and deadlines',
  },
  participation: {
    label: 'Participation',
    icon: Users,
    description: 'Teams and requirements',
  },
  tracks: {
    label: 'Tracks',
    icon: Layers,
    description: 'Categories and entries',
  },
  rewards: {
    label: 'Rewards',
    icon: Trophy,
    description: 'Prizes and placements',
  },
  'custom-questions': {
    label: 'Custom Questions',
    icon: ClipboardList,
    description: 'Extra applicant fields',
  },
  resources: {
    label: 'Resources',
    icon: BookOpen,
    description: 'Links and materials',
  },
  judging: {
    label: 'Judging',
    icon: Scale,
    description: 'Criteria and weights',
  },
  collaboration: {
    label: 'Collaboration',
    icon: Handshake,
    description: 'Contacts and sponsors',
  },
  review: {
    label: 'Review',
    icon: ClipboardCheck,
    description: 'Review and publish',
  },
};

function HackathonSidebarContent({
  hackathonData,
  currentHackathon,
  setupItems,
  manageItems,
  isLoading,
  normalizedPath,
  activeStep,
  organizationId,
}: SidebarContentProps) {
  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;

    if (item.state === 'after-publish') {
      return (
        <div
          key={item.label}
          aria-disabled='true'
          title='Unlocks after you publish. Finish Setup, then open Review to publish.'
          className='group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-600'
        >
          <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/40'>
            <Icon className='h-4 w-4' />
          </div>
          <div className='flex flex-1 flex-col'>
            <span className='text-sm font-medium'>{item.label}</span>
            <span className='text-xs text-zinc-700'>{item.description}</span>
          </div>
          <span className='rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500'>
            After publish
          </span>
        </div>
      );
    }

    // Setup rows key their active state off the wizard ?step= param; Manage
    // rows key off the pathname (Overview matches exactly, others by prefix).
    const isActive = item.stepKey
      ? item.stepKey === (activeStep ?? 'information')
      : item.href !== '#' &&
        (item.label === 'Overview'
          ? normalizedPath === item.href
          : normalizedPath === item.href ||
            normalizedPath?.startsWith(item.href + '/'));

    return (
      <Link
        key={item.label}
        href={item.href}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all',
          isActive
            ? 'from-primary/10 text-primary shadow-primary/5 bg-linear-to-r to-transparent shadow-lg'
            : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
        )}
      >
        {isActive && (
          <div className='bg-primary absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full'></div>
        )}

        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-all',
            isActive
              ? 'bg-primary/20 shadow-primary/20 shadow-lg'
              : 'bg-zinc-900/50 group-hover:bg-zinc-800'
          )}
        >
          <Icon className='h-4 w-4' />
        </div>

        <div className='flex flex-col'>
          <span className='text-sm font-medium'>{item.label}</span>
          <span
            className={cn(
              'text-xs transition-colors',
              isActive
                ? 'text-primary/60'
                : 'text-zinc-600 group-hover:text-zinc-500'
            )}
          >
            {item.description}
          </span>
        </div>

        {!isActive && (
          <div className='absolute inset-0 rounded-xl border border-transparent transition-colors group-hover:border-zinc-700/50'></div>
        )}
      </Link>
    );
  };

  return (
    <nav className='flex h-full flex-col overflow-y-auto px-4 py-6'>
      {/* Hackathon Selector */}
      <div className='mb-8'>
        {isLoading ? (
          <div className='flex items-center gap-3 rounded-xl bg-zinc-900/50 px-3 py-3'>
            <div className='h-9 w-9 animate-pulse rounded-lg bg-zinc-800' />
            <div className='flex flex-col gap-1'>
              <div className='h-4 w-32 animate-pulse rounded bg-zinc-800' />
              <div className='h-3 w-24 animate-pulse rounded bg-zinc-800' />
            </div>
          </div>
        ) : hackathonData.length === 0 ? (
          <div className='rounded-xl bg-zinc-900/50 px-3 py-3'>
            <p className='text-sm text-zinc-500'>No hackathons found</p>
          </div>
        ) : (
          <div className='mb-4 rounded-xl bg-zinc-900/50 p-2'>
            <HackathonSelector
              hackathons={hackathonData}
              currentHackathon={currentHackathon}
              organizationId={organizationId}
            />
          </div>
        )}
      </div>

      {/* Setup sections (shown while the hackathon is a draft) */}
      {setupItems.length > 0 && (
        <div className='mb-8 space-y-1'>
          <h3 className='mb-4 px-3 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase'>
            Setup
          </h3>
          {setupItems.map(renderItem)}
        </div>
      )}

      {/* Manage / operational pages */}
      <div className='mb-8 space-y-1'>
        <h3 className='mb-4 px-3 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase'>
          {setupItems.length > 0 ? 'Manage' : 'Navigation'}
        </h3>
        {manageItems.map(renderItem)}
      </div>

      {/* Decorative bottom gradient */}
      <div className='pointer-events-none absolute right-0 bottom-0 left-0 h-24 bg-linear-to-t from-black via-black/50 to-transparent'></div>
    </nav>
  );
}

export default function HackathonSidebar({
  organizationId,
  hackathons = [],
}: HackathonSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { height } = useWindowSize();

  const derivedOrgId =
    organizationId ||
    (() => {
      if (!pathname) return undefined;
      const parts = pathname.split('/');
      if (parts.length >= 3 && parts[1] === 'organizations') {
        return parts[2];
      }
      return undefined;
    })();

  // Use the hackathons hook to fetch real data
  const {
    drafts,
    draftsLoading,
    hackathons: apiHackathons,
    hackathonsLoading,
  } = useHackathons({
    organizationId: derivedOrgId,
    autoFetch: true,
  });

  const getHackathonId = () => {
    if (!pathname) return undefined;
    const parts = pathname.split('/');
    if (
      parts.length >= 5 &&
      parts[1] === 'organizations' &&
      parts[3] === 'hackathons'
    ) {
      if (parts[4] === 'new') {
        // The create route has no id yet; treated as an in-progress draft.
        return undefined;
      }
      if (parts[4] === 'drafts' && parts.length >= 6) {
        return `draft-${parts[5]}`;
      }
      return `hackathon-${parts[4]}`;
    }
    return undefined;
  };

  const hackathonId = getHackathonId();
  const isDraft = hackathonId?.startsWith('draft-') ?? false;
  // The create route (/hackathons/new) is an in-progress draft with no id yet.
  const isNew =
    pathname?.replace(/\/+$/, '').endsWith('/hackathons/new') ?? false;
  const isEditing = isDraft || isNew;

  const normalizedPath =
    pathname?.endsWith('/') && pathname !== '/'
      ? pathname.slice(0, -1)
      : pathname;

  const hackathonData = useMemo<Hackathon[]>(() => {
    const items: Hackathon[] = [];
    apiHackathons.forEach(hackathon => {
      let title = hackathon.name || 'Untitled Hackathon';
      title =
        typeof title === 'string'
          ? title.trim() || 'Untitled Hackathon'
          : 'Untitled Hackathon';

      items.push({
        id: `hackathon-${hackathon.id}`,
        name: title,
        status: (['UPCOMING', 'ACTIVE', 'JUDGING'].includes(hackathon.status)
          ? 'ongoing'
          : hackathon.status === 'DRAFT'
            ? 'draft'
            : hackathon.status === 'COMPLETED'
              ? 'completed'
              : 'ongoing') as 'draft' | 'ongoing' | 'completed',
        href: derivedOrgId
          ? `/organizations/${derivedOrgId}/hackathons/${hackathon.id}`
          : '#',
      });
    });

    drafts.forEach(draft => {
      let title = 'Untitled Hackathon';
      if (draft.data.information) {
        title = draft.data.information.name || title;
      }
      title =
        typeof title === 'string'
          ? title.trim() || 'Untitled Hackathon'
          : 'Untitled Hackathon';

      // A hackathon mid-publish stays in the drafts list but can't be edited;
      // route it to the management page where the publish banner resumes it.
      const isPublishing = draft.status === 'DRAFT_AWAITING_FUNDING';
      items.push({
        id: `draft-${draft.id}`,
        name: title,
        status: 'draft',
        href: derivedOrgId
          ? isPublishing
            ? `/organizations/${derivedOrgId}/hackathons/${draft.id}`
            : `/organizations/${derivedOrgId}/hackathons/drafts/${draft.id}`
          : '#',
      });
    });

    if (hackathons.length > 0) return hackathons;
    return items;
  }, [drafts, apiHackathons, derivedOrgId, hackathons]);

  const isLoading = draftsLoading || hackathonsLoading;

  const currentHackathon = useMemo(() => {
    if (isNew) return undefined;
    if (hackathonId) {
      return hackathonData.find(h => h.id === hackathonId) || hackathonData[0];
    }
    return hackathonData[0];
  }, [isNew, hackathonId, hackathonData]);

  const actualHackathonId = useMemo(() => {
    if (!hackathonId) return undefined;
    return hackathonId.replace(/^(draft-|hackathon-)/, '');
  }, [hackathonId]);

  // Where the Setup sections (the wizard) live: the create route for a brand
  // new hackathon, or the draft editor for a saved draft.
  const setupBase = useMemo(() => {
    if (!derivedOrgId) return '#';
    if (isNew) return `/organizations/${derivedOrgId}/hackathons/new`;
    if (isDraft && actualHackathonId) {
      return `/organizations/${derivedOrgId}/hackathons/drafts/${actualHackathonId}`;
    }
    return '#';
  }, [derivedOrgId, isNew, isDraft, actualHackathonId]);

  // Where the operational pages live: published hackathons only.
  const basePath = useMemo(() => {
    if (!derivedOrgId || !actualHackathonId || isEditing) return '#';
    return `/organizations/${derivedOrgId}/hackathons/${actualHackathonId}`;
  }, [derivedOrgId, actualHackathonId, isEditing]);

  // Setup sections: the wizard steps, navigable in any order while editing a
  // draft. Each links to the draft editor at the matching ?step=. Hidden once
  // published (setup edits then happen via the Settings page below).
  // On the create route the wizard tracks the draft id via ?draftId= after it
  // first saves; preserve it so Setup links keep editing the same draft.
  const draftIdParam = isNew ? searchParams.get('draftId') : null;
  const setupItems = useMemo<MenuItem[]>(() => {
    if (!isEditing || setupBase === '#') return [];
    const suffix = draftIdParam ? `&draftId=${draftIdParam}` : '';
    return STEP_ORDER.map(stepKey => ({
      icon: SETUP_META[stepKey].icon,
      label: SETUP_META[stepKey].label,
      href: `${setupBase}?step=${stepKey}${suffix}`,
      description: SETUP_META[stepKey].description,
      state: 'available' as const,
      stepKey,
    }));
  }, [isEditing, setupBase, draftIdParam]);

  const manageItems = useMemo<MenuItem[]>(() => {
    // Operational pages live under the published route only; while editing
    // (create or draft) they are shown as "after publish" rather than linking
    // to a route that does not exist yet.
    const opHref = (suffix: string) =>
      !isEditing && basePath !== '#' ? `${basePath}${suffix}` : '#';
    const opState: ItemState = isEditing ? 'after-publish' : 'available';

    return [
      {
        icon: LayoutDashboard,
        label: 'Overview',
        href: opHref(''),
        description: 'Event dashboard',
        state: opState,
      },
      {
        icon: Users,
        label: 'Participants',
        href: opHref('/participants'),
        description: 'Manage registrations',
        state: opState,
      },
      {
        icon: FileText,
        label: 'Submissions',
        href: opHref('/submissions'),
        description: 'View all submissions',
        state: opState,
      },
      {
        icon: UsersRound,
        label: 'Teams',
        href: opHref('/teams'),
        description: 'View all teams',
        state: opState,
      },
      {
        icon: BarChartBig,
        label: 'Judging',
        href: opHref('/judging'),
        description: 'Judges, criteria, scoring',
        state: opState,
      },
      {
        icon: Trophy,
        label: 'Winners',
        href: opHref('/winners'),
        description: 'Pick and pay winners',
        state: opState,
      },
      {
        icon: Megaphone,
        label: 'Announcement',
        href: opHref('/announcement'),
        description: 'Send updates',
        state: opState,
      },
      {
        icon: Settings,
        label: 'Settings',
        href: opHref('/settings'),
        description: 'Configure event',
        state: opState,
      },
    ];
  }, [isEditing, basePath]);

  const activeStep = searchParams.get('step');

  const headerHeight = 64;
  const availableHeight = height ? height - headerHeight : 'calc(100vh - 4rem)';

  return (
    <>
      {/* Mobile Sidebar - Triggered by Hamburger */}
      <div className='fixed top-20 left-4 z-50 md:hidden'>
        <Sheet>
          <SheetTrigger asChild>
            <button className='flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-black/60 shadow-lg backdrop-blur-xl'>
              <Menu className='h-5 w-5 text-white' />
            </button>
          </SheetTrigger>
          <SheetContent
            side='left'
            className='w-[280px] border-r border-zinc-800 bg-black p-0'
          >
            <HackathonSidebarContent
              hackathonData={hackathonData}
              currentHackathon={currentHackathon}
              setupItems={setupItems}
              manageItems={manageItems}
              isLoading={isLoading}
              normalizedPath={normalizedPath}
              activeStep={activeStep}
              organizationId={derivedOrgId}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className='fixed top-4 left-0 hidden w-[280px] border-r border-zinc-800/50 bg-black/40 backdrop-blur-xl md:block'
        style={{ height: availableHeight, top: '90px' }}
      >
        <HackathonSidebarContent
          hackathonData={hackathonData}
          currentHackathon={currentHackathon}
          setupItems={setupItems}
          manageItems={manageItems}
          isLoading={isLoading}
          normalizedPath={normalizedPath}
          activeStep={activeStep}
          organizationId={derivedOrgId}
        />
      </aside>
    </>
  );
}
