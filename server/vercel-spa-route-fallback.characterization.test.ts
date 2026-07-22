import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

type VercelConfig = {
  $schema?: string;
  rewrites?: Array<{
    source: string;
    destination: string;
  }>;
  routes?: unknown;
};

test("Vercel uses the repository build and Vite SPA output directory", () => {
  const packageJson = JSON.parse(readRepoFile("package.json")) as {
    scripts?: Record<string, string>;
  };
  const viteConfig = readRepoFile("vite.config.ts");

  assert.equal(packageJson.scripts?.build, "tsx script/build.ts");
  assert.match(viteConfig, /outDir: path\.resolve\(import\.meta\.dirname, "dist\/public"\)/);
});

test("Vercel serves client-side routes through the SPA entry document", () => {
  const config = JSON.parse(readRepoFile("vercel.json")) as VercelConfig;

  assert.equal(config.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.deepEqual(config.rewrites, [
    {
      source: "/((?!api(?:/|$)).*)",
      destination: "/index.html",
    },
  ]);
  assert.equal(config.routes, undefined);

  const source = config.rewrites![0].source;
  const fallbackPattern = new RegExp(`^${source}$`);

  assert.equal(fallbackPattern.test("/"), true);
  assert.equal(fallbackPattern.test("/inquiry-workspace"), true);
  assert.equal(fallbackPattern.test("/artist/availability"), true);
  assert.equal(fallbackPattern.test("/api"), false);
  assert.equal(fallbackPattern.test("/api/health"), false);
});

test("the fallback preserves the registered client routes and filesystem precedence", () => {
  const appSource = readRepoFile("client/src/App.tsx");
  const configSource = readRepoFile("vercel.json");

  assert.match(appSource, /<Route path="\/" component=\{Landing\} \/>/);
  assert.match(
    appSource,
    /<Route path="\/inquiry-workspace" component=\{InquiryWorkspace\} \/>/,
  );
  assert.match(
    appSource,
    /<Route path="\/artist\/availability" component=\{ArtistAvailability\} \/>/,
  );

  assert.match(configSource, /"rewrites"/);
  assert.doesNotMatch(configSource, /"routes"/);
  assert.doesNotMatch(configSource, /"builds"/);
  assert.doesNotMatch(configSource, /"functions"/);
});
