// Re-exports of the OpenAPI-generated schema. Generated types come from the
// backend spec via `npm run codegen` (do NOT hand-edit lib/api/generated/).
// New/migrated code derives request + response types from `Schemas['<Dto>']`
// instead of hand-writing them.
import type { components, paths } from './generated/schema';

export type { components, paths };

/** All backend DTOs, keyed by name: `Schemas['PublishHackathonEscrowDto']`. */
export type Schemas = components['schemas'];

/** A single field-level validation error in the backend's error envelope. */
export interface ApiFieldError {
  field?: string;
  message: string;
}

/** The `meta` block on the backend's `{ success, message, data, meta }` envelope. */
export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
