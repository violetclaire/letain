import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function verifyBothDbs() {
  const devUrl = process.env.DATABASE_URL;
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  
  console.log("=== Checking DEVELOPMENT database (DATABASE_URL) ===");
  if (devUrl) {
    const devPool = new Pool({ connectionString: devUrl });
    const devResult = await devPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'away_message'
    `);
    console.log(`away_message exists in DEV: ${devResult.rows.length > 0}`);
    await devPool.end();
  } else {
    console.log("DATABASE_URL not set");
  }
  
  console.log("\n=== Checking PRODUCTION database (PRODUCTION_DATABASE_URL) ===");
  if (prodUrl) {
    const prodPool = new Pool({ connectionString: prodUrl });
    const prodResult = await prodPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'away_message'
    `);
    console.log(`away_message exists in PROD: ${prodResult.rows.length > 0}`);
    await prodPool.end();
  } else {
    console.log("PRODUCTION_DATABASE_URL not set");
  }
}

verifyBothDbs();
