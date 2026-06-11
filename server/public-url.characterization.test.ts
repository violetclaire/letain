import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, test } from "node:test";

import {
  BRIARWOOD_PUBLIC_BASE_URL,
  LEGACY_DATEINQUIRY_PUBLIC_BASE_URL,
  getBriarwoodPublicBaseUrl,
  getLegacyDateInquiryPublicBaseUrl,
  getPublicBaseUrl,
} from "./config/publicUrl";

const originalPublicBaseUrl = process.env.PUBLIC_BASE_URL;

afterEach(() => {
  if (originalPublicBaseUrl === undefined) {
    delete process.env.PUBLIC_BASE_URL;
  } else {
    process.env.PUBLIC_BASE_URL = originalPublicBaseUrl;
  }
});

test("public URL helper defaults to the Briarwood base URL when PUBLIC_BASE_URL is missing", () => {
  delete process.env.PUBLIC_BASE_URL;

  assert.equal(getPublicBaseUrl(), BRIARWOOD_PUBLIC_BASE_URL);
  assert.equal(getBriarwoodPublicBaseUrl(), BRIARWOOD_PUBLIC_BASE_URL);
});

test("public URL helper can preserve legacy DateInquiry fallbacks for existing links", () => {
  delete process.env.PUBLIC_BASE_URL;

  assert.equal(
    getLegacyDateInquiryPublicBaseUrl(),
    LEGACY_DATEINQUIRY_PUBLIC_BASE_URL,
  );
  assert.equal(
    getPublicBaseUrl({ fallback: LEGACY_DATEINQUIRY_PUBLIC_BASE_URL }),
    LEGACY_DATEINQUIRY_PUBLIC_BASE_URL,
  );
});

test("public URL helper prefers PUBLIC_BASE_URL without normalizing current inline behavior", () => {
  process.env.PUBLIC_BASE_URL = "https://custom.example.test/app/";

  assert.equal(getPublicBaseUrl(), "https://custom.example.test/app/");
  assert.equal(
    getLegacyDateInquiryPublicBaseUrl(),
    "https://custom.example.test/app/",
  );
});

test("public URL helper preserves current invalid value behavior for later cleanup", () => {
  process.env.PUBLIC_BASE_URL = "not a url";

  assert.equal(getPublicBaseUrl(), "not a url");
});

test("public URL helper treats an empty PUBLIC_BASE_URL like the current inline fallback behavior", () => {
  process.env.PUBLIC_BASE_URL = "";

  assert.equal(getPublicBaseUrl(), BRIARWOOD_PUBLIC_BASE_URL);
  assert.equal(
    getLegacyDateInquiryPublicBaseUrl(),
    LEGACY_DATEINQUIRY_PUBLIC_BASE_URL,
  );
});

test("server sources keep the current mixed public URL fallback map until a wiring PR", async () => {
  const [routesText, squareRoutesText, emailServiceText, aiChatText] =
    await Promise.all([
      readFile(new URL("./routes.ts", import.meta.url), "utf8"),
      readFile(new URL("./squareRoutes.ts", import.meta.url), "utf8"),
      readFile(new URL("./emailService.ts", import.meta.url), "utf8"),
      readFile(new URL("./aiChat.ts", import.meta.url), "utf8"),
    ]);

  assert.match(
    routesText,
    /process\.env\.PUBLIC_BASE_URL \|\| 'https:\/\/atbriarwood\.com'/,
  );
  assert.match(
    routesText,
    /process\.env\.PUBLIC_BASE_URL \|\| 'https:\/\/dateinquiry\.com'/,
  );
  assert.match(
    emailServiceText,
    /process\.env\.PUBLIC_BASE_URL \|\| 'https:\/\/dateinquiry\.com'/,
  );
  assert.match(
    emailServiceText,
    /process\.env\.PUBLIC_BASE_URL \|\| process\.env\.REPLIT_DEPLOYMENT_URL \|\| 'https:\/\/dateinquiry\.com'/,
  );
  assert.match(
    aiChatText,
    /process\.env\.PUBLIC_BASE_URL \|\| process\.env\.REPLIT_DEPLOYMENT_URL \|\| 'https:\/\/dateinquiry\.com'/,
  );
  assert.match(
    squareRoutesText,
    /const callbackBaseUrl = 'https:\/\/dateinquiry\.com'/,
  );
  assert.match(
    squareRoutesText,
    /const callbackUrl = 'https:\/\/dateinquiry\.com\/api\/square\/connect\/callback'/,
  );
});

test("frontend and build sources keep current public URL assumptions until later cleanup", async () => {
  const [artistSettingsText, viteMetaImagesText, capacitorText] =
    await Promise.all([
      readFile(
        new URL("../client/src/pages/ArtistSettings.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../vite-plugin-meta-images.ts", import.meta.url), "utf8"),
      readFile(new URL("../capacitor.config.ts", import.meta.url), "utf8"),
    ]);

  assert.match(
    artistSettingsText,
    /typeof window !== 'undefined' \? window\.location\.origin : 'https:\/\/dateinquiry\.com'/,
  );
  assert.match(artistSettingsText, /const embedApiUrl = 'https:\/\/dateinquiry\.com'/);
  assert.match(viteMetaImagesText, /process\.env\.PUBLIC_BASE_URL\?\.trim\(\)/);
  assert.match(viteMetaImagesText, /invalid PUBLIC_BASE_URL, skipping meta tag updates/);
  assert.match(capacitorText, /url: 'https:\/\/atbriarwood\.com'/);
});
