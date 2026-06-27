import { Metadata } from 'next';

import { generatePageMetadata } from '@/lib/metadata';
import BountySubmitGate from '@/components/bounties/detail/submit/BountySubmitGate';

export const metadata: Metadata = generatePageMetadata('bounties');

interface BountySubmitPageProps {
  params: Promise<{ id: string }>;
}

export default async function BountySubmitPageRoute({
  params,
}: BountySubmitPageProps) {
  const { id } = await params;

  return (
    <div className='relative mx-auto min-h-screen max-w-[1440px] px-5 py-8 md:px-[50px] lg:px-[100px]'>
      <BountySubmitGate id={id} />
    </div>
  );
}
