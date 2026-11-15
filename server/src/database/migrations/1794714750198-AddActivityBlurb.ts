import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityBlurb1794714750198 implements MigrationInterface {
  name = 'AddActivityBlurb1794714750198';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "blurb" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "blurb_drafted_at" TIMESTAMP WITH TIME ZONE`,
    );
    // Kinds written for picks become their activity's blurb, newest week first.
    await queryRunner.query(`
      UPDATE "activities" AS a SET "blurb" = picked."kind"
      FROM (
        SELECT DISTINCT ON (i."activity_id") i."activity_id", i."kind"
        FROM "weekly_guide_items" i
        JOIN "weekly_guides" g ON g."id" = i."guide_id"
        WHERE i."kind" IS NOT NULL AND btrim(i."kind") <> ''
        ORDER BY i."activity_id", g."week_start" DESC
      ) AS picked
      WHERE a."id" = picked."activity_id"
    `);
    await queryRunner.query(
      `ALTER TABLE "weekly_guide_items" DROP COLUMN "kind"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "weekly_guide_items" ADD "kind" character varying(60)`,
    );
    await queryRunner.query(`
      UPDATE "weekly_guide_items" AS i SET "kind" = left(a."blurb", 60)
      FROM "activities" a
      WHERE a."id" = i."activity_id" AND a."blurb" IS NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "blurb_drafted_at"`,
    );
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN "blurb"`);
  }
}
