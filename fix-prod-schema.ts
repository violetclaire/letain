import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function fixProdSchema() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  
  if (!prodUrl) {
    console.error("PRODUCTION_DATABASE_URL is not set");
    process.exit(1);
  }
  
  console.log("Adding away_message column to artist_profiles in production...");
  const pool = new Pool({ connectionString: prodUrl });
  
  await pool.query("ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS away_message text");
  console.log("Done! Login should work now.");
  
  await pool.end();
}

fixProdSchema();
