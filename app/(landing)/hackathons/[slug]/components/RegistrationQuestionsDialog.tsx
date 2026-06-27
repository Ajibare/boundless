'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BoundlessButton } from '@/components/buttons';
import { cn } from '@/lib/utils';
import {
  listPublicCustomQuestions,
  type CustomQuestion,
} from '@/lib/api/hackathons/custom-questions';

/**
 * Cached fetch of a hackathon's REGISTRATION-scope custom questions. The
 * register buttons use this to decide whether registration needs a form
 * (questions present) or can join directly (none).
 */
export function useRegistrationQuestions(slug: string) {
  return useQuery({
    queryKey: ['hackathon', 'custom-questions', slug, 'REGISTRATION'],
    queryFn: () => listPublicCustomQuestions(slug, 'REGISTRATION'),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

interface RegistrationQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: CustomQuestion[];
  submitting?: boolean;
  /** Persist + join. Resolve to close the dialog; reject to keep it open. */
  onSubmit: (answers: Record<string, string | string[]>) => Promise<void>;
}

export default function RegistrationQuestionsDialog({
  open,
  onOpenChange,
  questions,
  submitting,
  onSubmit,
}: RegistrationQuestionsDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Reset the form each time the dialog opens so a cancelled attempt does not
  // leak into the next one.
  useEffect(() => {
    if (open) setAnswers({});
  }, [open]);

  const setAnswer = (id: string, val: string | string[]) =>
    setAnswers(prev => ({ ...prev, [id]: val }));

  const handleSubmit = async () => {
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      const empty = Array.isArray(v)
        ? v.length === 0
        : !v || String(v).trim() === '';
      if (empty) {
        toast.error(`"${q.label}" is required.`);
        return;
      }
    }
    await onSubmit(answers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>A few questions before you register</DialogTitle>
          <DialogDescription>
            The organizer asks these when you join.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {questions.map(q => {
            const options = Array.isArray(q.options) ? q.options : [];
            const raw = answers[q.id];
            const strVal = typeof raw === 'string' ? raw : '';
            const arrVal = Array.isArray(raw) ? raw : [];
            return (
              <div key={q.id} className='space-y-1.5'>
                <label className='block text-sm font-medium text-white'>
                  {q.label}
                  {q.required && <span className='text-red-400'> *</span>}
                </label>
                {q.type === 'LONG' ? (
                  <Textarea
                    value={strVal}
                    maxLength={q.maxLength ?? undefined}
                    placeholder='Your answer'
                    className='min-h-[90px]'
                    onChange={e => setAnswer(q.id, e.target.value)}
                  />
                ) : q.type === 'SINGLE_SELECT' ? (
                  <select
                    value={strVal}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    className='w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white'
                  >
                    <option value=''>Select an option</option>
                    {options.map(o => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : q.type === 'MULTI_SELECT' ? (
                  <div className='flex flex-wrap gap-2'>
                    {options.map(o => {
                      const on = arrVal.includes(o);
                      return (
                        <button
                          key={o}
                          type='button'
                          onClick={() =>
                            setAnswer(
                              q.id,
                              on ? arrVal.filter(v => v !== o) : [...arrVal, o]
                            )
                          }
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs transition-colors',
                            on
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                          )}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                ) : q.type === 'BOOLEAN' ? (
                  <label className='flex items-center gap-2 text-sm text-zinc-300'>
                    <input
                      type='checkbox'
                      checked={strVal === 'true'}
                      onChange={e =>
                        setAnswer(q.id, e.target.checked ? 'true' : 'false')
                      }
                      className='h-4 w-4'
                    />
                    Yes
                  </label>
                ) : (
                  <Input
                    value={strVal}
                    type={q.type === 'URL' ? 'url' : 'text'}
                    maxLength={q.maxLength ?? undefined}
                    placeholder={
                      q.type === 'URL' ? 'https://...' : 'Your answer'
                    }
                    onChange={e => setAnswer(q.id, e.target.value)}
                  />
                )}
                {q.helpText && (
                  <p className='text-xs text-zinc-500'>{q.helpText}</p>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <BoundlessButton
            type='button'
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            Register
          </BoundlessButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
