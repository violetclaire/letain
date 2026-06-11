import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, mock, test } from "node:test";

type EmailServiceModule = typeof import("./emailService");
type AiChatModule = typeof import("./aiChat");

let emailService: EmailServiceModule;
let aiChat: AiChatModule;

const EMAIL_ENV_KEYS = [
  "RESEND_API_KEY",
  "REPLIT_CONNECTORS_HOSTNAME",
  "REPL_IDENTITY",
  "WEB_REPL_RENEWAL",
] as const;

const originalEnv = new Map<string, string | undefined>();
let originalNodeEnv: string | undefined;

function captureConsole() {
  const logs: string[] = [];
  const errors: string[] = [];

  mock.method(console, "log", (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
  mock.method(console, "error", (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });

  return { logs, errors };
}

function clearEmailEnv() {
  for (const key of EMAIL_ENV_KEYS) {
    delete process.env[key];
  }
}

function restoreEmailEnv() {
  for (const key of EMAIL_ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

before(async () => {
  for (const key of EMAIL_ENV_KEYS) {
    originalEnv.set(key, process.env[key]);
  }
  originalNodeEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/email_characterization_test";

  [emailService, aiChat] = await Promise.all([
    import("./emailService"),
    import("./aiChat"),
  ]);
});

afterEach(() => {
  mock.restoreAll();
  restoreEmailEnv();
  process.env.NODE_ENV = "test";
});

after(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("emailService direct RESEND_API_KEY path returns the white-label from address without connector fetch", async () => {
  clearEmailEnv();
  process.env.RESEND_API_KEY = "re_direct_resend_key";
  const consoleCapture = captureConsole();
  const fetchCalls: string[] = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    fetchCalls.push(String(input));
    throw new Error("connector fetch should not run for direct-only credentials");
  });

  const result = await emailService.getResendClient();

  assert.equal(result.fromEmail, "notifications@dateinquiry.com");
  assert.equal(fetchCalls.length, 0);
  assert.match(consoleCapture.logs.join("\n"), /Using direct RESEND_API_KEY from environment/);
  assert.doesNotMatch(consoleCapture.logs.join("\n"), /re_direct_resend_key/);
});

test("emailService direct RESEND_API_KEY takes precedence over legacy connector credentials", async () => {
  clearEmailEnv();
  process.env.RESEND_API_KEY = "re_direct_key_should_win";
  process.env.REPLIT_CONNECTORS_HOSTNAME = "connectors.example.test";
  process.env.REPL_IDENTITY = "repl-token";
  const consoleCapture = captureConsole();
  const fetchCalls: string[] = [];

  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    fetchCalls.push(String(input));
    throw new Error("connector fetch should not run when RESEND_API_KEY is set");
  });

  const result = await emailService.getResendClient();

  assert.equal(result.fromEmail, "notifications@dateinquiry.com");
  assert.equal(fetchCalls.length, 0);
  const logs = consoleCapture.logs.join("\n");
  assert.match(logs, /Using direct RESEND_API_KEY from environment/);
  assert.doesNotMatch(logs, /Trying Replit connector fallback/);
  assert.doesNotMatch(logs, /re_direct_key_should_win/);
});

test("emailService non-production Replit connector fallback can use WEB_REPL_RENEWAL token prefix", async () => {
  clearEmailEnv();
  process.env.NODE_ENV = "test";
  process.env.REPLIT_CONNECTORS_HOSTNAME = "connectors.example.test";
  process.env.WEB_REPL_RENEWAL = "deployment-token";
  const fetchCalls: Array<{ headers: Record<string, string> }> = [];
  captureConsole();

  mock.method(globalThis, "fetch", async (_input: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({ headers: init?.headers as Record<string, string> });
    return new Response(JSON.stringify({
      items: [{ settings: { api_key: "re_deployment_secret_key" } }],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  const result = await emailService.getResendClient();

  assert.equal(result.fromEmail, "notifications@dateinquiry.com");
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].headers.X_REPLIT_TOKEN, "depl deployment-token");
});

test("emailService non-production Replit connector fallback failure rejects when no direct key exists", async () => {
  clearEmailEnv();
  process.env.NODE_ENV = "test";
  process.env.REPLIT_CONNECTORS_HOSTNAME = "connectors.example.test";
  process.env.REPL_IDENTITY = "repl-token";
  const consoleCapture = captureConsole();
  mock.method(globalThis, "fetch", async () => {
    throw new Error("connector unavailable");
  });

  await assert.rejects(
    emailService.getResendClient(),
    /No Resend credentials available/,
  );

  assert.match(consoleCapture.logs.join("\n"), /Replit connector fallback failed/);

  mock.restoreAll();
  clearEmailEnv();
  process.env.NODE_ENV = "test";
  process.env.REPLIT_CONNECTORS_HOSTNAME = "connectors.example.test";
  process.env.REPL_IDENTITY = "repl-token";
  captureConsole();
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ items: [{ settings: {} }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));

  await assert.rejects(
    emailService.getResendClient(),
    /No Resend credentials available/,
  );
});

test("emailService does not use Replit connector fallback in production without RESEND_API_KEY", async () => {
  clearEmailEnv();
  process.env.NODE_ENV = "production";
  process.env.REPLIT_CONNECTORS_HOSTNAME = "connectors.example.test";
  process.env.REPL_IDENTITY = "repl-token";
  const consoleCapture = captureConsole();
  const fetchCalls: string[] = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    fetchCalls.push(String(input));
    throw new Error("production connector fetch should not run");
  });

  await assert.rejects(
    emailService.getResendClient(),
    /No Resend credentials available/,
  );

  assert.equal(fetchCalls.length, 0);
  assert.match(consoleCapture.logs.join("\n"), /Replit email connector fallback is disabled in production/);
});

test("emailService rejects when neither connector nor direct credentials are available", async () => {
  clearEmailEnv();
  const consoleCapture = captureConsole();
  mock.method(globalThis, "fetch", async () => {
    throw new Error("fetch should not run without hostname and token");
  });

  await assert.rejects(
    emailService.getResendClient(),
    /No Resend credentials available/,
  );

  assert.match(consoleCapture.errors.join("\n"), /No Resend credentials available - RESEND_API_KEY not set and connector fallback unavailable/);
});

test("aiChat keeps its separate Replit-only Resend credential behavior", async () => {
  clearEmailEnv();
  process.env.RESEND_API_KEY = "re_direct_key_ai_chat_does_not_use";
  const consoleCapture = captureConsole();
  mock.method(globalThis, "fetch", async () => {
    throw new Error("aiChat should fail before connector fetch without a Replit token");
  });

  const result = await aiChat.sendThankYouEmailFromAI("artist-a", {
    recipientName: "Client",
    recipientEmail: "client@example.com",
    message: "Thank you",
  });

  assert.deepEqual(result, { success: false, error: "X_REPLIT_TOKEN not found" });
  assert.match(consoleCapture.errors.join("\n"), /\[AI\] Failed to send thank you email:/);
});

test("email source keeps current sender domain and logging behavior", async () => {
  const [emailText, credentialsText] = await Promise.all([
    readFile(new URL("./emailService.ts", import.meta.url), "utf8"),
    readFile(new URL("./email/credentials.ts", import.meta.url), "utf8"),
  ]);

  assert.match(emailText, /const WHITELABEL_EMAIL_DOMAIN = 'dateinquiry\.com'/);
  assert.match(emailText, /const WHITELABEL_FROM_EMAIL = 'notifications@dateinquiry\.com'/);
  assert.match(emailText, /resolveEmailCredentials\(\{ fromEmail: WHITELABEL_FROM_EMAIL \}\)/);
  assert.match(emailText, /from: `Date Inquiry <\$\{fromEmail\}>`/);
  assert.match(emailText, /const senderEmail = `\$\{safeSenderName\} <notifications@dateinquiry\.com>`/);
  assert.match(emailText, /const senderEmail = `\$\{sanitizeSenderName\(senderName\)\} <notifications@dateinquiry\.com>`/);
  assert.match(credentialsText, /Production email should be configured directly with RESEND_API_KEY/);
  assert.match(credentialsText, /process\.env\.NODE_ENV !== "production"/);
  assert.match(credentialsText, /console\.log\([\s\S]*"Got Resend API key \(first 8 chars\):"[\s\S]*connectionSettings\.settings\.api_key\?\.substring\(0, 8\) \+ "\.\.\."/);
  assert.doesNotMatch(credentialsText, /console\.log\([^)]*RESEND_API_KEY[^)]*process\.env\.RESEND_API_KEY/);
});

test("aiChat source keeps current Replit-only resolver without direct RESEND_API_KEY fallback", async () => {
  const aiChatText = await readFile(new URL("./aiChat.ts", import.meta.url), "utf8");
  const resolverStart = aiChatText.indexOf("async function getResendCredentials()");
  const clientStart = aiChatText.indexOf("async function getResendClient()", resolverStart);
  assert.ok(resolverStart >= 0, "aiChat getResendCredentials should exist");
  assert.ok(clientStart > resolverStart, "aiChat getResendClient should follow getResendCredentials");
  const resolverSection = aiChatText.slice(resolverStart, clientStart);

  assert.match(resolverSection, /process\.env\.REPLIT_CONNECTORS_HOSTNAME/);
  assert.match(resolverSection, /process\.env\.REPL_IDENTITY/);
  assert.match(resolverSection, /process\.env\.WEB_REPL_RENEWAL/);
  assert.match(resolverSection, /throw new Error\("X_REPLIT_TOKEN not found"\)/);
  assert.match(resolverSection, /connector_names=resend/);
  assert.match(resolverSection, /settings\.api_key/);
  assert.doesNotMatch(resolverSection, /RESEND_API_KEY/);
});

test("routes source keeps dry-run no-send boundaries around composer, routing, and operator alerts", async () => {
  const routesText = await readFile(new URL("./routes.ts", import.meta.url), "utf8");

  const composerDryRun = routesText.indexOf("Dry run is on, so no email was sent");
  const composerSend = routesText.indexOf('const { sendGeneralEmail } = await import("./emailService");', composerDryRun);
  assert.ok(composerDryRun > 0, "composer dry-run preview should be present");
  assert.ok(composerSend > composerDryRun, "composer send should happen after dry-run return path");
  assert.match(routesText.slice(composerDryRun, composerSend), /return res\.json\(\{[\s\S]*?dryRun: true[\s\S]*?blocked: true/);

  const preflightDryRun = routesText.indexOf("Dry run is on, so no email or text was sent");
  const preflightSend = routesText.indexOf('const { sendGeneralEmail } = await import("./emailService");', preflightDryRun);
  assert.ok(preflightDryRun > 0, "route preflight dry-run preview should be present");
  assert.ok(preflightSend > preflightDryRun, "route preflight send should happen after dry-run return path");
  assert.match(routesText.slice(preflightDryRun, preflightSend), /return res\.json\(\{[\s\S]*?dryRun: true[\s\S]*?blocked: true/);

  for (const marker of [
    "[Public Inquiry] Dry-run: skipped operator email alert",
    "[External Form] Dry-run: skipped operator email alert",
    "[Public Webhook] Dry-run: skipped operator email alert",
    "[Intake] Dry-run: skipped operator email alert",
  ]) {
    const markerIndex = routesText.indexOf(marker);
    assert.ok(markerIndex > 0, `${marker} should remain in routes`);
    const sendIndex = routesText.indexOf("sendInquiryNotificationEmail", markerIndex);
    assert.ok(sendIndex > markerIndex, `${marker} should guard notification send logic`);
  }
});
