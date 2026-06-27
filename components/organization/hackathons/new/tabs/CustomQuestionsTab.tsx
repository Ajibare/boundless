'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, ClipboardList } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BoundlessButton } from '@/components/buttons';
import {
  listCustomQuestions,
  replaceCustomQuestions,
  type CustomQuestion,
  type CustomQuestionScope,
  type CustomQuestionType,
  type CustomQuestionWrite,
} from '@/lib/api/hackathons/custom-questions';

/**
 * Custom Questions section of the create wizard (after Rewards). Organizer
 * authors extra questions asked at registration or on submission, distinct
 * from the per-track questions. Self-contained: fetches its own set on mount
 * and saves the whole set via a delete-and-recreate PUT, the same pattern as
 * the Tracks section. SUBMISSION questions render on the submission form;
 * REGISTRATION questions at registration time.
 */
interface CustomQuestionsTabProps {
  organizationId?: string;
  hackathonId?: string;
  onContinue?: () => void;
  /** Jumps to the Information step so the organizer can create the draft. */
  onGoToInformation?: () => void;
}

interface LocalQuestion {
  key: string;
  scope: CustomQuestionScope;
  label: string;
  helpText: string;
  type: CustomQuestionType;
  required: boolean;
  options: string; // comma-joined while editing
  maxLength: string;
}

const TYPE_OPTIONS: { value: CustomQuestionType; label: string }[] = [
  { value: 'SHORT', label: 'Short text' },
  { value: 'LONG', label: 'Long text' },
  { value: 'URL', label: 'URL' },
  { value: 'SINGLE_SELECT', label: 'Single choice' },
  { value: 'MULTI_SELECT', label: 'Multiple choice' },
  { value: 'BOOLEAN', label: 'Yes / No' },
];

const SELECT_TYPES: CustomQuestionType[] = ['SINGLE_SELECT', 'MULTI_SELECT'];
const LENGTH_TYPES: CustomQuestionType[] = ['SHORT', 'LONG'];

let _uid = 0;
const uid = () => `q_${(_uid++).toString(36)}`;

const selectClass =
  'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none';

function emptyQuestion(
  scope: CustomQuestionScope = 'SUBMISSION'
): LocalQuestion {
  return {
    key: uid(),
    scope,
    label: '',
    helpText: '',
    type: 'SHORT',
    required: false,
    options: '',
    maxLength: '',
  };
}

function fromApi(q: CustomQuestion): LocalQuestion {
  return {
    key: uid(),
    scope: q.scope,
    label: q.label,
    helpText: q.helpText ?? '',
    type: q.type,
    required: q.required ?? false,
    options: Array.isArray(q.options) ? q.options.join(', ') : '',
    maxLength: q.maxLength != null ? String(q.maxLength) : '',
  };
}

function toWrite(q: LocalQuestion, index: number): CustomQuestionWrite {
  const isSelect = SELECT_TYPES.includes(q.type);
  const isLength = LENGTH_TYPES.includes(q.type);
  const max = parseInt(q.maxLength, 10);
  return {
    scope: q.scope,
    label: q.label.trim(),
    helpText: q.helpText.trim() || undefined,
    type: q.type,
    required: q.required,
    options: isSelect
      ? q.options
          .split(',')
          .map(o => o.trim())
          .filter(Boolean)
      : undefined,
    maxLength: isLength && Number.isFinite(max) && max > 0 ? max : undefined,
    displayOrder: index,
  };
}

function validate(questions: LocalQuestion[]): string | null {
  for (const q of questions) {
    if (!q.label.trim()) return 'Every question needs a label.';
    if (SELECT_TYPES.includes(q.type)) {
      const opts = q.options
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
      if (opts.length === 0)
        return `"${q.label || 'Choice question'}" needs at least one option.`;
    }
  }
  return null;
}

export default function CustomQuestionsTab({
  organizationId,
  hackathonId,
  onContinue,
  onGoToInformation,
}: CustomQuestionsTabProps) {
  const ready = !!organizationId && !!hackathonId;
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  const load = useCallback(async () => {
    if (!organizationId || !hackathonId) return;
    setLoading(true);
    try {
      const rows = await listCustomQuestions(organizationId, hackathonId);
      setQuestions(rows.map(fromApi));
    } catch {
      toast.error('Could not load custom questions.');
    } finally {
      setLoading(false);
      initialized.current = true;
    }
  }, [organizationId, hackathonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (key: string, patch: Partial<LocalQuestion>) =>
    setQuestions(prev =>
      prev.map(q => (q.key === key ? { ...q, ...patch } : q))
    );

  const handleSave = async () => {
    const error = validate(questions);
    if (error) {
      toast.error(error);
      return;
    }
    if (organizationId && hackathonId) {
      setSaving(true);
      try {
        await replaceCustomQuestions(
          organizationId,
          hackathonId,
          questions.map(toWrite)
        );
      } catch {
        toast.error('Could not save custom questions.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    onContinue?.();
  };

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium text-white'>Custom questions</h3>
        <p className='mt-1 text-sm text-zinc-500'>
          Extra questions asked at registration or on submission, beyond the
          standard fields. Optional. These are separate from per-track
          questions.
        </p>
      </div>

      {!ready ? (
        <div className='flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center'>
          <ClipboardList className='h-6 w-6 text-zinc-600' />
          <p className='text-sm text-zinc-400'>
            Custom questions unlock once your draft is created.
          </p>
          <p className='text-xs text-zinc-600'>
            Fill in the Information step and save to start adding questions.
          </p>
          {onGoToInformation && (
            <BoundlessButton
              variant='outline'
              size='sm'
              className='mt-2 border-zinc-700'
              onClick={onGoToInformation}
            >
              Go to Information
            </BoundlessButton>
          )}
        </div>
      ) : loading && !initialized.current ? (
        <div className='flex justify-center py-10'>
          <Loader2 className='h-5 w-5 animate-spin text-zinc-500' />
        </div>
      ) : (
        <>
          <div className='space-y-4'>
            {questions.map(q => {
              const isSelect = SELECT_TYPES.includes(q.type);
              const isLength = LENGTH_TYPES.includes(q.type);
              return (
                <div
                  key={q.key}
                  className='space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4'
                >
                  <div className='flex items-start gap-2'>
                    <Input
                      value={q.label}
                      placeholder='Question (e.g. What problem does this solve?)'
                      onChange={e => update(q.key, { label: e.target.value })}
                      className='flex-1'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      aria-label='Remove question'
                      onClick={() =>
                        setQuestions(prev => prev.filter(x => x.key !== q.key))
                      }
                      className='text-zinc-500 hover:text-red-400'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <select
                      value={q.type}
                      onChange={e =>
                        update(q.key, {
                          type: e.target.value as CustomQuestionType,
                        })
                      }
                      className={selectClass}
                      aria-label='Answer type'
                    >
                      {TYPE_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={q.scope}
                      onChange={e =>
                        update(q.key, {
                          scope: e.target.value as CustomQuestionScope,
                        })
                      }
                      className={selectClass}
                      aria-label='When to ask'
                    >
                      <option value='SUBMISSION'>On submission</option>
                      <option value='REGISTRATION'>On registration</option>
                    </select>

                    <label className='flex items-center gap-1.5 text-sm text-zinc-400'>
                      <input
                        type='checkbox'
                        checked={q.required}
                        onChange={e =>
                          update(q.key, { required: e.target.checked })
                        }
                        className='accent-primary h-4 w-4 rounded border-zinc-700 bg-zinc-900'
                      />
                      Required
                    </label>

                    {isLength && (
                      <Input
                        value={q.maxLength}
                        inputMode='numeric'
                        placeholder='Max length'
                        onChange={e =>
                          update(q.key, {
                            maxLength: e.target.value.replace(/[^0-9]/g, ''),
                          })
                        }
                        className='w-32'
                      />
                    )}
                  </div>

                  {isSelect && (
                    <Input
                      value={q.options}
                      placeholder='Options, comma separated (e.g. Web, Mobile, AI)'
                      onChange={e => update(q.key, { options: e.target.value })}
                    />
                  )}

                  <Input
                    value={q.helpText}
                    placeholder='Help text (optional)'
                    onChange={e => update(q.key, { helpText: e.target.value })}
                  />
                </div>
              );
            })}
          </div>

          <Button
            type='button'
            variant='outline'
            onClick={() => setQuestions(prev => [...prev, emptyQuestion()])}
            className='w-full gap-2 border-dashed border-zinc-700 text-zinc-300'
          >
            <Plus className='h-4 w-4' /> Add question
          </Button>
        </>
      )}

      <div className='flex justify-end pt-2'>
        <BoundlessButton type='button' loading={saving} onClick={handleSave}>
          {onContinue ? 'Save & Continue' : 'Save'}
        </BoundlessButton>
      </div>
    </div>
  );
}
