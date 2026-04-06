import { DurableObject } from 'cloudflare:workers';

/**
 * Durable Object that acts as a real-time relay between the iOS app (POST)
 * and overlay SSE consumers.  A single named instance ("default") holds the
 * latest metrics payload and a set of waiting SSE resolvers so every POST
 * immediately wakes all blocked readers.
 */
export class MetricsRelay extends DurableObject {
  private latest: string | null = null;
  private waiters: Set<(value: string) => void> = new Set();

  /** Called by the POST handler — stores the payload and unblocks all SSE readers. */
  async ingest(raw: string): Promise<void> {
    this.latest = raw;
    for (const resolve of this.waiters) {
      resolve(raw);
    }
    this.waiters.clear();
  }

  /** Returns the current payload immediately, or null if nothing has been posted yet. */
  async peek(): Promise<string | null> {
    return this.latest;
  }

  /**
   * Blocks until a new payload arrives (via ingest) or the timeout expires.
   * Returns the new payload, or null on timeout.
   */
  async waitForUpdate(timeoutMs: number): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => {
        this.waiters.delete(resolve);
        resolve(null);
      }, timeoutMs);

      const wrapped = (value: string) => {
        clearTimeout(timer);
        resolve(value);
      };
      this.waiters.add(wrapped);
    });
  }
}
