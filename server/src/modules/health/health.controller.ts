import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check the API and database health' })
  @ApiOkResponse({ description: 'The API and database are healthy' })
  check() {
    return this.health.check([() => this.database.pingCheck('database')]);
  }

  /**
   * Container health without touching the database, so frequent checks do not
   * keep the serverless database awake. The server only listens once it has
   * connected to the database.
   */
  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Check that the API process is running' })
  @ApiOkResponse({ description: 'The API process is running' })
  live() {
    return this.health.check([]);
  }
}
