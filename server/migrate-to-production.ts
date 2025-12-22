import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

function cleanDatabaseUrl(url: string): string {
  return url.replace(/^psql\s*/, '').replace(/^['"\s]+/, '').replace(/['"\s]+$/, '').trim();
}

async function migrateData() {
  const devUrl = process.env.DATABASE_URL;
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;

  if (!devUrl) {
    console.error("DATABASE_URL (development) is not set");
    process.exit(1);
  }

  if (!prodUrl) {
    console.error("PRODUCTION_DATABASE_URL is not set");
    process.exit(1);
  }

  const cleanDevUrl = cleanDatabaseUrl(devUrl);
  const cleanProdUrl = cleanDatabaseUrl(prodUrl);

  console.log("Connecting to development database...");
  const devPool = new Pool({ connectionString: cleanDevUrl });
  const devDb = drizzle({ client: devPool, schema });

  console.log("Connecting to production database...");
  const prodPool = new Pool({ connectionString: cleanProdUrl });
  const prodDb = drizzle({ client: prodPool, schema });

  try {
    console.log("\n=== Starting data migration ===\n");

    const tables = [
      { name: 'users', table: schema.users },
      { name: 'artists', table: schema.artists },
      { name: 'artistAvailability', table: schema.artistAvailability },
      { name: 'inquiries', table: schema.inquiries },
      { name: 'contracts', table: schema.contracts },
      { name: 'invoices', table: schema.invoices },
      { name: 'payments', table: schema.payments },
      { name: 'threads', table: schema.threads },
      { name: 'threadMessages', table: schema.threadMessages },
      { name: 'referrals', table: schema.referrals },
      { name: 'trustedCircle', table: schema.trustedCircle },
      { name: 'activityLog', table: schema.activityLog },
      { name: 'scheduledEmails', table: schema.scheduledEmails },
    ];

    for (const { name, table } of tables) {
      try {
        console.log(`Migrating ${name}...`);
        const data = await devDb.select().from(table);
        
        if (data.length === 0) {
          console.log(`  - No data in ${name}, skipping`);
          continue;
        }

        for (const row of data) {
          try {
            await prodDb.insert(table).values(row as any).onConflictDoNothing();
          } catch (insertErr: any) {
            if (insertErr.code !== '23505') {
              console.log(`  - Warning: Could not insert row in ${name}: ${insertErr.message}`);
            }
          }
        }
        
        console.log(`  - Migrated ${data.length} rows from ${name}`);
      } catch (err: any) {
        console.log(`  - Skipping ${name}: ${err.message}`);
      }
    }

    console.log("\n=== Migration complete ===\n");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

migrateData();
