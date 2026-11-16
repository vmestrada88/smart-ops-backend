/**
 * @file Applies the SQL files in /migrations that have not run yet.
 * @module utils/runMigrations
 *
 * `sequelize.sync({ alter: false })` only creates missing tables; it never
 * adds columns to existing ones. Column changes live in migrations/*.sql, and
 * before this runner nothing applied them in deployed environments (which is
 * how production ended up without "Clients"."status").
 *
 * Each file runs once, in filename order, inside its own transaction, and is
 * recorded in the "SchemaMigrations" table. If a file fails, it is rolled back
 * and the remaining files are skipped so they never run out of order.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

/**
 * Lists the .sql migration files in filename order.
 * @param {string} [dir] - Directory to read.
 * @returns {string[]} File names.
 */
function listMigrationFiles(dir = MIGRATIONS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

/**
 * Runs pending migrations.
 * @param {import('sequelize').Sequelize} sequelize - Connected instance.
 * @param {Object} [options]
 * @param {string} [options.dir] - Migrations directory.
 * @param {Object} [options.logger] - Logger with info/error.
 * @returns {Promise<{applied: string[], failed: string|null}>}
 */
async function runMigrations(sequelize, { dir = MIGRATIONS_DIR, logger = console } = {}) {
  await sequelize.query(
    'CREATE TABLE IF NOT EXISTS "SchemaMigrations" (' +
      'name VARCHAR(255) PRIMARY KEY, ' +
      '"appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())'
  );

  const [rows] = await sequelize.query('SELECT name FROM "SchemaMigrations"');
  const done = new Set(rows.map((row) => row.name));
  const pending = listMigrationFiles(dir).filter((name) => !done.has(name));

  const applied = [];
  for (const name of pending) {
    const sql = fs.readFileSync(path.join(dir, name), 'utf8');
    try {
      await sequelize.transaction(async (transaction) => {
        await sequelize.query(sql, { transaction });
        await sequelize.query('INSERT INTO "SchemaMigrations" (name) VALUES (:name)', {
          replacements: { name },
          transaction,
        });
      });
      applied.push(name);
      logger.info(`✅ Migration applied: ${name}`);
    } catch (err) {
      logger.error(`❌ Migration failed: ${name}: ${err.message}. Skipping the rest.`);
      return { applied, failed: name };
    }
  }

  if (applied.length === 0) logger.info('Migrations: database is up to date');
  return { applied, failed: null };
}

module.exports = { runMigrations, listMigrationFiles, MIGRATIONS_DIR };
