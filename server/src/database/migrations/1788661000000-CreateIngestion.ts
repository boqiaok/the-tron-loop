import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIngestion1788661000000 implements MigrationInterface {
  name = 'CreateIngestion1788661000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sources" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "feed_url" text NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "schedule_hours" smallint NOT NULL DEFAULT 6, "last_run_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_sources_schedule_hours" CHECK ("schedule_hours" >= 1 AND "schedule_hours" <= 168), CONSTRAINT "PK_sources_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sources_name" ON "sources" ("name")`,
    );
    await queryRunner.query(
      `CREATE TABLE "import_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source_id" uuid NOT NULL, "status" character varying(20) NOT NULL, "created_count" integer NOT NULL DEFAULT 0, "updated_count" integer NOT NULL DEFAULT 0, "duplicate_count" integer NOT NULL DEFAULT 0, "review_count" integer NOT NULL DEFAULT 0, "failed_count" integer NOT NULL DEFAULT 0, "error" text, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "finished_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_import_runs_status" CHECK ("status" IN ('running', 'succeeded', 'failed')), CONSTRAINT "PK_import_runs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_import_runs_source_started_at" ON "import_runs" ("source_id", "started_at")`,
    );
    await queryRunner.query(
      `CREATE TABLE "import_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "run_id" uuid NOT NULL, "source_id" uuid NOT NULL, "external_id" character varying(255) NOT NULL, "fingerprint" character(64) NOT NULL, "activity_id" uuid, "outcome" character varying(30) NOT NULL, "message" text, "raw_payload" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_import_items_outcome" CHECK ("outcome" IN ('created', 'updated', 'duplicate', 'review_required', 'failed')), CONSTRAINT "PK_import_items_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_import_items_run_id" ON "import_items" ("run_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_import_items_source_external_id" ON "import_items" ("source_id", "external_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_import_items_fingerprint" ON "import_items" ("fingerprint")`,
    );
    await queryRunner.query(`ALTER TABLE "activities" ADD "source_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "external_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "import_fingerprint" character(64)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_activities_source_external_id" ON "activities" ("source_id", "external_id") WHERE "source_id" IS NOT NULL AND "external_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_import_fingerprint" ON "activities" ("import_fingerprint") WHERE "import_fingerprint" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_runs" ADD CONSTRAINT "FK_import_runs_source" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_import_items_run" FOREIGN KEY ("run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_import_items_source" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_import_items_activity" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_source" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_import_items_activity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_import_items_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_import_items_run"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_runs" DROP CONSTRAINT "FK_import_runs_source"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_activities_import_fingerprint"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_activities_source_external_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "import_fingerprint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "external_id"`,
    );
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN "source_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_import_items_fingerprint"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_import_items_source_external_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_import_items_run_id"`);
    await queryRunner.query(`DROP TABLE "import_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_import_runs_source_started_at"`,
    );
    await queryRunner.query(`DROP TABLE "import_runs"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_sources_name"`);
    await queryRunner.query(`DROP TABLE "sources"`);
  }
}
