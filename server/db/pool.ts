import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('[Database] DATABASE_URL environment variable is not defined.');
}

/**
 * Authoritative PostgreSQL Connection Pool (Neon)
 * Single source of truth for all database operations in Node.js backend.
 */
export const dbPool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Configure every connection session to use Brisbane local timezone (Australia/Brisbane, UTC+10)
dbPool.on('connect', (client) => {
  client.query("SET timezone = 'Australia/Brisbane'").catch((err) => {
    console.error('[Database Pool] Failed to set session timezone to Australia/Brisbane:', err);
  });
});

// Pool error logger
dbPool.on('error', (err) => {
  console.error('[Database Pool] Unexpected error on idle client:', err);
});

