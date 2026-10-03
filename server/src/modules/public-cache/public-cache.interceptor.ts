import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, of, tap } from 'rxjs';
import { PublicCacheService } from './public-cache.service';

/**
 * Typed searches are rarely repeated, so caching them would only push out
 * useful entries. Locations are cached: detail pages list what is near their
 * venue on every view.
 */
const UNCACHED_QUERY_PARAMETER = 'q';

/** Serves repeated public GET requests from memory, keyed by URL. */
@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  constructor(private readonly cache: PublicCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== 'GET' || UNCACHED_QUERY_PARAMETER in request.query) {
      return next.handle();
    }

    const key = request.originalUrl;
    const cached = this.cache.get(key);
    if (cached !== undefined) return of(cached);

    const generation = this.cache.currentGeneration;
    return next
      .handle()
      .pipe(tap((response) => this.cache.set(key, response, generation)));
  }
}
