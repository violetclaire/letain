import type { CalendarProvider } from "./provider";
import { getDefaultReplitCalendarProvider } from "./replitProvider";

export type CalendarProviderName = "replit" | "direct";

export interface DirectCalendarProviderEnvConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: string;
}

interface CreateConfiguredCalendarProviderOptions {
  env?: NodeJS.ProcessEnv;
  createReplitProvider?: () => CalendarProvider;
  createDirectProvider?: () => CalendarProvider;
}

let cachedProviderName: CalendarProviderName | null = null;
let cachedProvider: CalendarProvider | null = null;

export function getConfiguredCalendarProviderName(
  env: NodeJS.ProcessEnv = process.env,
): CalendarProviderName {
  const configuredProvider = (env.CALENDAR_PROVIDER || "replit").trim().toLowerCase();

  if (configuredProvider === "replit" || configuredProvider === "direct") {
    return configuredProvider;
  }

  throw new Error(
    `Unsupported CALENDAR_PROVIDER "${env.CALENDAR_PROVIDER}". ` +
      'Expected "replit" or "direct".',
  );
}

export function validateDirectCalendarProviderEnv(
  env: NodeJS.ProcessEnv = process.env,
): DirectCalendarProviderEnvConfig {
  const config = {
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri: env.GOOGLE_CALENDAR_REDIRECT_URI,
    tokenEncryptionKey: env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY,
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      "Direct calendar provider requires Google Calendar OAuth env config: " +
        missing.join(", "),
    );
  }

  return config as DirectCalendarProviderEnvConfig;
}

export function createConfiguredCalendarProvider({
  env = process.env,
  createReplitProvider = getDefaultReplitCalendarProvider,
  createDirectProvider = () => {
    throw new Error(
      "Direct calendar provider requires token storage and OAuth runtime wiring before it can be selected.",
    );
  },
}: CreateConfiguredCalendarProviderOptions = {}): CalendarProvider {
  const providerName = getConfiguredCalendarProviderName(env);

  if (providerName === "direct") {
    validateDirectCalendarProviderEnv(env);
    return createDirectProvider();
  }

  return createReplitProvider();
}

export function getDefaultCalendarProvider(): CalendarProvider {
  const providerName = getConfiguredCalendarProviderName();

  if (cachedProvider && cachedProviderName === providerName) {
    return cachedProvider;
  }

  cachedProvider = createConfiguredCalendarProvider();
  cachedProviderName = providerName;
  return cachedProvider;
}
