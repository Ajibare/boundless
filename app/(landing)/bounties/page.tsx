import { Metadata } from 'next';

import { generatePageMetadata } from '@/lib/metadata';
import BountiesPage from '@/components/bounties/marketplace/BountiesPage';

export const metadata: Metadata = generatePageMetadata('bounties');

export default function BountiesPageRoute() {
  return (
    <div className='relative mx-auto min-h-screen max-w-[1440px] px-5 py-8 md:px-[50px] lg:px-[100px]'>
      <BountiesPage />
    </div>
  );
}
