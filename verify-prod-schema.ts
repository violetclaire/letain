import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function verifyProdSchema() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  
  if (!prodUrl) {
    console.error("PRODUCTION_DATABASE_URL is not set");
    process.exit(1);
  }
  
  console.log("Connecting to production database...");
  const pool = new Pool({ connectionString: prodUrl });
  
  // Check users table columns
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
  `);
  
  console.log("\n=== USERS table columns ===");
  for (const row of result.rows) {
    console.log(`  ${row.column_name}: ${row.data_type}`);
  }
  
  // Check for away_message specifically
  const hasAwayMessage = result.rows.some(r => r.column_name === 'away_message');
  console.log(`\naway_message column exists: ${hasAwayMessage}`);
  
  await pool.end();
}

verifyProdSchema();
