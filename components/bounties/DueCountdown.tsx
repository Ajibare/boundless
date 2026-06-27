'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

/** Format remaining time to a deadline as "Due in 4d:21h:22m" (null once past). */
export function formatCountdown(
  deadlineIso: string,
  now: number
): string | null {
  const diff = new Date(deadlineIso).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `Due in ${d}d:${h}h:${m}m`;
}

/** Live-ticking due-date countdown (minute granularity). */
export function DueCountdown({
  deadline,
  className = 'flex items-center gap-1.5 text-xs text-zinc-500',
}: {
  deadline: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const label = formatCountdown(deadline, now);
  return (
    <span className={className}>
      <Clock className='h-3.5 w-3.5' />
      {label ?? 'Due date passed'}
    </span>
  );
}
