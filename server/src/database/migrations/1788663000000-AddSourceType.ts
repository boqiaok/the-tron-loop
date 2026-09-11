import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceType1788663000000 implements MigrationInterface {
  name = 'AddSourceType1788663000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "source_type" character varying(30) NOT NULL DEFAULT 'json_feed'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "CHK_sources_source_type" CHECK ("source_type" IN ('json_feed', 'eventfinda'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "CHK_sources_source_type"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "source_type"`);
  }
}
