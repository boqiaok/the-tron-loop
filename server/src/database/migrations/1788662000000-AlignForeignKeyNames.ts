import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignForeignKeyNames1788662000000 implements MigrationInterface {
  name = 'AlignForeignKeyNames1788662000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_import_items_activity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_import_items_run"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_import_items_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_runs" DROP CONSTRAINT "FK_import_runs_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" DROP CONSTRAINT "FK_admin_sessions_admin_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_1ab0a3491f0c1ed1e52f4c2463f" FOREIGN KEY ("run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_56f7eed03fc1ee7b7c57e4f52a3" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_8472c511927d13f6f3cfe0eb357" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_runs" ADD CONSTRAINT "FK_89bdfc660b922b725c246716e8a" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_fc023be5d8ac8e66eff87a4ba3e" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" ADD CONSTRAINT "FK_c1711b1831bdf66b77c3605bcdb" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" DROP CONSTRAINT "FK_c1711b1831bdf66b77c3605bcdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_fc023be5d8ac8e66eff87a4ba3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_runs" DROP CONSTRAINT "FK_89bdfc660b922b725c246716e8a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_8472c511927d13f6f3cfe0eb357"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_56f7eed03fc1ee7b7c57e4f52a3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" DROP CONSTRAINT "FK_1ab0a3491f0c1ed1e52f4c2463f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" ADD CONSTRAINT "FK_admin_sessions_admin_user" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_source" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_runs" ADD CONSTRAINT "FK_import_runs_source" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_import_items_source" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_import_items_run" FOREIGN KEY ("run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_items" ADD CONSTRAINT "FK_import_items_activity" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
