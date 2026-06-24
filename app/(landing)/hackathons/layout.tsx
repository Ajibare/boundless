import { HackathonDataProvider } from '@/lib/providers/hackathonProvider';
import { use } from 'react';

interface HackathonLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug?: string;
  }>;
}

export default function HackathonLayout({
  children,
  params,
}: HackathonLayoutProps) {
  const resolvedParams = use(params);

  // No OrganizationProvider here: the participant hackathons pages are public
  // and nothing in this subtree consumes org context. Mounting it only fired
  // stray getMe / getOrganization calls on browse pages. Org-management routes
  // keep their own provider under /organizations.
  return (
    <HackathonDataProvider hackathonSlug={resolvedParams.slug ?? ''}>
      {children}
    </HackathonDataProvider>
  );
}
