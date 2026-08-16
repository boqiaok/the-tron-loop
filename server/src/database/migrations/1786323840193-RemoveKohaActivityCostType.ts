import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveKohaActivityCostType1786323840193 implements MigrationInterface {
  name = 'RemoveKohaActivityCostType1786323840193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "activities" SET "cost_type" = 'unknown' WHERE "cost_type" = 'koha'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "cost_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."activity_cost_type" RENAME TO "activity_cost_type_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_cost_type" AS ENUM('free', 'paid', 'unknown')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "cost_type" TYPE "public"."activity_cost_type" USING "cost_type"::text::"public"."activity_cost_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "cost_type" SET DEFAULT 'unknown'`,
    );
    await queryRunner.query(`DROP TYPE "public"."activity_cost_type_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "cost_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."activity_cost_type" RENAME TO "activity_cost_type_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_cost_type" AS ENUM('free', 'paid', 'koha', 'unknown')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "cost_type" TYPE "public"."activity_cost_type" USING "cost_type"::text::"public"."activity_cost_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "cost_type" SET DEFAULT 'unknown'`,
    );
    await queryRunner.query(`DROP TYPE "public"."activity_cost_type_old"`);
  }
}
