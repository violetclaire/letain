import puppeteer from "puppeteer-core";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { execSync } from "child_process";

const URL = process.env.PITCH_URL ?? "http://localhost:5000/pitch?print=1";
const OUT = process.env.PITCH_OUT ?? "attached_assets/briarwood-pitch.pdf";
const SLIDE_COUNT = 14;

function resolveChromium(): string {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROMIUM_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  try {
    const found = execSync("command -v chromium 2>/dev/null || command -v chromium-browser 2>/dev/null || command -v google-chrome 2>/dev/null", {
      encoding: "utf8",
    }).trim();
    if (found && existsSync(found)) return found;
  } catch {}

  try {
    const nixCandidates = execSync("ls -d /nix/store/*chromium*/bin/chromium 2>/dev/null | head -1", {
      encoding: "utf8",
    }).trim();
    if (nixCandidates && existsSync(nixCandidates)) return nixCandidates;
  } catch {}

  throw new Error(
    "Chromium not found. Set PUPPETEER_EXECUTABLE_PATH or install chromium.",
  );
}

async function main() {
  const chromiumPath = resolveChromium();
  console.log(`[pitch-pdf] using chromium: ${chromiumPath}`);

  await mkdir(dirname(OUT), { recursive: true });

  console.log(`[pitch-pdf] launching chromium...`);
  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    console.log(`[pitch-pdf] navigating to ${URL}`);
    await page.goto(URL, { waitUntil: "networkidle0", timeout: 60_000 });

    await page.waitForSelector(`[data-slide="${SLIDE_COUNT}"]`, { timeout: 30_000 });
    await page.evaluate(async (n) => {
      await (document as any).fonts?.ready;
      const got = document.querySelectorAll(".slide").length;
      if (got !== n) throw new Error(`expected ${n} slides, got ${got}`);
    }, SLIDE_COUNT);

    console.log(`[pitch-pdf] writing pdf to ${OUT}`);
    await page.pdf({
      path: OUT,
      width: "13.333in",
      height: "7.5in",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log(`[pitch-pdf] done.`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
