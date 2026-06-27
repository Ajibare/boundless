'use client';

import React from 'react';
import { Globe, Mail, MessageCircle, Send, ExternalLink } from 'lucide-react';
import { useHackathonData } from '@/lib/providers/hackathonProvider';

/**
 * Turn a stored Discord value into a usable invite URL. The Collaboration
 * step accepts either a full link or a bare invite code / handle, so we
 * normalise both into `https://discord.gg/<code>`.
 */
function toDiscordUrl(value?: string | null): string | null {
  const s = (value ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const code = s
    .replace(/^@/, '')
    .replace(/^(discord\.gg\/|discord\.com\/invite\/)/i, '');
  return code ? `https://discord.gg/${code}` : null;
}

/** Same idea for Telegram: full link, `t.me/<handle>`, or bare `@handle`. */
function toTelegramUrl(value?: string | null): string | null {
  const s = (value ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const handle = s.replace(/^@/, '').replace(/^(t\.me\/|telegram\.me\/)/i, '');
  return handle ? `https://t.me/${handle}` : null;
}

/** Normalise an arbitrary social link into a valid absolute URL or null. */
function normalizeUrl(value?: string | null): string | null {
  const s = (value ?? '').trim();
  if (!s) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    return new URL(withProto).toString();
  } catch {
    return null;
  }
}

/** Human label for a social link, derived from its hostname. */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface CommunityLink {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function CommunityLinks() {
  const { currentHackathon: hackathon } = useHackathonData();

  if (!hackathon) return null;

  const links: CommunityLink[] = [];

  const discord = toDiscordUrl(hackathon.discord);
  if (discord) {
    links.push({
      key: 'discord',
      label: 'Join Discord',
      href: discord,
      icon: <MessageCircle className='h-4 w-4' />,
    });
  }

  const telegram = toTelegramUrl(hackathon.telegram);
  if (telegram) {
    links.push({
      key: 'telegram',
      label: 'Join Telegram',
      href: telegram,
      icon: <Send className='h-4 w-4' />,
    });
  }

  for (const [i, raw] of (hackathon.socialLinks ?? []).entries()) {
    const href = normalizeUrl(raw);
    if (!href) continue;
    links.push({
      key: `social-${i}`,
      label: hostLabel(href),
      href,
      icon: <Globe className='h-4 w-4' />,
    });
  }

  const contactEmail = (hackathon.contactEmail ?? '').trim();
  const hasContact = contactEmail.length > 0;

  // Nothing collected for this hackathon: render nothing rather than an
  // empty card.
  if (links.length === 0 && !hasContact) return null;

  return (
    <div className='mt-4 overflow-hidden rounded-2xl border border-white/5 bg-linear-to-b from-[#1C1D1B] to-[#07090E]'>
      <div className='border-b border-white/5 px-5 py-3'>
        <p className='text-[10px] font-semibold tracking-widest text-gray-500 uppercase'>
          Community
        </p>
      </div>

      <div className='space-y-2 px-5 py-4'>
        {links.map(link => (
          <a
            key={link.key}
            href={link.href}
            target='_blank'
            rel='noopener noreferrer'
            className='group hover:border-primary/30 hover:bg-primary/10 flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors'
          >
            <span className='group-hover:text-primary text-gray-400'>
              {link.icon}
            </span>
            <span className='min-w-0 flex-1 truncate'>{link.label}</span>
            <ExternalLink className='group-hover:text-primary h-3.5 w-3.5 shrink-0 text-gray-500' />
          </a>
        ))}

        {hasContact && (
          <a
            href={`mailto:${contactEmail}`}
            className='group hover:border-primary/30 hover:bg-primary/10 flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors'
          >
            <span className='group-hover:text-primary text-gray-400'>
              <Mail className='h-4 w-4' />
            </span>
            <span className='min-w-0 flex-1 truncate'>{contactEmail}</span>
          </a>
        )}
      </div>
    </div>
  );
}
