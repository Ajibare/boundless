'use client';

import React from 'react';

export const RewardsPageHeader: React.FC = () => {
  return (
    <div className='mb-8'>
      <h1 className='text-2xl font-semibold text-white sm:text-3xl'>Winners</h1>
      <p className='mt-2 text-sm text-gray-400'>
        Pick a winner for each prize, confirm them, then pay out.
      </p>
    </div>
  );
};
