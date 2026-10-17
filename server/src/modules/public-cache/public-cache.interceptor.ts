import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { PublicCacheService } from './public-cache.service';

/**
 * Typed searches are rarely repeated, so caching them would only push out
 * useful entries. Locations are cached: detail pages list what is near their
 * venue on every view.
 */
const UNCACHED_QUERY_PARAMETER = 'q';

/**
 * Serves repeated public GET requests from memory, keyed by URL. Not-found
 * answers are kept too: pages ask for a week without a guide on every view.
 */
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
    if (isNotFound(cached)) {
      return throwError(() => new NotFoundException(cached.notFound));
    }
    if (cached !== undefined) return of(cached);

    const generation = this.cache.currentGeneration;
    return next.handle().pipe(
      tap((response) => this.cache.set(key, response, generation)),
      catchError((error: unknown) => {
        if (error instanceof NotFoundException) {
          const answer: NotFoundAnswer = { notFound: error.getResponse() };
          this.cache.set(key, answer, generation);
        }
        return throwError(() => error);
      }),
    );
  }
}

/** The cache stores copies, so a not-found answer is kept as plain data. */
interface NotFoundAnswer {
  notFound: string | object;
}

function isNotFound(value: unknown): value is NotFoundAnswer {
  return typeof value === 'object' && value !== null && 'notFound' in value;
}
