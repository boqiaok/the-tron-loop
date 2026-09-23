import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHamiltonLibrariesSourceType1790121600000 implements MigrationInterface {
  name = 'AddHamiltonLibrariesSourceType1790121600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "CHK_sources_source_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "CHK_sources_source_type" CHECK ("source_type" IN ('json_feed', 'eventfinda', 'hamilton_libraries'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "CHK_sources_source_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "CHK_sources_source_type" CHECK ("source_type" IN ('json_feed', 'eventfinda'))`,
    );
  }
}
