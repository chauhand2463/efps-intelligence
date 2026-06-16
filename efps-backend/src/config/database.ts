import pg from 'pg';
import { config } from './index.js';

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  min: config.DATABASE_POOL_MIN,
  max: config.DATABASE_POOL_MAX,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  maxUses: 100,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

pool.on('connect', (client) => {
  client.query('SET statement_timeout = 10000').catch((err) => {
    console.error('Failed to set statement_timeout:', err);
  });
});

let replicaPool: pg.Pool | null = null;

function getReplicaPool(): pg.Pool {
  if (!replicaPool && config.DATABASE_REPLICA_URL) {
    replicaPool = new pg.Pool({
      connectionString: config.DATABASE_REPLICA_URL,
      min: config.DATABASE_POOL_MIN,
      max: config.DATABASE_POOL_MAX,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      maxUses: 100,
    });

    replicaPool.on('error', (err) => {
      console.error('Replica database pool error:', err);
    });
  }
  return replicaPool!;
}

export function getReadPool(): pg.Pool | null {
  return config.DATABASE_REPLICA_URL ? getReplicaPool() : null;
}

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn('Slow query:', { text: text.substring(0, 100), duration });
  }
  return result;
}

export async function readQuery(text: string, params?: unknown[]) {
  const p = getReadPool() ?? pool;
  const start = Date.now();
  const result = await p.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn('Slow read query:', { text: text.substring(0, 100), duration });
  }
  return result;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export async function withClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export default pool;
