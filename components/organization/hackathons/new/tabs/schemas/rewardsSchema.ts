import { z } from 'zod';

export const prizeStructureSchema = z.enum([
  'OVERALL_ONLY',
  'OVERALL_AND_TRACKS',
  'TRACKS_ONLY',
]);
export type PrizeStructure = z.infer<typeof prizeStructureSchema>;

export const prizeTierKindSchema = z.enum(['OVERALL', 'TRACK']);
export type PrizeTierKind = z.infer<typeof prizeTierKindSchema>;

export const prizeTierSchema = z
  .object({
    id: z.string(),
    place: z.string().trim().min(1, 'Place is required'),
    prizeAmount: z
      .string()
      .refine(
        v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
        'Please enter a valid prize amount'
      ),
    description: z.string().optional(),
    currency: z.string().optional().default('USDC'),
    rank: z.number().int().min(1),
    passMark: z.number().min(0).max(100),
    // Optional for backward compatibility — tiers without `kind` are
    // treated as OVERALL by the backend.
    kind: prizeTierKindSchema.optional(),
    // Required when kind=TRACK. References a HackathonTrack on the same
    // hackathon (organizer creates these in the Tracks tab).
    trackId: z.string().optional(),
  })
  .superRefine((tier, ctx) => {
    if (tier.kind === 'TRACK' && !tier.trackId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trackId'],
        message: 'Pick a track for this tier',
      });
    }
    if (tier.kind !== 'TRACK' && tier.trackId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trackId'],
        message: 'Remove the track link or set tier kind to TRACK',
      });
    }
  });

// ── Prize entity write shape (named prizes -> placements -> tracks) ──────────
export const placementWriteSchema = z.object({
  position: z.number().int().min(1),
  label: z.string().optional(),
  amount: z
    .string()
    .refine(
      v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
      'Please enter a valid amount'
    ),
  currency: z.string().optional(),
  passMark: z.number().min(0).max(100).optional(),
});
export type PrizePlacementWrite = z.input<typeof placementWriteSchema>;

export const prizeWriteSchema = z.object({
  name: z.string().trim().min(1, 'Prize name is required'),
  description: z.string().optional(),
  trackIds: z.array(z.string()).default([]),
  placements: z
    .array(placementWriteSchema)
    .min(1, 'Add at least one placement'),
});
export type PrizeWrite = z.input<typeof prizeWriteSchema>;

export const rewardsSchema = z
  .object({
    // Legacy flat tiers (AI / legacy path). Optional now that `prizes` exists.
    prizeTiers: z.array(prizeTierSchema).optional(),
    // Named prizes with placements + linked tracks (the entity write path the
    // backend prefers; it derives prizeTiers as a shadow).
    prizes: z.array(prizeWriteSchema).optional(),
    prizeStructure: prizeStructureSchema.optional(),
    tracksMaxPerSubmission: z.number().int().min(1).max(20).optional(),
    // Org policy: may a project win an overall AND a track prize?
    allowWinnerStacking: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const tierCount = data.prizeTiers?.length ?? 0;
    const prizeCount = data.prizes?.length ?? 0;
    if (tierCount === 0 && prizeCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prizes'],
        message: 'Add at least one prize',
      });
    }
  });

export type PrizeTier = z.infer<typeof prizeTierSchema>;
export type RewardsFormData = z.input<typeof rewardsSchema>;
