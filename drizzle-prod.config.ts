import { defineConfig } from "drizzle-kit";

let prodUrl = process.env.PRODUCTION_DATABASE_URL;

if (!prodUrl) {
  throw new Error("PRODUCTION_DATABASE_URL must be set");
}

// Clean up the URL if it has psql prefix or quotes
prodUrl = prodUrl.replace(/^psql\s*/, '').replace(/^['"\s]+/, '').replace(/['"\s]+$/, '').trim();

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: prodUrl,
  },
});
