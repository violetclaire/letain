export const BRIARWOOD_PUBLIC_BASE_URL = "https://briarwood.ai";
export const LEGACY_DATEINQUIRY_PUBLIC_BASE_URL = "https://dateinquiry.com";

interface PublicBaseUrlOptions {
  fallback?: string;
}

export function getPublicBaseUrl({
  fallback = BRIARWOOD_PUBLIC_BASE_URL,
}: PublicBaseUrlOptions = {}): string {
  return process.env.PUBLIC_BASE_URL || fallback;
}

export function getBriarwoodPublicBaseUrl(): string {
  return getPublicBaseUrl();
}

export function getLegacyDateInquiryPublicBaseUrl(): string {
  return getPublicBaseUrl({
    fallback: LEGACY_DATEINQUIRY_PUBLIC_BASE_URL,
  });
}
