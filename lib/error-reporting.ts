/**
 * Central error-reporting seam for production observability.
 *
 * A previous third-party error reporter was removed; a new one will be wired in
 * here later. Until then this logs to the console in development and no-ops in
 * production. Call sites (`reportError` / `reportMessage`) stay unchanged when
 * the replacement lands — only this module does.
 */

type ReportContext = Record<string, unknown>;

/**
 * Report an error to the configured error-reporting service.
 * Safe to call from any environment. Currently console-only in development.
 */
export const reportError = (error: unknown, context?: ReportContext): void => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[reportError]', error, context ?? '');
  }
  // TODO: forward to the replacement error-reporting service once configured.
};

/**
 * Report a message (info / warning / error) to the configured error-reporting
 * service. Use for non-exception events you want to track in production.
 */
export const reportMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ReportContext
): void => {
  if (process.env.NODE_ENV === 'development') {
    if (level === 'error') {
      console.error('[reportMessage]', message, context ?? '');
    } else {
      console.warn(`[reportMessage] ${level}:`, message, context ?? '');
    }
  }
  // TODO: forward to the replacement error-reporting service once configured.
};
