import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivitySourceSnapshots1790899200000 implements MigrationInterface {
  name = 'AddActivitySourceSnapshots1790899200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "source_snapshot" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "pending_source_snapshot" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "CHK_import_items_outcome"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "CHK_import_items_outcome" CHECK ("outcome" IN ('created', 'updated', 'unchanged', 'duplicate', 'review_required', 'ignored', 'failed'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Before this migration, a published activity's import was review_required.
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "CHK_import_items_outcome"`,
    );
    await queryRunner.query(
      `UPDATE "import_items" SET "outcome" = 'review_required' WHERE "outcome" = 'unchanged'`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "CHK_import_items_outcome" CHECK ("outcome" IN ('created', 'updated', 'duplicate', 'review_required', 'ignored', 'failed'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "pending_source_snapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "source_snapshot"`,
    );
  }
}
