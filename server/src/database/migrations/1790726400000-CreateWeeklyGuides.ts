import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWeeklyGuides1790726400000 implements MigrationInterface {
  name = 'CreateWeeklyGuides1790726400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."weekly_guide_status" AS ENUM('draft', 'published')`,
    );
    await queryRunner.query(
      `CREATE TABLE "weekly_guides" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "week_start" date NOT NULL, "status" "public"."weekly_guide_status" NOT NULL DEFAULT 'draft', "intro" character varying(500), "published_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_weekly_guides_week_start_monday" CHECK (EXTRACT(ISODOW FROM "week_start") = 1), CONSTRAINT "CHK_weekly_guides_published_at" CHECK (("status" = 'published') = ("published_at" IS NOT NULL)), CONSTRAINT "PK_weekly_guides_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_weekly_guides_week_start" ON "weekly_guides" ("week_start")`,
    );
    await queryRunner.query(
      `CREATE TABLE "weekly_guide_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "guide_id" uuid NOT NULL, "activity_id" uuid NOT NULL, "position" smallint NOT NULL, "note" character varying(280), CONSTRAINT "CHK_weekly_guide_items_position" CHECK ("position" BETWEEN 1 AND 12), CONSTRAINT "PK_weekly_guide_items_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_weekly_guide_items_guide_position" ON "weekly_guide_items" ("guide_id", "position")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_weekly_guide_items_guide_activity" ON "weekly_guide_items" ("guide_id", "activity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_weekly_guide_items_activity_id" ON "weekly_guide_items" ("activity_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "weekly_guide_items" ADD CONSTRAINT "FK_weekly_guide_items_guide" FOREIGN KEY ("guide_id") REFERENCES "weekly_guides"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "weekly_guide_items" ADD CONSTRAINT "FK_weekly_guide_items_activity" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "weekly_guide_items" DROP CONSTRAINT "FK_weekly_guide_items_activity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "weekly_guide_items" DROP CONSTRAINT "FK_weekly_guide_items_guide"`,
    );
    await queryRunner.query(`DROP TABLE "weekly_guide_items"`);
    await queryRunner.query(`DROP TABLE "weekly_guides"`);
    await queryRunner.query(`DROP TYPE "public"."weekly_guide_status"`);
  }
}
