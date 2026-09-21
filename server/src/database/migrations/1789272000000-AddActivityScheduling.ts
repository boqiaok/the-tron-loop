import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityScheduling1789272000000 implements MigrationInterface {
  name = 'AddActivityScheduling1789272000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."activity_schedule_mode" AS ENUM('fixed', 'window')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_duration_source" AS ENUM('source', 'parsed', 'category_default', 'manual')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "schedule_mode" "public"."activity_schedule_mode" NOT NULL DEFAULT 'fixed'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "visit_minutes" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "duration_source" "public"."activity_duration_source" NOT NULL DEFAULT 'source'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "CHK_activities_visit_minutes_positive" CHECK ("visit_minutes" IS NULL OR "visit_minutes" BETWEEN 15 AND 720)`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "CHK_activities_window_has_visit_minutes" CHECK ("schedule_mode" <> 'window' OR "visit_minutes" IS NOT NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "CHK_activities_window_has_visit_minutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "CHK_activities_visit_minutes_positive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "duration_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "visit_minutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "schedule_mode"`,
    );
    await queryRunner.query(`DROP TYPE "public"."activity_duration_source"`);
    await queryRunner.query(`DROP TYPE "public"."activity_schedule_mode"`);
  }
}
