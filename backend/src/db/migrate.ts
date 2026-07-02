import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const migrationDir = path.join(__dirname, 'migrations');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function ensureSchemaMigrationsTable(): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
  return new Set(result.rows.map((row) => row.version));
}

async function applyMigrations(): Promise<void> {
  await client.connect();
  await ensureSchemaMigrationsTable();

  const files = fs.readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const applied = await getAppliedMigrations();

  for (const file of files) {
    const version = path.basename(file, '.sql');
    if (applied.has(version)) {
      continue;
    }

    const fullPath = path.join(migrationDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [version]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
}

applyMigrations()
  .then(() => {
    console.log('Migrations complete');
    return client.end();
  })
  .catch((error) => {
    console.error(error);
    client.end().catch(() => undefined);
    process.exitCode = 1;
  });
