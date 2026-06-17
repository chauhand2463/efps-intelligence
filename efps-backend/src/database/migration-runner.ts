import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, getClient } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, 'migrations');
const TRACKING_TABLE = '_migrations';

async function ensureTrackingTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) UNIQUE NOT NULL,
      hash        VARCHAR(64) NOT NULL DEFAULT '',
      applied_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    ALTER TABLE ${TRACKING_TABLE}
      ADD COLUMN IF NOT EXISTS hash VARCHAR(64) NOT NULL DEFAULT ''
  `);
}

async function getApplied(): Promise<Set<string>> {
  const result = await query(`SELECT filename FROM ${TRACKING_TABLE} ORDER BY id`);
  return new Set(result.rows.map((r: { filename: string }) => r.filename));
}

function computeHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function runMigrations() {
  await ensureTrackingTable();
  const applied = await getApplied();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const filePath = join(MIGRATIONS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const hash = computeHash(content);

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(content);
      await client.query(
        `INSERT INTO ${TRACKING_TABLE} (filename, hash) VALUES ($1, $2)`,
        [file, hash]
      );
      await client.query('COMMIT');
      console.log(`Migration applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Migration failed: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  if (files.length === 0) {
    console.log('No migration files found.');
  }
}
