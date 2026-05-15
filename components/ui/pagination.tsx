import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className={`flex items-center justify-end px-2 ${className}`}>
      <div className='flex items-center space-x-6 lg:space-x-8'>
        <div className='flex w-[100px] items-center justify-center text-sm font-medium text-white'>
          Page {currentPage} of {totalPages}
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            size='icon'
            className='bg-primary text-primary-foreground hover:bg-primary/90 hidden size-8 lg:flex'
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
          >
            <span className='sr-only'>Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            size='icon'
            className='bg-primary text-primary-foreground hover:bg-primary/90 size-8'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrev}
          >
            <span className='sr-only'>Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            size='icon'
            className='bg-primary text-primary-foreground hover:bg-primary/90 size-8'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
          >
            <span className='sr-only'>Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            size='icon'
            className='bg-primary text-primary-foreground hover:bg-primary/90 hidden size-8 lg:flex'
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
          >
            <span className='sr-only'>Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
