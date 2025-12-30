import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function checkUser() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("PRODUCTION_DATABASE_URL is not set");
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: prodUrl });
  
  const result = await pool.query(
    "SELECT id, email, password IS NOT NULL as has_password, role FROM users WHERE email = $1",
    ['info@themakeupdolls.com']
  );
  
  console.log("User in PRODUCTION:");
  console.log(result.rows);
  
  await pool.end();
}

checkUser();
