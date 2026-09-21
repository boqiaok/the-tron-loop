import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityCategory1789358400000 implements MigrationInterface {
  name = 'AddActivityCategory1789358400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."activity_category" AS ENUM('market', 'workshop', 'family', 'outdoors', 'arts_music', 'community')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "category" "public"."activity_category" NOT NULL DEFAULT 'community'`,
    );
    // Best-effort backfill from existing free-form tags; editors can correct it.
    await queryRunner.query(`
      UPDATE "activities" AS "activity"
      SET "category" = CASE
        WHEN "activity"."title" ILIKE '%market%' OR EXISTS (
          SELECT 1 FROM "activity_tags" "at" JOIN "tags" "t" ON "t"."id" = "at"."tag_id"
          WHERE "at"."activity_id" = "activity"."id" AND "t"."slug" LIKE '%market%'
        ) THEN 'market'::"public"."activity_category"
        WHEN EXISTS (
          SELECT 1 FROM "activity_tags" "at" JOIN "tags" "t" ON "t"."id" = "at"."tag_id"
          WHERE "at"."activity_id" = "activity"."id" AND "t"."slug" IN ('arts', 'music', 'art', 'performance', 'theatre')
        ) THEN 'arts_music'::"public"."activity_category"
        WHEN EXISTS (
          SELECT 1 FROM "activity_tags" "at" JOIN "tags" "t" ON "t"."id" = "at"."tag_id"
          WHERE "at"."activity_id" = "activity"."id" AND "t"."slug" IN ('workshop', 'workshops', 'crafts', 'science', 'classes')
        ) THEN 'workshop'::"public"."activity_category"
        WHEN EXISTS (
          SELECT 1 FROM "activity_tags" "at" JOIN "tags" "t" ON "t"."id" = "at"."tag_id"
          WHERE "at"."activity_id" = "activity"."id" AND "t"."slug" IN ('family', 'kids', 'family-friendly')
        ) THEN 'family'::"public"."activity_category"
        WHEN EXISTS (
          SELECT 1 FROM "activity_tags" "at" JOIN "tags" "t" ON "t"."id" = "at"."tag_id"
          WHERE "at"."activity_id" = "activity"."id" AND "t"."slug" IN ('outdoors', 'outdoor', 'sport', 'sports')
        ) THEN 'outdoors'::"public"."activity_category"
        ELSE 'community'::"public"."activity_category"
      END
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_category" ON "activities" ("category")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_activities_category"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN "category"`);
    await queryRunner.query(`DROP TYPE "public"."activity_category"`);
  }
}
