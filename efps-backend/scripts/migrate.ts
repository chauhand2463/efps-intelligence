import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'database', 'migrations');

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const { rows: executed } = await pool.query(
      'SELECT filename FROM _migrations ORDER BY filename'
    );
    const executedFiles = new Set(executed.map((r: { filename: string }) => r.filename));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (executedFiles.has(file)) {
        console.log(`Skipping ${file} (already executed)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`Running migration: ${file}`);

      await pool.query('BEGIN');

      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await pool.query('COMMIT');
        console.log(`  ✓ ${file} completed`);
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error(`  ✗ ${file} failed:`, err);
        throw err;
      }
    }

    console.log('All migrations completed');
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
