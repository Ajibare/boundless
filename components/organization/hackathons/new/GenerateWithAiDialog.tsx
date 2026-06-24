'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { BoundlessButton } from '@/components/buttons';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ApiError } from '@/lib/api';
import { useGenerateDraftFromBrief } from '@/features/hackathons';

const briefSchema = z.object({
  brief: z
    .string()
    .trim()
    .min(10, 'Add a little more detail (at least 10 characters).')
    .max(2000, 'Keep the brief under 2000 characters.'),
  budgetCapUsdc: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, 'Enter a number, e.g. 10000.'),
  earliestStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick an earliest start date.'),
});

type BriefForm = z.infer<typeof briefSchema>;

// Friendly status lines cycled during the ~20s generation so the wait reads as
// deliberate progress rather than a hung spinner.
const PROGRESS_STEPS = [
  'Reading your brief…',
  'Shaping tracks and prizes…',
  'Drafting judging criteria…',
  'Laying out the timeline…',
  'Finalizing your draft…',
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface GenerateWithAiDialogProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GenerateWithAiDialog({
  organizationId,
  open,
  onOpenChange,
}: GenerateWithAiDialogProps) {
  const router = useRouter();
  const generate = useGenerateDraftFromBrief(organizationId);
  const [progressStep, setProgressStep] = useState(0);

  const form = useForm<BriefForm>({
    resolver: zodResolver(briefSchema),
    defaultValues: { brief: '', budgetCapUsdc: '', earliestStart: todayIso() },
  });

  const isGenerating = generate.isPending;

  // Cycle the progress copy while the request is in flight.
  useEffect(() => {
    if (!isGenerating) {
      setProgressStep(0);
      return;
    }
    const id = setInterval(() => {
      setProgressStep(step => Math.min(step + 1, PROGRESS_STEPS.length - 1));
    }, 4000);
    return () => clearInterval(id);
  }, [isGenerating]);

  const handleClose = (next: boolean) => {
    // Don't let the organizer dismiss mid-generation and orphan the request.
    if (isGenerating) return;
    if (!next)
      form.reset({ ...form.getValues(), brief: form.getValues().brief });
    onOpenChange(next);
  };

  const onSubmit = async (values: BriefForm) => {
    try {
      const result = await generate.mutateAsync(values);
      toast.success('Draft generated. Review and publish when ready.');
      onOpenChange(false);
      router.push(
        `/organizations/${organizationId}/hackathons/drafts/${result.draftId}`
      );
    } catch (err) {
      handleGenerateError(err);
    }
  };

  const handleGenerateError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 503) {
        toast.error('The AI assistant is busy right now.', {
          description: 'You can start your hackathon manually instead.',
          action: {
            label: 'Start manually',
            onClick: () => {
              onOpenChange(false);
              router.push(`/organizations/${organizationId}/hackathons/new`);
            },
          },
        });
        return;
      }
      if (err.status === 429) {
        toast.error(
          err.message || 'AI usage limit reached for this organization.'
        );
        return;
      }
      const fieldError = err.fieldErrors?.[0];
      toast.error(
        fieldError?.message ||
          err.message ||
          'Could not generate a draft. Please try again.'
      );
      return;
    }
    toast.error('Could not generate a draft. Please try again.');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Sparkles className='text-primary h-5 w-5' />
            Generate with AI
          </DialogTitle>
          <DialogDescription>
            Describe your hackathon in a sentence or two. We&apos;ll draft the
            tracks, prizes, judging criteria, and timeline for you to review and
            edit.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className='flex flex-col items-center justify-center gap-4 py-10'>
            <LoadingSpinner size='lg' variant='spinner' color='primary' />
            <p className='text-sm text-gray-400'>
              {PROGRESS_STEPS[progressStep]}
            </p>
            <p className='text-xs text-gray-600'>
              This usually takes 15–30 seconds.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='brief'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder='A two-week hackathon for AI agent tooling on Stellar, aimed at indie builders.'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='budgetCapUsdc'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize budget (USDC)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode='decimal'
                          placeholder='10000'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='earliestStart'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Earliest start</FormLabel>
                      <FormControl>
                        <Input {...field} type='date' min={todayIso()} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className='gap-2 sm:gap-0'>
                <BoundlessButton
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </BoundlessButton>
                <BoundlessButton
                  type='submit'
                  icon={<Sparkles className='h-4 w-4' />}
                  iconPosition='left'
                >
                  Generate draft
                </BoundlessButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
