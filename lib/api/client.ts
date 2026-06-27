import createClient, { type Middleware } from 'openapi-fetch';

import type { ApiFieldError, ApiMeta, paths } from './openapi';

/**
 * Single typed API client (modeled on boundless-platform's `@/lib/api`). New and
 * migrated code calls the backend through `apiClient` + `unwrapData`; the
 * response-envelope unwrap and error normalization live here so feature hooks
 * stay one line. The legacy axios client (`lib/api/api.ts`) stays for code that
 * hasn't migrated yet.
 *
 * The backend wraps every REST response in `{ success, message, data, meta }`
 * while the generated types describe the inner `data`. The middleware unwraps
 * the envelope before openapi-fetch parses the body; `meta` (pagination,
 * requestId) is stashed per-response and read back with `getResponseMeta`.
 *
 * Base URL: v1's auth (better-auth) + axios are cross-origin against the backend
 * (the session cookie lives on the backend domain), so this client targets the
 * same absolute backend origin with `credentials: 'include'`. A same-origin Next
 * rewrite would drop that cookie; adopting it requires migrating auth same-origin
 * first (a later step).
 */
const backendOrigin = (
  process.env.NEXT_PUBLIC_API_URL || 'https://staging-api.boundlessfi.xyz'
)
  .replace(/\/$/, '')
  .replace(/\/api$/i, '');

const metaStore = new WeakMap<Response, ApiMeta>();

interface SuccessEnvelope {
  success: true;
  message?: string;
  data?: unknown;
  meta?: ApiMeta;
}

interface ErrorEnvelope {
  success: false;
  message?: string;
  errors?: ApiFieldError[];
  meta?: ApiMeta;
}

function isEnvelope(value: unknown): value is SuccessEnvelope | ErrorEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  );
}

function rebuild(payload: unknown, source: Response, meta?: ApiMeta): Response {
  const headers = new Headers(source.headers);
  // Body size changes after unwrapping, so let the runtime recompute it.
  headers.delete('content-length');
  headers.set('content-type', 'application/json');

  const next = new Response(JSON.stringify(payload ?? null), {
    status: source.status,
    statusText: source.statusText,
    headers,
  });

  if (meta) {
    metaStore.set(next, meta);
  }

  return next;
}

const envelopeMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return undefined;
    }

    const body = await response
      .clone()
      .json()
      .catch(() => undefined);

    if (!isEnvelope(body)) {
      return undefined;
    }

    if (body.success) {
      return rebuild(body.data ?? null, response, body.meta);
    }

    return rebuild(
      { message: body.message ?? 'Request failed', errors: body.errors ?? [] },
      response,
      body.meta
    );
  },
};

export const apiClient = createClient<paths>({
  baseUrl: backendOrigin,
  credentials: 'include',
});

apiClient.use(envelopeMiddleware);

/** Read the `meta` block (pagination, requestId) for a completed response. */
export function getResponseMeta(response: Response): ApiMeta | undefined {
  return metaStore.get(response);
}

/** Normalized error thrown by feature hooks when a request fails. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: ApiFieldError[];
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    fieldErrors: ApiFieldError[] = [],
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
  }
}

/** Build an `ApiError` from a normalized openapi-fetch error and its response. */
export function toApiError(error: unknown, response: Response): ApiError {
  const meta = getResponseMeta(response);

  if (error && typeof error === 'object') {
    const body = error as { message?: string; errors?: ApiFieldError[] };
    return new ApiError(
      body.message ?? 'Request failed',
      response.status,
      body.errors ?? [],
      meta?.requestId
    );
  }

  return new ApiError('Request failed', response.status, [], meta?.requestId);
}

interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Unwrap an openapi-fetch result: return the typed `data`, or throw an
 * `ApiError` built from the normalized error envelope. Use inside query and
 * mutation functions so feature hooks stay a single line.
 */
export function unwrapData<T>(result: ApiResult<T>): T {
  if (result.error) {
    throw toApiError(result.error, result.response);
  }

  return result.data as T;
}
