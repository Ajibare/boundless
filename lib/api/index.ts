// Public surface for the modern, OpenAPI-typed data layer (mirrors
// boundless-platform's `@/lib/api`). New + migrated feature code imports from
// here: `import { apiClient, unwrapData, type Schemas } from '@/lib/api'`.
//
// NOTE: legacy code still imports the axios client + hand-written types from the
// explicit paths `@/lib/api/api`, `@/lib/api/hackathons`, etc. Those are being
// migrated to this layer gradually and intentionally left untouched here.
export {
  apiClient,
  unwrapData,
  ApiError,
  toApiError,
  getResponseMeta,
} from './client';

export type {
  Schemas,
  paths,
  components,
  ApiFieldError,
  ApiMeta,
} from './openapi';
