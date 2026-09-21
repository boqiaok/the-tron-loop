import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityEnvironment1789185600000 implements MigrationInterface {
  name = 'AddActivityEnvironment1789185600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."activity_environment" AS ENUM('indoor', 'outdoor', 'mixed', 'unknown')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "environment" "public"."activity_environment" NOT NULL DEFAULT 'unknown'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "environment"`,
    );
    await queryRunner.query(`DROP TYPE "public"."activity_environment"`);
  }
}
