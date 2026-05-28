import { analytics } from "./analytics";

interface FetchRetryOptions {
  retries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
}

/**
 * Perform a fetch network call with recursive exponential backoff retry.
 * Handles transient network dropouts elegantly.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: FetchRetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    factor = 2,
  } = retryOptions;

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If server returns a server-side transient code, retry
      if (response.status >= 500 && attempt <= retries) {
        throw new Error(`Server returned status ${response.status}`);
      }
      
      return response;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt > retries) {
        break;
      }
      
      const currentDelay = Math.min(delay, maxDelayMs);
      console.warn(
        `API Client: Attempt ${attempt} failed for URL "${url}". Retrying in ${currentDelay}ms... Error: ${lastError.message}`
      );
      
      // Log retry to analytics
      analytics.logEvent("network_retry", {
        url,
        attempt,
        delayMs: currentDelay,
        error: lastError.message,
      });

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      delay *= factor;
    }
  }

  // Report hard failure to analytics
  analytics.logError(
    lastError || new Error(`Failed to fetch after ${retries} retries`),
    { url }
  );

  throw lastError || new Error(`Network request failed after ${retries} attempts`);
}
