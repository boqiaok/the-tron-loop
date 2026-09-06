import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminAuth1788660000000 implements MigrationInterface {
  name = 'CreateAdminAuth1788660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(254) NOT NULL, "password_hash" text NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_admin_users_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_admin_users_email" ON "admin_users" ("email")`,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "admin_user_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_admin_sessions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_admin_sessions_token_hash" ON "admin_sessions" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_sessions_admin_user_id" ON "admin_sessions" ("admin_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_sessions_expires_at" ON "admin_sessions" ("expires_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" ADD CONSTRAINT "FK_admin_sessions_admin_user" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" DROP CONSTRAINT "FK_admin_sessions_admin_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_admin_sessions_expires_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_admin_sessions_admin_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_admin_sessions_token_hash"`,
    );
    await queryRunner.query(`DROP TABLE "admin_sessions"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_admin_users_email"`);
    await queryRunner.query(`DROP TABLE "admin_users"`);
  }
}
