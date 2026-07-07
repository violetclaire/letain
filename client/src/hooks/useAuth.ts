import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

const LOCAL_DEMO_PATH_PREFIXES = [
  "/admin/briarwood-demo",
  "/inquiry-workspace",
  "/settings",
  "/artist/availability",
];

function isLocalPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function shouldBootstrapLocalDemoAccess(): boolean {
  if (typeof window === "undefined" || !isLocalPreviewHost()) return false;
  return LOCAL_DEMO_PATH_PREFIXES.some((prefix) => {
    const path = window.location.pathname;
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

export async function fetchAuthUser(): Promise<User | null> {
  const authResponse = await fetch("/api/auth/user", { credentials: "include" });
  if (authResponse.ok) {
    const user = await authResponse.json();
    if (user) return user;
  }

  if (!shouldBootstrapLocalDemoAccess()) {
    return null;
  }

  const redirectTo = `${window.location.pathname}${window.location.search}`;
  const demoResponse = await fetch("/api/demo/local-access", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirectTo }),
  });

  if (!demoResponse.ok) {
    return null;
  }

  const retryResponse = await fetch("/api/auth/user", { credentials: "include" });
  if (!retryResponse.ok) {
    return null;
  }

  return retryResponse.json();
}

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchAuthUser,
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
  };
}
