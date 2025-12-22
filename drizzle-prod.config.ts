import { defineConfig } from "drizzle-kit";

const prodUrl = process.env.PRODUCTION_DATABASE_URL;

if (!prodUrl) {
  throw new Error("PRODUCTION_DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: prodUrl,
  },
});
