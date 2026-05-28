/**
 * Centralized logging and mock analytics tracker.
 * Catches silent catch errors, tracks user events, and registers network errors.
 */
export interface ErrorLogEntry {
  timestamp: number;
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface EventLogEntry {
  timestamp: number;
  eventName: string;
  params?: Record<string, any>;
}

class AnalyticsService {
  private errorLogs: ErrorLogEntry[] = [];
  private eventLogs: EventLogEntry[] = [];
  private readonly MAX_LOGS = 100;

  /**
   * Safe centralized error logger.
   * Can be connected to third-party endpoints like Sentry in production.
   */
  logError(error: Error | string | unknown, context?: Record<string, any>): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const entry: ErrorLogEntry = {
      timestamp: Date.now(),
      message,
      stack,
      context,
    };

    this.errorLogs.unshift(entry);
    if (this.errorLogs.length > this.MAX_LOGS) {
      this.errorLogs.pop();
    }

    // Output warning with details in console
    console.error("🚨 [Analytics Service: Error Logged]:", entry);
  }

  /**
   * Safe event logger
   */
  logEvent(eventName: string, params?: Record<string, any>): void {
    const entry: EventLogEntry = {
      timestamp: Date.now(),
      eventName,
      params,
    };

    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > this.MAX_LOGS) {
      this.eventLogs.pop();
    }

    // Output message in development console
    if (process.env.NODE_ENV !== "production") {
      console.log(`📊 [Analytics Event: "${eventName}"]:`, params);
    }
  }

  /**
   * Retrieve registered errors (useful for debug overlays or reporting logs)
   */
  getErrorLogs(): ErrorLogEntry[] {
    return [...this.errorLogs];
  }

  /**
   * Retrieve logged events
   */
  getEventLogs(): EventLogEntry[] {
    return [...this.eventLogs];
  }

  /**
   * Wipe logging buffers
   */
  clearLogs(): void {
    this.errorLogs = [];
    this.eventLogs = [];
  }
}

export const analytics = new AnalyticsService();
export default analytics;
