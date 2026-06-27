'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { BoundlessButton } from '@/components/buttons';
import { Input } from '@/components/ui/input';
import { verifyHackathonAccess } from '@/lib/api/hackathon';

/**
 * Shown when a private hackathon's public page is opened without access. On a
 * correct password we store a slug-keyed cookie and refresh; the server then
 * reads the cookie, forwards the token, and renders the unlocked page.
 */
export default function AccessGate({
  slug,
  name,
  description,
}: {
  slug: string;
  name: string;
  description?: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    try {
      const { accessToken } = await verifyHackathonAccess(
        slug,
        password.trim()
      );
      if (!accessToken) throw new Error('No access token');
      document.cookie = `hx_access_${slug}=${accessToken}; path=/; max-age=86400; samesite=lax`;
      router.refresh();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || 'That password is not right. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className='flex min-h-[70vh] items-center justify-center px-4'>
      <div className='w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900/40 p-8 text-center'>
        <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800'>
          <Lock className='h-6 w-6 text-gray-300' />
        </div>
        <h1 className='text-xl font-semibold text-white'>{name}</h1>
        <p className='mt-1 text-sm text-gray-400'>
          {description || 'This hackathon is private.'} Enter the password to
          view it.
        </p>
        <form onSubmit={submit} className='mt-6 space-y-3'>
          <Input
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder='Password'
            autoFocus
            className='border-gray-700 bg-black text-center text-white'
          />
          <BoundlessButton
            type='submit'
            fullWidth
            disabled={submitting || !password.trim()}
          >
            <span className='flex items-center justify-center gap-2'>
              {submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
              Unlock
            </span>
          </BoundlessButton>
        </form>
      </div>
    </div>
  );
}
