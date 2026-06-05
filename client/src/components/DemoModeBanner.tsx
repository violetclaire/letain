import { useQuery } from "@tanstack/react-query";

interface AssistantSettingsLite {
  assistantDryRun?: boolean;
}

const COPY = "Dry run is ON. Briarwood will preview messages but will not send emails or texts.";

export function DemoModeBanner({ variant = "page" }: { variant?: "page" | "compact" }) {
  const { data } = useQuery<AssistantSettingsLite>({
    queryKey: ["/api/assistant/settings"],
    queryFn: async () => {
      const res = await fetch("/api/assistant/settings", { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    retry: false,
    staleTime: 30_000,
  });

  if (!data?.assistantDryRun) return null;

  if (variant === "compact") {
    return (
      <div
        className="flex items-start gap-2 border border-brass/50 bg-brass/10 px-3 py-2 text-xs text-ink"
        data-testid="banner-demo-mode-compact"
        role="status"
      >
        <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-oxblood" aria-hidden="true" />
        <span>
          <span className="font-semibold">Demo Mode / Dry Run ON.</span> {COPY}
        </span>
      </div>
    );
  }

  return (
    <div
      className="mb-8 flex items-start gap-3 border border-brass/60 bg-brass/10 px-4 py-3"
      data-testid="banner-demo-mode"
      role="status"
    >
      <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-oxblood" aria-hidden="true" />
      <div>
        <div className="font-semibold text-ink" data-testid="text-demo-mode-title">
          Demo Mode / Dry Run ON
        </div>
        <p className="text-sm text-ink/70">{COPY}</p>
      </div>
    </div>
  );
}
