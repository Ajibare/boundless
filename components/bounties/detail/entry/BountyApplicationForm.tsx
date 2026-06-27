'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { BoundlessButton } from '@/components/buttons';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ApplicationEntryType,
  ApplicationFormData,
  MAX_LINKS,
  countWords,
  emptyApplicationForm,
  makeApplicationSchema,
} from './applicationSchema';

interface BountyApplicationFormProps {
  entryType: ApplicationEntryType;
  initialData?: Partial<ApplicationFormData>;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (data: ApplicationFormData) => void;
  onCancel?: () => void;
}

export default function BountyApplicationForm({
  entryType,
  initialData,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: BountyApplicationFormProps) {
  const isFull = entryType === 'APPLICATION_FULL';
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(makeApplicationSchema(entryType)),
    defaultValues: { ...emptyApplicationForm, ...initialData },
  });

  const proposalField = isFull ? 'proposalFull' : 'proposalShort';
  const words = countWords(form.watch(proposalField) ?? '');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
        {/* Proposal */}
        <FormField
          control={form.control}
          name={proposalField}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm font-medium text-white'>
                {isFull ? 'Full proposal' : 'Proposal'}
                <span className='text-red-500'>*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={
                    isFull
                      ? 'Describe your approach, plan, and what done looks like (500–2000 words).'
                      : 'Outline how you would tackle this (100–300 words).'
                  }
                  className='min-h-40 resize-y border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600'
                />
              </FormControl>
              <p className='text-xs text-zinc-500'>{words} words</p>
              <FormMessage className='text-xs text-red-500' />
            </FormItem>
          )}
        />

        {/* Light: estimated days */}
        {!isFull && (
          <FormField
            control={form.control}
            name='estimatedDays'
            render={({ field }) => (
              <FormItem className='max-w-40'>
                <FormLabel className='text-sm font-medium text-white'>
                  Estimated days<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type='number'
                    min={1}
                    max={365}
                    placeholder='14'
                    className='h-10 border-zinc-800 bg-zinc-900/50 text-white'
                  />
                </FormControl>
                <FormMessage className='text-xs text-red-500' />
              </FormItem>
            )}
          />
        )}

        {/* Full: qualifications */}
        {isFull && (
          <FormField
            control={form.control}
            name='qualifications'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm font-medium text-white'>
                  Qualifications<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Relevant experience and why you're a fit."
                    className='min-h-24 resize-y border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600'
                  />
                </FormControl>
                <FormMessage className='text-xs text-red-500' />
              </FormItem>
            )}
          />
        )}

        {/* Portfolio links */}
        <FormField
          control={form.control}
          name='portfolioLinksRaw'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm font-medium text-white'>
                Portfolio links{' '}
                <span className='text-zinc-500'>
                  (one per line, up to {MAX_LINKS[entryType]})
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={'https://github.com/you/project\nhttps://...'}
                  className='min-h-20 resize-y border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600'
                />
              </FormControl>
              <FormMessage className='text-xs text-red-500' />
            </FormItem>
          )}
        />

        {/* Full: video intro */}
        {isFull && (
          <FormField
            control={form.control}
            name='videoIntroUrl'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm font-medium text-white'>
                  Video intro <span className='text-zinc-500'>(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type='url'
                    placeholder='https://...'
                    className='h-10 border-zinc-800 bg-zinc-900/50 text-white'
                  />
                </FormControl>
                <FormMessage className='text-xs text-red-500' />
              </FormItem>
            )}
          />
        )}

        <div className='flex items-center justify-end gap-3 pt-2'>
          {onCancel && (
            <BoundlessButton
              type='button'
              variant='outline'
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </BoundlessButton>
          )}
          <BoundlessButton
            type='submit'
            disabled={isSubmitting}
            className='min-w-32'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Submitting...
              </>
            ) : (
              submitLabel
            )}
          </BoundlessButton>
        </div>
      </form>
    </Form>
  );
}
