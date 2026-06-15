import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const GEMINI_CLIENT_FILES = [
  { path: "aiChat.ts", constructions: 1, envStyle: "fallback" },
  { path: "businessChatAgent.ts", constructions: 1, envStyle: "direct" },
  { path: "cdiAgent.ts", constructions: 1, envStyle: "direct" },
  { path: "cdiEngine.ts", constructions: 1, envStyle: "direct" },
  { path: "iqsService.ts", constructions: 1, envStyle: "direct" },
  { path: "scheduleAI.ts", constructions: 1, envStyle: "fallback" },
  { path: "timelineParser.ts", constructions: 1, envStyle: "fallback" },
  { path: "routes.ts", constructions: 2, envStyle: "fallback" },
] as const;

const FALLBACK_API_KEY_PATTERN =
  /apiKey:\s*process\.env\.AI_INTEGRATIONS_GEMINI_API_KEY\s*\|\|\s*""/g;
const FALLBACK_BASE_URL_PATTERN =
  /baseUrl:\s*process\.env\.AI_INTEGRATIONS_GEMINI_BASE_URL\s*\|\|\s*""/g;
const DIRECT_API_KEY_PATTERN =
  /apiKey:\s*process\.env\.AI_INTEGRATIONS_GEMINI_API_KEY\s*,/g;
const DIRECT_BASE_URL_PATTERN =
  /baseUrl:\s*process\.env\.AI_INTEGRATIONS_GEMINI_BASE_URL\s*,/g;

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

async function readServerFile(path: string): Promise<string> {
  return readFile(new URL(`./${path}`, import.meta.url), "utf8");
}

test("Gemini client construction inventory is source-only and behavior-preserving", async () => {
  let totalConstructions = 0;

  for (const { path, constructions } of GEMINI_CLIENT_FILES) {
    const source = await readServerFile(path);
    const constructionCount = countMatches(source, /new GoogleGenAI\(\{/g);
    totalConstructions += constructionCount;

    assert.equal(
      constructionCount,
      constructions,
      `${path} should keep its current GoogleGenAI construction count`,
    );
    assert.match(
      source,
      /AI_INTEGRATIONS_GEMINI_API_KEY/,
      `${path} should keep current Gemini API key env usage`,
    );
    assert.match(
      source,
      /AI_INTEGRATIONS_GEMINI_BASE_URL/,
      `${path} should keep current Gemini base URL env usage`,
    );
  }

  assert.equal(totalConstructions, 9);
});

test("Gemini env fallback style remains split between current call sites", async () => {
  for (const { path, constructions, envStyle } of GEMINI_CLIENT_FILES) {
    const source = await readServerFile(path);

    if (envStyle === "fallback") {
      assert.equal(
        countMatches(source, FALLBACK_API_KEY_PATTERN),
        constructions,
        `${path} should keep current API key || "" fallback usage`,
      );
      assert.equal(
        countMatches(source, FALLBACK_BASE_URL_PATTERN),
        constructions,
        `${path} should keep current base URL || "" fallback usage`,
      );
      assert.equal(
        countMatches(source, DIRECT_API_KEY_PATTERN),
        0,
        `${path} should not switch to direct env usage in this characterization lane`,
      );
      assert.equal(
        countMatches(source, DIRECT_BASE_URL_PATTERN),
        0,
        `${path} should not switch to direct base URL env usage in this characterization lane`,
      );
    } else {
      assert.equal(
        countMatches(source, DIRECT_API_KEY_PATTERN),
        constructions,
        `${path} should keep current direct API key env usage`,
      );
      assert.equal(
        countMatches(source, DIRECT_BASE_URL_PATTERN),
        constructions,
        `${path} should keep current direct base URL env usage`,
      );
      assert.equal(
        countMatches(source, FALLBACK_API_KEY_PATTERN),
        0,
        `${path} should not switch to API key fallback usage in this characterization lane`,
      );
      assert.equal(
        countMatches(source, FALLBACK_BASE_URL_PATTERN),
        0,
        `${path} should not switch to base URL fallback usage in this characterization lane`,
      );
    }
  }
});

test("no shared Gemini helper or factory exists yet", async () => {
  const serverFiles = await readdir(new URL("./", import.meta.url));
  const helperLikeFiles = serverFiles.filter((file) =>
    /gemini|genai/i.test(file) && !file.endsWith(".test.ts"),
  );

  assert.deepEqual(helperLikeFiles, []);

  for (const { path } of GEMINI_CLIENT_FILES) {
    const source = await readServerFile(path);
    assert.doesNotMatch(source, /create(?:Google)?Gemini(?:Client|Factory)?/);
    assert.doesNotMatch(source, /get(?:Google)?Gemini(?:Client)?/);
    assert.doesNotMatch(source, /from ["']\.\/(?:ai\/)?gemini/);
  }
});

test("Gemini characterization remains an inventory guard only", async () => {
  const testSource = await readFile(new URL(import.meta.url), "utf8");

  assert.match(testSource, /readFile/);
  assert.doesNotMatch(testSource, /import\s+\{?\s*GoogleGenAI/);
  assert.doesNotMatch(testSource, /new GoogleGenAI\(/);
  assert.doesNotMatch(testSource, /generateContent\(/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=/);
});
