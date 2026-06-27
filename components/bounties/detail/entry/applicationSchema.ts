import { z } from 'zod';

import type {
  CreateBountyApplicationRequest,
  EditBountyApplicationRequest,
} from '@/features/bounties';

export type ApplicationEntryType = 'APPLICATION_LIGHT' | 'APPLICATION_FULL';

const WORD_BOUNDS = {
  APPLICATION_LIGHT: { min: 100, max: 300 },
  APPLICATION_FULL: { min: 500, max: 2000 },
} as const;

export const MAX_LINKS = {
  APPLICATION_LIGHT: 3,
  APPLICATION_FULL: 6,
} as const;

export const countWords = (s: string): number =>
  s.trim() ? s.trim().split(/\s+/).length : 0;

/** Parse a "one link per line" textarea into a trimmed, non-empty list. */
export const parseLinks = (raw: string): string[] =>
  raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

const isUrl = (s: string): boolean => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

export interface ApplicationFormData {
  proposalShort: string;
  proposalFull: string;
  qualifications: string;
  estimatedDays: string;
  portfolioLinksRaw: string;
  videoIntroUrl: string;
}

export const emptyApplicationForm: ApplicationFormData = {
  proposalShort: '',
  proposalFull: '',
  qualifications: '',
  estimatedDays: '',
  portfolioLinksRaw: '',
  videoIntroUrl: '',
};

/** Mode-aware application validation, mirroring the backend per-entry-type rules. */
export function makeApplicationSchema(entryType: ApplicationEntryType) {
  const isFull = entryType === 'APPLICATION_FULL';
  const maxLinks = MAX_LINKS[entryType];

  return z
    .object({
      proposalShort: z.string(),
      proposalFull: z.string(),
      qualifications: z.string(),
      estimatedDays: z.string(),
      portfolioLinksRaw: z.string(),
      videoIntroUrl: z.string(),
    })
    .superRefine((data, ctx) => {
      if (isFull) {
        const words = countWords(data.proposalFull);
        const { min, max } = WORD_BOUNDS.APPLICATION_FULL;
        if (words < min || words > max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['proposalFull'],
            message: `Full proposal must be ${min}–${max} words (currently ${words}).`,
          });
        }
        if (data.qualifications.trim().length < 50) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['qualifications'],
            message: 'Qualifications must be at least 50 characters.',
          });
        }
        if (data.videoIntroUrl.trim() && !isUrl(data.videoIntroUrl.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['videoIntroUrl'],
            message: 'Enter a valid URL.',
          });
        }
      } else {
        const words = countWords(data.proposalShort);
        const { min, max } = WORD_BOUNDS.APPLICATION_LIGHT;
        if (words < min || words > max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['proposalShort'],
            message: `Proposal must be ${min}–${max} words (currently ${words}).`,
          });
        }
        const days = Number(data.estimatedDays);
        if (
          !data.estimatedDays.trim() ||
          Number.isNaN(days) ||
          days < 1 ||
          days > 365
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['estimatedDays'],
            message: 'Enter an estimate between 1 and 365 days.',
          });
        }
      }

      const links = parseLinks(data.portfolioLinksRaw);
      if (links.length > maxLinks) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['portfolioLinksRaw'],
          message: `Up to ${maxLinks} links allowed.`,
        });
      }
      if (links.some(l => !isUrl(l))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['portfolioLinksRaw'],
          message: 'Each line must be a valid URL.',
        });
      }
    });
}

/** Build the POST body from the form (applicantAddress added by the caller). */
export function toCreateBody(
  entryType: ApplicationEntryType,
  data: ApplicationFormData,
  applicantAddress: string
): CreateBountyApplicationRequest {
  const links = parseLinks(data.portfolioLinksRaw);
  if (entryType === 'APPLICATION_FULL') {
    return {
      applicantAddress,
      proposalFull: data.proposalFull.trim(),
      qualifications: data.qualifications.trim(),
      portfolioLinks: links,
      videoIntroUrl: data.videoIntroUrl.trim() || undefined,
    };
  }
  return {
    applicantAddress,
    proposalShort: data.proposalShort.trim(),
    estimatedDays: Number(data.estimatedDays),
    portfolioLinks: links,
  };
}

/** Build the PATCH body (no applicantAddress; edit only mutates proposal fields). */
export function toEditBody(
  entryType: ApplicationEntryType,
  data: ApplicationFormData
): EditBountyApplicationRequest {
  const links = parseLinks(data.portfolioLinksRaw);
  if (entryType === 'APPLICATION_FULL') {
    return {
      proposalFull: data.proposalFull.trim(),
      qualifications: data.qualifications.trim(),
      portfolioLinks: links,
      videoIntroUrl: data.videoIntroUrl.trim() || undefined,
    };
  }
  return {
    proposalShort: data.proposalShort.trim(),
    estimatedDays: Number(data.estimatedDays),
    portfolioLinks: links,
  };
}
