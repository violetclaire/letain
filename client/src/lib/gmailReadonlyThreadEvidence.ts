export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GMAIL_THREAD_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me/threads";
const GMAIL_THREAD_ID_PATTERN = /^[A-Za-z0-9_-]{8,}$/;

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
};

export type GmailThreadResource = {
  id?: string;
  messages?: Array<{
    id?: string;
    internalDate?: string;
    snippet?: string;
    payload?: GmailMessagePart;
  }>;
};

export type GmailThreadEvidence = {
  threadId: string;
  subject: string;
  messageCount: number;
  evidenceText: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleOauth2Namespace = {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    include_granted_scopes: boolean;
    callback: (response: GoogleTokenResponse) => void;
    error_callback: (error: { type?: string }) => void;
  }): {
    requestAccessToken(): void;
  };
  hasGrantedAllScopes(response: GoogleTokenResponse, ...scopes: string[]): boolean;
};

let googleIdentityServicesPromise: Promise<GoogleOauth2Namespace> | null = null;

function googleOauth2FromWindow(): GoogleOauth2Namespace | undefined {
  const google = window.google as { accounts?: { oauth2?: GoogleOauth2Namespace } } | undefined;
  return google?.accounts?.oauth2;
}

function normalizeThreadId(candidate: string): string | null {
  let decoded = candidate.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  const withoutQuery = decoded.split(/[?&]/, 1)[0];
  return GMAIL_THREAD_ID_PATTERN.test(withoutQuery) ? withoutQuery : null;
}

export function gmailThreadIdFromReference(reference: string): string | null {
  const trimmed = reference.trim();
  const direct = normalizeThreadId(trimmed);
  if (direct) return direct;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "mail.google.com") return null;

  const candidates = `${url.pathname}/${url.hash.replace(/^#/, "")}`
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .reverse();
  for (const candidate of candidates) {
    const threadId = normalizeThreadId(candidate);
    if (threadId) return threadId;
  }
  return null;
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = globalThis.atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, name: string) => {
    if (name.startsWith("#")) {
      const isHex = name[1]?.toLowerCase() === "x";
      const point = Number.parseInt(name.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return namedEntities[name.toLowerCase()] ?? entity;
  });
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<div\b[^>]*class=["'][^"']*gmail_quote[^"']*["'][^>]*>[\s\S]*$/i, "")
      .replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, "")
      .replace(/<(?:br|\/p|\/div|\/li|\/tr)\b[^>]*>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  );
}

function stripQuotedReply(value: string): string {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const quotedReplyStart = lines.findIndex((line) => /^On\s.+wrote:\s*$/i.test(line.trim()));
  const currentMessage = quotedReplyStart >= 0 ? lines.slice(0, quotedReplyStart) : lines;
  return currentMessage
    .filter((line) => !/^\s*>/.test(line))
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodedParts(part: GmailMessagePart | undefined, mimeType: string): string[] {
  if (!part) return [];
  const matches = part.mimeType?.toLowerCase() === mimeType && part.body?.data
    ? [decodeBase64Url(part.body.data)]
    : [];
  return [...matches, ...(part.parts ?? []).flatMap((child) => decodedParts(child, mimeType))];
}

function messageBody(message: NonNullable<GmailThreadResource["messages"]>[number]): string {
  const plainParts = decodedParts(message.payload, "text/plain");
  if (plainParts.length > 0) return stripQuotedReply(plainParts.join("\n\n"));

  const htmlParts = decodedParts(message.payload, "text/html");
  if (htmlParts.length > 0) return stripQuotedReply(htmlParts.map(htmlToText).join("\n\n"));

  return stripQuotedReply(message.snippet ?? "");
}

function headerValue(payload: GmailMessagePart | undefined, name: string): string {
  return payload?.headers
    ?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
    ?.value
    ?.replace(/\s+/g, " ")
    .trim() ?? "";
}

function orderedMessages(thread: GmailThreadResource): NonNullable<GmailThreadResource["messages"]> {
  return [...(thread.messages ?? [])]
    .map((message, index) => ({ message, index }))
    .sort((left, right) => {
      const leftDate = Number(left.message.internalDate);
      const rightDate = Number(right.message.internalDate);
      if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) {
        return leftDate - rightDate;
      }
      return left.index - right.index;
    })
    .map(({ message }) => message);
}

export function gmailThreadToEvidence(thread: GmailThreadResource): GmailThreadEvidence {
  const threadId = normalizeThreadId(thread.id ?? "");
  if (!threadId) throw new Error("Gmail returned a thread without a valid thread ID.");

  const messages = orderedMessages(thread);
  if (messages.length === 0) throw new Error("The Gmail thread does not contain any readable messages.");

  const subject = messages.map((message) => headerValue(message.payload, "Subject")).find(Boolean) || "Untitled Gmail thread";
  const evidenceText = messages
    .map((message, index) => {
      const body = messageBody(message);
      const lines = [
        `Message ${index + 1}`,
        ...(index === 0 ? ["Source: Gmail thread (private read-only)", `Thread subject: ${subject}`] : []),
        headerValue(message.payload, "From") ? `From: ${headerValue(message.payload, "From")}` : "",
        headerValue(message.payload, "To") ? `To: ${headerValue(message.payload, "To")}` : "",
        headerValue(message.payload, "Date") ? `Date: ${headerValue(message.payload, "Date")}` : "",
        body || "[No inline message body was available in the read-only thread response.]",
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n\n");

  return {
    threadId,
    subject,
    messageCount: messages.length,
    evidenceText,
  };
}

export async function fetchGmailThreadEvidence(
  threadReference: string,
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<GmailThreadEvidence> {
  const threadId = gmailThreadIdFromReference(threadReference);
  if (!threadId) throw new Error("Enter a Gmail thread ID or a mail.google.com thread URL.");
  if (!accessToken.trim()) throw new Error("Gmail read-only access was not granted.");

  const response = await fetcher(`${GMAIL_THREAD_API_BASE}/${encodeURIComponent(threadId)}?format=full`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Gmail read-only access expired or was not granted for this account.");
    }
    if (response.status === 404) throw new Error("That Gmail thread was not found in the connected account.");
    throw new Error(`Gmail could not return this thread (HTTP ${response.status}).`);
  }

  return gmailThreadToEvidence(await response.json() as GmailThreadResource);
}

async function loadGoogleIdentityServices(): Promise<GoogleOauth2Namespace> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Gmail read-only access requires a browser session.");
  }
  const existing = googleOauth2FromWindow();
  if (existing) return existing;

  if (!googleIdentityServicesPromise) {
    googleIdentityServicesPromise = new Promise<GoogleOauth2Namespace>((resolve, reject) => {
      const finish = () => {
        const oauth2 = googleOauth2FromWindow();
        if (oauth2) resolve(oauth2);
        else reject(new Error("Google read-only authorization did not load."));
      };
      const fail = () => reject(new Error("Google read-only authorization could not be loaded."));
      const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", finish, { once: true });
        existingScript.addEventListener("error", fail, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      googleIdentityServicesPromise = null;
      throw error;
    });
  }
  const loading = googleIdentityServicesPromise;
  if (!loading) throw new Error("Google read-only authorization could not be loaded.");
  return loading;
}

async function requestGmailReadonlyAccessToken(clientId: string): Promise<string> {
  if (!clientId.trim()) throw new Error("Gmail read-only access is not configured for this environment.");
  const oauth2 = await loadGoogleIdentityServices();

  return new Promise((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_READONLY_SCOPE,
      include_granted_scopes: false,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || "Gmail read-only access was not granted."));
          return;
        }
        if (!oauth2.hasGrantedAllScopes(response, GMAIL_READONLY_SCOPE)) {
          reject(new Error("The Gmail read-only scope was not granted."));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.type === "popup_closed" ? "Google authorization was closed before access was granted." : "Google read-only authorization could not start."));
      },
    });
    tokenClient.requestAccessToken();
  });
}

export async function importGmailThreadEvidence(
  threadReference: string,
  clientId: string,
): Promise<GmailThreadEvidence> {
  const accessToken = await requestGmailReadonlyAccessToken(clientId);
  return fetchGmailThreadEvidence(threadReference, accessToken);
}
