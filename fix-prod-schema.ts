import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function fixProdSchema() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  
  if (!prodUrl) {
    console.error("PRODUCTION_DATABASE_URL is not set");
    process.exit(1);
  }
  
  console.log("Connecting to production database...");
  const pool = new Pool({ connectionString: prodUrl });
  
  const migrations = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS away_message text",
    "ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS login_code varchar(255)",
    "ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS login_code_expires_at timestamp",
    "ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment text",
    "ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment_score integer",
    "ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment_analysis jsonb",
  ];
  
  for (const sql of migrations) {
    try {
      await pool.query(sql);
      console.log(`OK: ${sql.substring(0, 60)}...`);
    } catch (err: any) {
      console.error(`FAILED: ${sql.substring(0, 60)}... - ${err.message}`);
    }
  }
  
  console.log("\nDone! Production database schema updated.");
  await pool.end();
}

fixProdSchema();
