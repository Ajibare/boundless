'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu } from 'lucide-react';
import ResponsiveSidebar from './ResponsiveSidebar';
import ProfileTab from './tabs/ProfileTab';
import LinksTab from './tabs/LinksTab';
import MembersTab from './tabs/MembersTab';
import TransferOwnershipTab from './tabs/TransferOwnershipTab';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

interface OrganizationSettingsProps {
  organizationId?: string;
  initialData?: {
    name?: string;
    slug?: string;
    logo?: string;
    metadata?: {
      tagline?: string;
      about?: string;
    };
  };
  isCreating?: boolean;
}

export default function OrganizationSettings({
  organizationId,
  initialData,
  isCreating = false,
}: OrganizationSettingsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const searchParams = useSearchParams();
  // Allow deep-linking to a tab, e.g. /organizations/:id/settings?tab=members
  const allowedTabs = ['profile', 'links', 'members', 'transfer'];
  const requestedTab = searchParams.get('tab');
  const initialTab =
    requestedTab && allowedTabs.includes(requestedTab) && !isCreating
      ? requestedTab
      : 'profile';

  return (
    <div
      className='flex-1 overflow-hidden bg-black text-white'
      id={organizationId}
    >
      <Tabs defaultValue={initialTab} className='w-full'>
        <div className='border-b border-zinc-800 px-6 md:px-20'>
          <div className='flex items-center gap-4'>
            {!isCreating && (
              <>
                <button
                  onClick={() => setModalOpen(true)}
                  className='rounded-lg p-2 transition-colors hover:bg-zinc-800 md:hidden'
                  aria-label='Open menu'
                >
                  <Menu className='h-5 w-5' />
                </button>
                <div className='h-[50px] w-[0.5px] bg-gray-900 md:hidden' />
              </>
            )}

            <ScrollArea className='w-full'>
              <div className='flex w-max min-w-full'>
                <TabsList className='inline-flex h-auto gap-10 bg-transparent p-0'>
                  <TabsTrigger
                    value='profile'
                    className='data-[state=active]:border-b-primary rounded-none border-b-2 border-transparent bg-transparent px-0 pt-4 pb-3 text-sm font-medium text-zinc-400 transition-all data-[state=active]:text-white data-[state=active]:shadow-none'
                  >
                    Profile
                  </TabsTrigger>
                  {!isCreating && (
                    <>
                      <TabsTrigger
                        value='links'
                        className='data-[state=active]:border-b-primary rounded-none border-b-2 border-transparent bg-transparent px-0 pt-4 pb-3 text-sm font-medium text-zinc-400 transition-all data-[state=active]:text-white data-[state=active]:shadow-none'
                      >
                        Links
                      </TabsTrigger>
                      <TabsTrigger
                        value='members'
                        className='data-[state=active]:border-b-primary rounded-none border-b-2 border-transparent bg-transparent px-0 pt-4 pb-3 text-sm font-medium text-zinc-400 transition-all data-[state=active]:text-white data-[state=active]:shadow-none'
                      >
                        Members &amp; roles
                      </TabsTrigger>
                      <TabsTrigger
                        value='transfer'
                        className='data-[state=active]:border-b-primary rounded-none border-b-2 border-transparent bg-transparent px-0 pt-4 pb-3 text-sm font-medium text-zinc-400 transition-all data-[state=active]:text-white data-[state=active]:shadow-none'
                      >
                        Transfer Ownership
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>
              <ScrollBar orientation='horizontal' className='h-px' />
            </ScrollArea>
          </div>
        </div>

        <div className='px-6 py-6 md:px-20'>
          <TabsContent value='profile' className='mt-0'>
            <ProfileTab
              organizationId={organizationId}
              initialData={initialData}
              isCreating={isCreating}
            />
          </TabsContent>

          {!isCreating && (
            <>
              <TabsContent value='links' className='mt-0'>
                <LinksTab />
              </TabsContent>

              <TabsContent value='members' className='mt-0'>
                <MembersTab />
              </TabsContent>

              <TabsContent value='transfer' className='mt-0'>
                <TransferOwnershipTab />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>

      {!isCreating && (
        <ResponsiveSidebar
          organizationId={organizationId}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </div>
  );
}
