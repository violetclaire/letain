export interface EmailCredentials {
  apiKey: string;
  fromEmail: string;
  source: "env" | "replit-connector";
}

interface ResolveEmailCredentialsOptions {
  fromEmail: string;
}

let connectionSettings: any;

function getReplitConnectorToken(): string | null {
  if (process.env.REPL_IDENTITY) {
    return `repl ${process.env.REPL_IDENTITY}`;
  }
  if (process.env.WEB_REPL_RENEWAL) {
    return `depl ${process.env.WEB_REPL_RENEWAL}`;
  }
  return null;
}

function canUseReplitConnectorFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function resolveReplitConnectorCredentials(
  fromEmail: string,
): Promise<EmailCredentials | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = getReplitConnectorToken();

  if (!hostname || !xReplitToken) {
    return null;
  }

  if (!canUseReplitConnectorFallback()) {
    console.log("Replit email connector fallback is disabled in production; set RESEND_API_KEY.");
    return null;
  }

  try {
    console.log("Trying Replit connector fallback...");
    console.log("Token type:", xReplitToken.split(" ")[0]);

    const url = `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    });

    const data = await response.json();
    console.log("Connectors response status:", response.status);

    connectionSettings = data.items?.[0];

    if (connectionSettings?.settings?.api_key) {
      console.log("Using Resend from Replit connector fallback");
      console.log(
        "Got Resend API key (first 8 chars):",
        connectionSettings.settings.api_key?.substring(0, 8) + "...",
      );
      return {
        apiKey: connectionSettings.settings.api_key,
        fromEmail,
        source: "replit-connector",
      };
    }
  } catch (err) {
    console.log("Replit connector fallback failed:", err);
  }

  return null;
}

export async function resolveEmailCredentials({
  fromEmail,
}: ResolveEmailCredentialsOptions): Promise<EmailCredentials> {
  console.log("=== Getting Resend credentials ===");

  // Production email should be configured directly with RESEND_API_KEY.
  // The Replit connector path remains only as a non-production legacy fallback
  // while the platform finishes moving off Replit-managed connectors.
  if (process.env.RESEND_API_KEY) {
    console.log("Using direct RESEND_API_KEY from environment");
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail,
      source: "env",
    };
  }

  const connectorCredentials = await resolveReplitConnectorCredentials(fromEmail);
  if (connectorCredentials) {
    return connectorCredentials;
  }

  console.error("No Resend credentials available - RESEND_API_KEY not set and connector fallback unavailable");
  throw new Error("No Resend credentials available");
}
