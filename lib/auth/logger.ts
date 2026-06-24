/* eslint-disable no-console */
import { reportError, reportMessage } from '@/lib/error-reporting';

/**
 * Authentication logger utility
 */
export class AuthLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log authentication events
   */
  static log(event: string, data?: Record<string, unknown>) {
    if (this.isDevelopment) {
      console.log(`[AUTH] ${event}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  /**
   * Log authentication errors (forwarded to the error-reporting service when configured)
   */
  static error(event: string, error: Error, data?: Record<string, unknown>) {
    reportError(error, { context: 'auth', event, ...data });
  }

  /**
   * Log authentication warnings (forwarded to the error-reporting service when configured)
   */
  static warn(event: string, data?: Record<string, unknown>) {
    reportMessage(`[AUTH WARN] ${event}`, 'warning', data);
  }
}
