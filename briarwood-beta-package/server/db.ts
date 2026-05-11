import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let _pool: Pool | null = null;
let _db: NeonDatabase<typeof schema> | null = null;
let _initialized = false;

function cleanDatabaseUrl(url: string): string {
  // Clean up the URL if it has psql prefix or quotes
  return url.replace(/^psql\s*/, '').replace(/^['"\s]+/, '').replace(/['"\s]+$/, '').trim();
}

function getDatabaseUrl(): string {
  // Use NEON_DATABASE_URL first (not overridden by Replit's built-in Postgres)
  // Fall back to DATABASE_URL for backwards compatibility
  if (process.env.NEON_DATABASE_URL) {
    return cleanDatabaseUrl(process.env.NEON_DATABASE_URL);
  }
  
  if (process.env.DATABASE_URL) {
    return cleanDatabaseUrl(process.env.DATABASE_URL);
  }
  
  throw new Error(
    "NEON_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function initializeDatabase(): void {
  if (_initialized) return;
  
  const connectionString = getDatabaseUrl();
  _pool = new Pool({ connectionString });
  _db = drizzle({ client: _pool, schema });
  _initialized = true;
  
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    const dbHost = new URL(connectionString).host;
    console.log(`[DB] Initialized ${isProduction ? 'production' : 'development'} database connection`);
    console.log(`[DB] Connected to host: ${dbHost}`);
  } catch (e) {
    console.log(`[DB] Initialized database (could not parse host)`);
  }
}

export function getPool(): Pool {
  if (!_pool) {
    initializeDatabase();
  }
  return _pool!;
}

export function getDb(): NeonDatabase<typeof schema> {
  if (!_db) {
    initializeDatabase();
  }
  return _db!;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  }
});

export const db = new Proxy({} as NeonDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  }
});
