import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, Observable, of } from 'rxjs';
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

  it.each(['q=market', 'latitude=-37.78&longitude=175.28'])(
    'does not cache personal requests (%s)',
    async (query) => {
      await send(`/api/v1/activities?${query}`, handler('first'));

      await expect(
        send(`/api/v1/activities?${query}`, handler('second')),
      ).resolves.toBe('second');
    },
  );

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
