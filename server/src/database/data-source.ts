import 'dotenv/config';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getDatabasePort(): number {
  const value = process.env.DB_PORT ?? '5432';
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`DB_PORT must be a valid port number, received: ${value}`);
  }

  return port;
}

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: getRequiredEnvironmentVariable('DB_HOST'),
  port: getDatabasePort(),
  username: getRequiredEnvironmentVariable('DB_USERNAME'),
  password: getRequiredEnvironmentVariable('DB_PASSWORD'),
  database: getRequiredEnvironmentVariable('DB_DATABASE'),
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
  migrationsRun: false,
};

export default new DataSource(dataSourceOptions);
