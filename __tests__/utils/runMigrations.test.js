const fs = require('fs');
const os = require('os');
const path = require('path');
const { runMigrations, listMigrationFiles, MIGRATIONS_DIR } = require('../../utils/runMigrations');

const silent = { info: jest.fn(), error: jest.fn() };

function makeDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
  for (const [name, sql] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), sql);
  return dir;
}

function fakeSequelize({ applied = [], failOn = null } = {}) {
  const executed = [];
  const recorded = [...applied];
  return {
    executed,
    recorded,
    query: jest.fn(async (sql, opts = {}) => {
      if (sql.startsWith('SELECT name FROM')) return [recorded.map((name) => ({ name }))];
      if (sql.startsWith('INSERT INTO "SchemaMigrations"')) {
        recorded.push(opts.replacements.name);
        return [[]];
      }
      if (sql.startsWith('CREATE TABLE IF NOT EXISTS "SchemaMigrations"')) return [[]];
      if (failOn && sql.includes(failOn)) throw new Error('boom');
      executed.push(sql);
      return [[]];
    }),
    transaction: jest.fn(async (fn) => fn({})),
  };
}

describe('runMigrations', () => {
  it('ships the client status migration', () => {
    expect(listMigrationFiles(MIGRATIONS_DIR)).toContain('20260302_add_client_status_column.sql');
  });

  it('runs pending files in filename order and records them', async () => {
    const dir = makeDir({ '002_b.sql': 'B', '001_a.sql': 'A', 'notes.txt': 'X' });
    const db = fakeSequelize();
    const result = await runMigrations(db, { dir, logger: silent });
    expect(db.executed).toEqual(['A', 'B']);
    expect(db.recorded).toEqual(['001_a.sql', '002_b.sql']);
    expect(result).toEqual({ applied: ['001_a.sql', '002_b.sql'], failed: null });
  });

  it('skips files that already ran', async () => {
    const dir = makeDir({ '001_a.sql': 'A', '002_b.sql': 'B' });
    const db = fakeSequelize({ applied: ['001_a.sql'] });
    const result = await runMigrations(db, { dir, logger: silent });
    expect(db.executed).toEqual(['B']);
    expect(result.applied).toEqual(['002_b.sql']);
  });

  it('stops at the first failure and does not record it', async () => {
    const dir = makeDir({ '001_a.sql': 'A', '002_bad.sql': 'BAD', '003_c.sql': 'C' });
    const db = fakeSequelize({ failOn: 'BAD' });
    const result = await runMigrations(db, { dir, logger: silent });
    expect(db.executed).toEqual(['A']);
    expect(db.recorded).toEqual(['001_a.sql']);
    expect(result).toEqual({ applied: ['001_a.sql'], failed: '002_bad.sql' });
  });

  it('does nothing when the directory is missing', async () => {
    const db = fakeSequelize();
    const result = await runMigrations(db, { dir: '/nonexistent/dir', logger: silent });
    expect(result).toEqual({ applied: [], failed: null });
  });
});
