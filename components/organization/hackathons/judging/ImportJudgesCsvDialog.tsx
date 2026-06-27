'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { UploadCloud, Download, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BoundlessButton } from '@/components/buttons';
import {
  bulkInviteJudges,
  type BulkInviteResult,
  type InviteJudgePayload,
} from '@/lib/api/judge';

const MAX_ROWS = 25; // matches the backend BulkInviteJudgesDto cap
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TEMPLATE_CSV =
  'Invitation Email,Judge Name,Judge Title\n' +
  'john@example.com,John Doe,Lead Engineer\n';

/**
 * Minimal RFC-4180-ish CSV tokenizer: handles quoted fields containing
 * commas, newlines, and escaped double-quotes ("").
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

/**
 * Map the template's columns (Invitation Email / Judge Name / Judge Title) and
 * yield invite rows. Rows whose email is not a valid address are skipped, which
 * also drops the template's header and any instruction/sample rows.
 */
function rowsToInvites(rows: string[][]): InviteJudgePayload[] {
  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const emailIdx = header.findIndex(h => h.includes('email'));
  const nameIdx = header.findIndex(h => h.includes('name'));
  const titleIdx = header.findIndex(h => h.includes('title'));
  // No recognizable email header -> treat the first row as data too.
  const dataRows = emailIdx >= 0 ? rows.slice(1) : rows;
  const eIdx = emailIdx >= 0 ? emailIdx : 0;

  const invites: InviteJudgePayload[] = [];
  for (const r of dataRows) {
    const email = (r[eIdx] ?? '').trim();
    if (!EMAIL_RE.test(email)) continue;
    const displayName = nameIdx >= 0 ? (r[nameIdx] ?? '').trim() : '';
    const title = titleIdx >= 0 ? (r[titleIdx] ?? '').trim() : '';
    invites.push({
      email,
      ...(displayName ? { displayName } : {}),
      ...(title ? { title } : {}),
    });
  }
  return invites;
}

interface ImportJudgesCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  hackathonId: string;
  onImported?: () => void;
}

export default function ImportJudgesCsvDialog({
  open,
  onOpenChange,
  organizationId,
  hackathonId,
  onImported,
}: ImportJudgesCsvDialogProps) {
  const [invites, setInvites] = useState<InviteJudgePayload[]>([]);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setInvites([]);
    setFileName('');
    setResult(null);
  };

  const handleFile = async (file: File) => {
    setResult(null);
    try {
      const text = await file.text();
      const parsed = rowsToInvites(parseCsv(text));
      if (parsed.length === 0) {
        toast.error('No valid rows found. Check the email column.');
        setInvites([]);
        setFileName(file.name);
        return;
      }
      if (parsed.length > MAX_ROWS) {
        toast.warning(`Only the first ${MAX_ROWS} rows will be imported.`);
      }
      setInvites(parsed.slice(0, MAX_ROWS));
      setFileName(file.name);
    } catch {
      toast.error('Could not read that file.');
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'judges-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (invites.length === 0) return;
    setSubmitting(true);
    try {
      const res = await bulkInviteJudges(organizationId, hackathonId, invites);
      const data = res.data;
      if (!data) {
        toast.error('Import failed: empty response.');
        return;
      }
      setResult(data);
      onImported?.();
      if (data.invited > 0) {
        toast.success(`Invited ${data.invited} judge(s).`);
      }
      if (data.failed > 0) {
        toast.warning(`${data.failed} row(s) could not be invited.`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to import judges.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className='max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Import judges from CSV</DialogTitle>
          <DialogDescription>
            Columns: Invitation Email, Judge Name, Judge Title. Up to {MAX_ROWS}{' '}
            per import.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <button
            type='button'
            onClick={downloadTemplate}
            className='text-primary inline-flex items-center gap-1.5 text-sm hover:underline'
          >
            <Download className='h-4 w-4' /> Download template
          </button>

          <button
            type='button'
            onClick={() => fileInputRef.current?.click()}
            className='border-primary/30 hover:border-primary/60 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed bg-zinc-900/30 px-6 py-8 text-center transition-colors'
          >
            <UploadCloud className='text-primary h-7 w-7' />
            <span className='text-sm font-medium text-white'>
              {fileName || 'Choose a CSV file'}
            </span>
            <span className='text-xs text-zinc-500'>
              {invites.length > 0
                ? `${invites.length} valid row(s) detected`
                : 'Click to browse'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type='file'
            accept='.csv,text/csv'
            className='hidden'
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />

          {/* Per-row results after submit */}
          {result && (
            <div className='space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3'>
              {result.results.map(r => (
                <div
                  key={r.email}
                  className='flex items-center gap-2 text-sm'
                  title={r.reason}
                >
                  {r.status === 'invited' ? (
                    <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-400' />
                  ) : (
                    <XCircle className='h-4 w-4 shrink-0 text-red-400' />
                  )}
                  <span className='truncate text-zinc-300'>{r.email}</span>
                  {r.reason && (
                    <span className='truncate text-xs text-zinc-500'>
                      {r.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className='flex justify-end gap-2 pt-1'>
            {result ? (
              <Button
                variant='outline'
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            ) : (
              <BoundlessButton
                type='button'
                loading={submitting}
                disabled={invites.length === 0}
                onClick={handleSubmit}
              >
                Send {invites.length > 0 ? invites.length : ''} invitation
                {invites.length === 1 ? '' : 's'}
              </BoundlessButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
