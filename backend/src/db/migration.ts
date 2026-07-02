import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const migrationDir = path.join(__dirname, 'migrations');

async function ensureSchemaMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client: Client): Promise<Set<string>> {
  const result = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
  return new Set(result.rows.map((row) => row.version));
}

export async function applyMigrations(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await ensureSchemaMigrationsTable(client);

    const files = fs.readdirSync(migrationDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    const applied = await getAppliedMigrations(client);

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
  } finally {
    await client.end();
  }
}
