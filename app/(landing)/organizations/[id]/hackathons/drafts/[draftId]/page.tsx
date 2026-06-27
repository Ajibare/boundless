import React, { Suspense } from 'react';
import NewHackathonTab from '@/components/organization/hackathons/new/NewHackathonTab';
import { AuthGuard } from '@/components/auth';
import Loading from '@/components/Loading';

interface DraftPageProps {
  params: Promise<{
    id: string;
    draftId: string;
  }>;
}

const DraftPage = async ({ params }: DraftPageProps) => {
  const { id, draftId } = await params;

  return (
    <AuthGuard redirectTo='/auth?mode=signin' fallback={<Loading />}>
      <div>
        <Suspense fallback={<Loading />}>
          <NewHackathonTab organizationId={id} draftId={draftId} />
        </Suspense>
      </div>
    </AuthGuard>
  );
};

export default DraftPage;
