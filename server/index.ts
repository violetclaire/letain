import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes";
import { startCronJobs } from "./cronJobs";
import { serveStatic } from "./static";
import { startScheduledEmailJob } from './scheduledEmailJob';
import { db } from "./db";
import { sql } from "drizzle-orm";

// Ensure database schema has required columns (runs on startup)
async function ensureDatabaseSchema() {
  console.log("[DB] Starting schema migration...");
  
  const migrations = [
    { name: 'inquiries.sentiment', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment text` },
    { name: 'inquiries.sentiment_score', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment_score integer` },
    { name: 'inquiries.sentiment_analysis', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment_analysis jsonb` },
    { name: 'users.away_message', sql: sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS away_message text` },
    { name: 'artist_profiles.login_code', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS login_code varchar(255)` },
    { name: 'artist_profiles.login_code_expires_at', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS login_code_expires_at timestamp` },
  ];
  
  for (const migration of migrations) {
    try {
      await db.execute(migration.sql);
      console.log(`[DB] Migration OK: ${migration.name}`);
    } catch (error: any) {
      console.error(`[DB] Migration FAILED: ${migration.name}`, error.message);
    }
  }
  
  console.log("[DB] Schema migration completed");
}

const app = express();

// Trust proxy - required for rate limiting behind reverse proxy (Replit deployment)
// This ensures req.ip returns the real client IP, not the proxy IP
app.set('trust proxy', 1);

// CORS configuration for external form submissions
const allowedOrigins = [
  'https://beauvette.app',
  'https://www.beauvette.app',
  'https://dateinquiry.com',
  'https://www.dateinquiry.com',
  'https://themakeupdolls.com',
  'https://www.themakeupdolls.com',
  // Allow localhost for development
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches *.replit.dev or *.replit.app
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.replit.dev') ||
      origin.endsWith('.replit.app')
    ) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve attached_assets as static files
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Health check endpoints - MUST be first, before any middleware
// This ensures deployment health checks can succeed immediately
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// API readiness check endpoint for deployment systems
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

app.get("/_health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'self'"],
      frameAncestors: ["'self'", "https://themakeupdolls.com", "https://www.themakeupdolls.com", "https://beauvette.app", "https://dateinquiry.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding external resources
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Apply JSON middleware for all other routes - increased limit for photo uploads
app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run startup migrations to ensure schema is up to date
    await ensureDatabaseSchema();
    
    const httpServer = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${port}`);
        // Start scheduled email job
        startScheduledEmailJob();
        // Start cron jobs (hold-expirer, SLA enforcer)
        startCronJobs();
      },
    );
  } catch (error) {
    console.error('[STARTUP ERROR]', error);
    process.exit(1);
  }
})();
