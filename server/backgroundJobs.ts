let localPreviewDisableLogEmitted = false;

function isLocalPreviewSignalPresent(): boolean {
  const publicBaseUrl = process.env.PUBLIC_BASE_URL?.trim() ?? "";
  const devServerHost = process.env.DEV_SERVER_HOST?.trim() ?? "";

  return (
    publicBaseUrl.startsWith("http://localhost") ||
    publicBaseUrl.startsWith("http://127.0.0.1") ||
    devServerHost === "127.0.0.1" ||
    devServerHost === "localhost" ||
    process.env.LOCAL_AUTH_BYPASS === "true"
  );
}

export function isLocalPreviewBackgroundJobsDisabled(): boolean {
  return (
    process.env.LOCAL_PREVIEW_DISABLE_JOBS === "true" &&
    process.env.NODE_ENV !== "production" &&
    isLocalPreviewSignalPresent()
  );
}

export function logLocalPreviewBackgroundJobsDisabled(): void {
  if (localPreviewDisableLogEmitted) return;

  console.warn("[Local Preview] Background jobs disabled.");
  localPreviewDisableLogEmitted = true;
}
