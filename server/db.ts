import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let _pool: Pool | null = null;
let _db: NeonDatabase<typeof schema> | null = null;
let _initialized = false;

function getDatabaseUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && process.env.PRODUCTION_DATABASE_URL) {
    return process.env.PRODUCTION_DATABASE_URL;
  }
  
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function initializeDatabase(): void {
  if (_initialized) return;
  
  const connectionString = getDatabaseUrl();
  _pool = new Pool({ connectionString });
  _db = drizzle({ client: _pool, schema });
  _initialized = true;
  
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`[DB] Initialized ${isProduction ? 'production' : 'development'} database connection`);
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
