import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWaikatoMuseumSourceType1790640000000 implements MigrationInterface {
  name = 'AddWaikatoMuseumSourceType1790640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "CHK_sources_source_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "CHK_sources_source_type" CHECK ("source_type" IN ('json_feed', 'eventfinda', 'hamilton_libraries', 'waikato_museum'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "CHK_sources_source_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "CHK_sources_source_type" CHECK ("source_type" IN ('json_feed', 'eventfinda', 'hamilton_libraries'))`,
    );
  }
}
