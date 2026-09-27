import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityRejection1790812800000 implements MigrationInterface {
  name = 'AddActivityRejection1790812800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Recreated rather than ALTER TYPE ... ADD VALUE, because a value added
    // that way cannot be used by the checks below in the same transaction.
    await queryRunner.query(
      `ALTER TYPE "public"."activity_status" RENAME TO "activity_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_status" AS ENUM('draft', 'published', 'cancelled', 'rejected')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" TYPE "public"."activity_status" USING "status"::"text"::"public"."activity_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."activity_status_old"`);

    await queryRunner.query(
      `CREATE TYPE "public"."activity_rejection_reason" AS ENUM('not_suitable', 'duplicate', 'not_available')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "rejected_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "rejection_reason" "public"."activity_rejection_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "CHK_activities_rejected_at" CHECK (("status" = 'rejected') = ("rejected_at" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "CHK_activities_rejection_reason" CHECK (("rejected_at" IS NULL) = ("rejection_reason" IS NULL))`,
    );

    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "CHK_import_items_outcome"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "CHK_import_items_outcome" CHECK ("outcome" IN ('created', 'updated', 'duplicate', 'review_required', 'ignored', 'failed'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ignored imports and rejections have no earlier equivalent: ignored rows
    // become review_required and rejected activities return to drafts.
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "CHK_import_items_outcome"`,
    );
    await queryRunner.query(
      `UPDATE "import_items" SET "outcome" = 'review_required' WHERE "outcome" = 'ignored'`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "CHK_import_items_outcome" CHECK ("outcome" IN ('created', 'updated', 'duplicate', 'review_required', 'failed'))`,
    );

    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "CHK_activities_rejection_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "CHK_activities_rejected_at"`,
    );
    await queryRunner.query(
      `UPDATE "activities" SET "status" = 'draft' WHERE "status" = 'rejected'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "rejection_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "rejected_at"`,
    );
    await queryRunner.query(`DROP TYPE "public"."activity_rejection_reason"`);

    await queryRunner.query(
      `ALTER TYPE "public"."activity_status" RENAME TO "activity_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_status" AS ENUM('draft', 'published', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" TYPE "public"."activity_status" USING "status"::"text"::"public"."activity_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."activity_status_old"`);
  }
}
