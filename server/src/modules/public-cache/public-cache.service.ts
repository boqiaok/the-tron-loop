import { Injectable } from '@nestjs/common';
import { CacheableMemory } from 'cacheable';

/**
 * Public read responses, kept until the listings behind them change. Writes
 * from other processes (seed and maintenance scripts) are only seen after the
 * day-long expiry or a server restart.
 */
@Injectable()
export class PublicCacheService {
  private readonly responses = new CacheableMemory({
    ttl: '1d',
    lruSize: 1000,
  });
  private generation = 0;

  /** Changes every time cached responses are discarded. */
  get currentGeneration(): number {
    return this.generation;
  }

  get(key: string): unknown {
    return this.responses.get(key);
  }

  /**
   * Stores a response unless the listings changed while it was being built,
   * which would otherwise keep a stale response until the next change.
   */
  set(key: string, value: unknown, builtInGeneration: number): void {
    if (builtInGeneration === this.generation) {
      this.responses.set(key, value);
    }
  }

  clear(): void {
    this.generation += 1;
    this.responses.clear();
  }
}
