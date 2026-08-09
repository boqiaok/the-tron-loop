import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorFunction,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const result: HealthCheckResult = {
    status: 'ok',
    info: {
      database: { status: 'up' },
    },
    error: {},
    details: {
      database: { status: 'up' },
    },
  };
  const healthCheckService = {
    check: jest.fn(
      async (
        indicators: HealthIndicatorFunction[],
      ): Promise<HealthCheckResult> => {
        await Promise.all(
          indicators.map((indicator) => Promise.resolve(indicator())),
        );
        return result;
      },
    ),
  };
  const typeOrmHealthIndicator = {
    pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: healthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: typeOrmHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('reports that the database is healthy', async () => {
    await expect(controller.check()).resolves.toEqual(result);
    expect(typeOrmHealthIndicator.pingCheck).toHaveBeenCalledWith('database');
    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
  });
});
