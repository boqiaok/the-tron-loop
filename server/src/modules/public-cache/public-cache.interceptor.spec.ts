import {
  CallHandler,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { PublicCacheInterceptor } from './public-cache.interceptor';
import { PublicCacheService } from './public-cache.service';

describe('PublicCacheInterceptor', () => {
  let cache: PublicCacheService;
  let interceptor: PublicCacheInterceptor;

  beforeEach(() => {
    cache = new PublicCacheService();
    interceptor = new PublicCacheInterceptor(cache);
  });

  it('serves a repeated request from memory', async () => {
    const first = handler({ items: ['first'] });
    const handle = jest.fn(() => of({ items: ['second'] }));

    await expect(send('/api/v1/activities?page=1', first)).resolves.toEqual({
      items: ['first'],
    });
    await expect(
      send('/api/v1/activities?page=1', { handle }),
    ).resolves.toEqual({ items: ['first'] });
    expect(handle).not.toHaveBeenCalled();
  });

  it('keeps different URLs apart', async () => {
    await send('/api/v1/activities?page=1', handler('page one'));

    await expect(
      send('/api/v1/activities?page=2', handler('page two')),
    ).resolves.toBe('page two');
  });

  it('queries again after the listings change', async () => {
    await send('/api/v1/activities/market', handler('before'));
    cache.clear();

    await expect(
      send('/api/v1/activities/market', handler('after')),
    ).resolves.toBe('after');
  });

  it('does not keep a response built while the listings changed', async () => {
    const response = send(
      '/api/v1/activities/market',
      handler('before', () => cache.clear()),
    );
    await expect(response).resolves.toBe('before');

    await expect(
      send('/api/v1/activities/market', handler('after')),
    ).resolves.toBe('after');
  });

  it('does not cache typed searches', async () => {
    await send('/api/v1/activities?q=market', handler('first'));

    await expect(
      send('/api/v1/activities?q=market', handler('second')),
    ).resolves.toBe('second');
  });

  it('caches activities near a venue', async () => {
    const url = '/api/v1/activities?latitude=-37.78&longitude=175.28';
    await send(url, handler('first'));

    await expect(send(url, handler('second'))).resolves.toBe('first');
  });

  it('answers a repeated missing page from memory', async () => {
    const url = '/api/v1/weekly-guides/2026-10-12';
    const handle = jest.fn(() => throwError(() => new NotFoundException()));

    await expect(send(url, { handle })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(send(url, { handle })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('finds a page once the listings change', async () => {
    const url = '/api/v1/weekly-guides/2026-10-12';
    await send(url, {
      handle: () => throwError(() => new NotFoundException()),
    }).catch(() => undefined);
    cache.clear();

    await expect(send(url, handler('published'))).resolves.toBe('published');
  });

  it('does not keep other failures', async () => {
    const url = '/api/v1/activities?page=1';
    await send(url, {
      handle: () => throwError(() => new Error('database unavailable')),
    }).catch(() => undefined);

    await expect(send(url, handler('recovered'))).resolves.toBe('recovered');
  });

  function send(url: string, next: CallHandler): Promise<unknown> {
    const query = Object.fromEntries(new URL(url, 'http://test').searchParams);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: url, query }),
      }),
    } as ExecutionContext;
    return firstValueFrom(interceptor.intercept(context, next));
  }
});

function handler(value: unknown, whileBuilding?: () => void): CallHandler {
  return {
    handle: jest.fn(
      () =>
        new Observable((subscriber) => {
          whileBuilding?.();
          of(value).subscribe(subscriber);
        }),
    ),
  };
}
