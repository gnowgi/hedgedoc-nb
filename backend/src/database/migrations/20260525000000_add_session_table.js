/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Fork patch migration.
 *
 * Upstream added the `session` table by editing the original
 * `20250312211152_initial.js` migration in place. Knex tracks migrations by
 * filename, so databases that already applied `initial` (e.g. this fork's,
 * created before the upstream sync) never get the new table and fail with
 * `relation "session" does not exist`.
 *
 * This guarded migration creates the table only when it is missing, so:
 *  - existing databases get the session table without losing data;
 *  - fresh databases (where `initial` already created it) skip it via hasTable.
 *
 * The table definition is copied verbatim from the session block in
 * 20250312211152_initial.js so the schema matches exactly.
 */

/* oxlint-disable */
const {
  AuthProviderType,
  FieldNameSession,
  FieldNameUser,
  TableSession,
  TableUser,
} = require('@hedgedoc/database');

const up = async function (knex) {
  if (await knex.schema.hasTable(TableSession)) {
    return;
  }

  await knex.schema.createTable(TableSession, (table) => {
    table.string(FieldNameSession.id).primary();
    table
      .integer(FieldNameSession.userId)
      .unsigned()
      .nullable()
      .references(FieldNameUser.id)
      .inTable(TableUser)
      .onDelete('CASCADE');
    table.string(FieldNameSession.csrfToken).nullable();
    table
      .enu(
        FieldNameSession.loginAuthProviderType,
        [
          AuthProviderType.LDAP,
          AuthProviderType.LOCAL,
          AuthProviderType.OIDC,
          AuthProviderType.GUEST,
        ],
        {
          useNative: true,
          enumName: FieldNameSession.loginAuthProviderType,
        },
      )
      .nullable();
    table.string(FieldNameSession.loginAuthProviderIdentifier).nullable();
    table.string(FieldNameSession.oidcIdToken).nullable();
    table.string(FieldNameSession.oidcSid).nullable();
    table.string(FieldNameSession.oidcLoginState).nullable();
    table.string(FieldNameSession.oidcLoginCode).nullable();
    table.text(FieldNameSession.pendingUserData);
    table.timestamp(FieldNameSession.createdAt, { useTz: false, precision: 3 }).notNullable();
    table.timestamp(FieldNameSession.updatedAt, { useTz: false, precision: 3 }).notNullable();
    table.timestamp(FieldNameSession.expiresAt, { useTz: false, precision: 3 }).notNullable();

    table.index([FieldNameSession.userId], 'idx_session_user_id');
    table.index([FieldNameSession.oidcSid], 'idx_session_oidc_sid');
    table.index([FieldNameSession.expiresAt], 'idx_session_expires_at');
  });
};

const down = async function (knex) {
  await knex.schema.dropTableIfExists(TableSession);
};

module.exports = {
  up,
  down,
};
