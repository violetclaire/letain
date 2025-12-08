import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// ESM-only packages that must be bundled (externalized ESM packages break in CJS)
// These packages don't work correctly when externalized in CJS output
const allowlist: string[] = [
  "p-limit",
  "p-retry",
  "memoizee",
  "yocto-queue"  // peer dependency of p-limit
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    banner: {
      js: `
        const { createRequire } = require('module');
        const { fileURLToPath } = require('url');
        const { dirname } = require('path');
        if (typeof globalThis.__filename === 'undefined') {
          globalThis.__filename = __filename;
        }
        if (typeof globalThis.__dirname === 'undefined') {
          globalThis.__dirname = __dirname;
        }
      `.trim().replace(/\n\s+/g, ' '),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
