import session from "express-session";
import type { RequestHandler } from "express";
import connectPg from "connect-pg-simple";

let cachedSessionMiddleware: RequestHandler | null = null;

export function getSession(): RequestHandler {
  if (cachedSessionMiddleware) {
    return cachedSessionMiddleware;
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);

  // Use NEON_DATABASE_URL first (not overridden by Replit's built-in Postgres)
  const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  console.log(`[Session] Using ${process.env.NEON_DATABASE_URL ? 'NEON_DATABASE_URL' : 'DATABASE_URL'} for sessions`);

  const sessionStore = new pgStore({
    conString: dbUrl,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Let the browser handle the cookie domain automatically
  // Using secure: 'auto' to work in both dev and production
  const isProduction = process.env.NODE_ENV === 'production';

  cachedSessionMiddleware = session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: sessionTtl,
      // Don't set domain - let browser use the request host
    },
  });

  return cachedSessionMiddleware;
}
