import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeeklyGuideItemKind1794693949493 implements MigrationInterface {
  name = 'AddWeeklyGuideItemKind1794693949493';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "weekly_guide_items" ADD "kind" character varying(60)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "weekly_guide_items" DROP COLUMN "kind"`,
    );
  }
}
