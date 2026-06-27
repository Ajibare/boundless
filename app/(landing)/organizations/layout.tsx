'use client';

import type React from 'react';

import OrganizationHeader from '@/components/organization/OrganizationHeader';
import OrganizationSidebar from '@/components/organization/OrganizationSidebar';
import { usePathname } from 'next/navigation';
import {
  OrganizationProvider,
  NavigationLoadingProvider,
  useNavigationLoading,
} from '@/lib/providers';
import { cn } from '@/lib/utils';
import HackathonSidebar from '@/components/organization/hackathons/details/HackathonSidebar';
import HackathonNavigationLoader from '@/components/organization/hackathons/details/HackathonNavigationLoader';

export default function OrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const showOrganizationSidebar =
    pathname !== '/organizations' && pathname.startsWith('/organizations');
  const showNewGrantSidebar = pathname.includes('/grants/new');
  // One shell for the whole hackathon lifecycle: create (/new), draft editing
  // (/drafts/[id]), and published management (/[hackathonId]/...). Everything
  // under /hackathons/ except the list page itself.
  const showHackathonSidebar =
    pathname.includes('/hackathons/') && !pathname.endsWith('/hackathons');
  const getOrgIdFromPath = () => {
    if (pathname.startsWith('/organizations/')) {
      const pathParts = pathname.split('/');
      const orgId = pathParts[2];
      if (orgId && /^[a-f0-9]{24}$/.test(orgId)) {
        return orgId;
      }
    }
    return null;
  };

  const initialOrgId = getOrgIdFromPath();

  return (
    <OrganizationProvider initialOrgId={initialOrgId || undefined}>
      <NavigationLoadingProvider>
        <OrganizationsLayoutContent
          showOrganizationSidebar={showOrganizationSidebar}
          showNewGrantSidebar={showNewGrantSidebar}
          showHackathonSidebar={showHackathonSidebar}
          initialOrgId={initialOrgId}
        >
          {children}
        </OrganizationsLayoutContent>
      </NavigationLoadingProvider>
    </OrganizationProvider>
  );
}

function OrganizationsLayoutContent({
  children,
  showOrganizationSidebar,
  showNewGrantSidebar,
  showHackathonSidebar,
  initialOrgId,
}: {
  children: React.ReactNode;
  showOrganizationSidebar: boolean;
  showNewGrantSidebar: boolean;
  showHackathonSidebar: boolean;
  initialOrgId: string | null;
}) {
  const { isNavigating } = useNavigationLoading();

  return (
    <div className='bg-background-main-bg relative min-h-screen text-white'>
      {isNavigating && <HackathonNavigationLoader />}
      <OrganizationHeader />
      {showOrganizationSidebar ? (
        <div className='relative border-t border-t-zinc-800'>
          {showOrganizationSidebar &&
            !showNewGrantSidebar &&
            !showHackathonSidebar && <OrganizationSidebar />}
          {showHackathonSidebar && (
            <HackathonSidebar organizationId={initialOrgId || undefined} />
          )}
          {/* {showNewGrantSidebar && <NewGrantSidebar />} */}

          <main
            className={cn(
              'md:ml-[280px]',
              showOrganizationSidebar && 'pt-20 md:pt-0'
            )}
          >
            {children}
          </main>
        </div>
      ) : (
        <main>{children}</main>
      )}
    </div>
  );
}
