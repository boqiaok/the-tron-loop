import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivityCore1785716517038 implements MigrationInterface {
  name = 'CreateActivityCore1785716517038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(80) NOT NULL, "slug" character varying(100) NOT NULL, CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tags_slug" ON "tags"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_tags" ("activity_id" uuid NOT NULL, "tag_id" uuid NOT NULL, CONSTRAINT "PK_1f4bb20fab678323f29e413f445" PRIMARY KEY ("activity_id", "tag_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_tags_tag_id" ON "activity_tags"  ("tag_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "venues" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "address" text, "suburb" character varying(120), "city" character varying(120) NOT NULL DEFAULT 'Hamilton', "latitude" double precision, "longitude" double precision, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_venues_longitude" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)), CONSTRAINT "CHK_venues_latitude" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)), CONSTRAINT "PK_cb0f885278d12384eb7a81818be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_cost_type" AS ENUM('free', 'paid', 'koha', 'unknown')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_status" AS ENUM('draft', 'published', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "slug" character varying(220) NOT NULL, "summary" character varying(500), "description" text NOT NULL, "image_url" text, "cost_type" "public"."activity_cost_type" NOT NULL DEFAULT 'unknown', "cost_amount_from" numeric(10,2), "currency" character(3) NOT NULL DEFAULT 'NZD', "cost_details" character varying(255), "venue_id" uuid, "source_url" text, "status" "public"."activity_status" NOT NULL DEFAULT 'draft', "published_at" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_activities_cost_amount_non_negative" CHECK ("cost_amount_from" IS NULL OR "cost_amount_from" >= 0), CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_venue_id" ON "activities"  ("venue_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activities_slug" ON "activities"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_dates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "activity_id" uuid NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE, "timezone" character varying(64) NOT NULL DEFAULT 'Pacific/Auckland', "is_all_day" boolean NOT NULL DEFAULT false, "recurrence_rule" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_activity_dates_end_after_start" CHECK ("ends_at" IS NULL OR "ends_at" >= "starts_at"), CONSTRAINT "PK_4e3ce47f664b16ece5b45ac40b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activity_dates_activity_starts_at" ON "activity_dates"  ("activity_id", "starts_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_dates_starts_at" ON "activity_dates"  ("starts_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tags" ADD CONSTRAINT "FK_a18f4d22d9af8576c6324e7e58e" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tags" ADD CONSTRAINT "FK_25c35b78606b825190e163f7df3" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_4fbb0078a91734f10d65849dc6e" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_dates" ADD CONSTRAINT "FK_9e028069be3523d2e7e49b52ad2" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_dates" DROP CONSTRAINT "FK_9e028069be3523d2e7e49b52ad2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_4fbb0078a91734f10d65849dc6e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tags" DROP CONSTRAINT "FK_25c35b78606b825190e163f7df3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_tags" DROP CONSTRAINT "FK_a18f4d22d9af8576c6324e7e58e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_activity_dates_starts_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_activity_dates_activity_starts_at"`,
    );
    await queryRunner.query(`DROP TABLE "activity_dates"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_activities_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_activities_venue_id"`);
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(`DROP TYPE "public"."activity_status"`);
    await queryRunner.query(`DROP TYPE "public"."activity_cost_type"`);
    await queryRunner.query(`DROP TABLE "venues"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_activity_tags_tag_id"`);
    await queryRunner.query(`DROP TABLE "activity_tags"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_tags_slug"`);
    await queryRunner.query(`DROP TABLE "tags"`);
  }
}
