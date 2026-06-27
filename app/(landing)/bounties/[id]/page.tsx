import { Metadata } from 'next';

import { generatePageMetadata } from '@/lib/metadata';
import BountyDetail from '@/components/bounties/detail/BountyDetail';

export const metadata: Metadata = generatePageMetadata('bounties');

interface BountyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BountyDetailPageRoute({
  params,
}: BountyDetailPageProps) {
  const { id } = await params;

  return (
    <div className='relative mx-auto min-h-screen max-w-[1440px] px-5 py-8 md:px-[50px] lg:px-[100px]'>
      <BountyDetail id={id} />
    </div>
  );
}
