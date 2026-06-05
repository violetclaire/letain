import { useState, useEffect } from "react";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { RolodexSearchResponse, RolodexResult } from "@shared/schema";

const TYPE_LABELS: Record<RolodexResult["type"], string> = {
  contact: "Client / contact",
  route_target: "Routing network",
  inquiry: "Inquiry",
  contract: "Contract",
  booking: "Booking",
  assistant_prompt: "Assistant prompt",
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value; // free-form text date (e.g. contract eventDates)
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function quickLink(r: RolodexResult, slug: string, authParam: string): string | null {
  if (r.type === "inquiry" && r.threadToken) {
    return `/inquiry/${r.threadToken}`;
  }
  if (r.type === "route_target") {
    return `/admin/${slug}/network${authParam}`;
  }
  if (r.type === "contract" || r.type === "booking") {
    return `/admin/${slug}/archive${authParam}`;
  }
  if (r.type === "assistant_prompt") {
    return `/admin/${slug}/assistant${authParam}`;
  }
  return null;
}

function ResultRow({ r, slug, authParam }: { r: RolodexResult; slug: string; authParam: string }) {
  const date = formatDate(r.date);
  const link = quickLink(r, slug, authParam);
  return (
    <div
      className="border border-hairline bg-surface px-4 py-3"
      data-testid={`result-${r.type}-${r.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-ink truncate" data-testid={`text-title-${r.id}`}>
              {r.title}
            </span>
            <span className="text-xs uppercase tracking-wide text-ink/50">
              {TYPE_LABELS[r.type]}
            </span>
            {r.status && (
              <span className="text-xs text-ink/60 border border-hairline px-1.5 py-0.5">
                {r.status}
              </span>
            )}
          </div>
          {r.subtitle && (
            <p className="text-sm text-ink/70 mt-0.5 truncate">{r.subtitle}</p>
          )}
          <div className="text-sm text-ink/60 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            {r.email && <span>{r.email}</span>}
            {r.phone && <span>{r.phone}</span>}
            {r.roleLabel && <span>{r.roleLabel}</span>}
            {date && <span>{date}</span>}
          </div>
          {r.tags && r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {r.tags.map((t, i) => (
                <span key={i} className="text-xs text-ink/60 border border-hairline px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        {link && (
          <Link
            href={link}
            className="text-sm text-ink underline whitespace-nowrap shrink-0"
            data-testid={`link-open-${r.id}`}
          >
            Open
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Rolodex() {
  const [, params] = useRoute("/admin/:slug/rolodex");
  const slug = params?.slug ?? "";
  const searchString = useSearch();
  const authParam = searchString ? `?${searchString}` : "";
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  // Hard auth gate: this is a private internal page. Send unauthenticated
  // visitors to sign in before any search UI renders.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = `/artist-login?redirect=${encodeURIComponent(`/admin/${slug}/rolodex`)}`;
    }
  }, [authLoading, isAuthenticated, slug]);

  const searchQuery = useQuery<RolodexSearchResponse>({
    queryKey: ["/api/rolodex/search", query],
    queryFn: async () => {
      const res = await fetch(`/api/rolodex/search?q=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.trim().length > 0,
    retry: false,
  });

  const isAuthError = (searchQuery.error as Error)?.message === "401";

  if (isAuthError) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center" data-testid="text-auth-required">
          <h1 className="font-serif text-2xl tracking-tight mb-3">Please sign in</h1>
          <p className="text-ink/70 mb-6">
            The Rolodex is private. Sign in to search the people and records you work with.
          </p>
          <Link
            href={`/artist-login?redirect=${encodeURIComponent(`/admin/${slug}/rolodex`)}`}
            className="underline text-ink"
            data-testid="link-sign-in"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  // While auth resolves (or while redirecting unauthenticated users), do not
  // render the private search UI.
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="flex items-center gap-2 text-ink/60" data-testid="status-auth-loading">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading
        </div>
      </div>
    );
  }

  const data = searchQuery.data;
  const hasSearched = query.trim().length > 0;
  const hasResults = !!data && data.groups.length > 0;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-10">
        {slug && (
          <Link
            href={`/admin/${slug}${authParam}`}
            className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink mb-6"
            data-testid="link-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        )}

        <header className="mb-8">
          <h1 className="font-serif text-3xl tracking-tight mb-2" data-testid="text-page-title">
            Rolodex
          </h1>
          <p className="text-ink/70 max-w-[70ch]">
            Find the people and records you work with. Search by name, email, phone,
            role, tag, venue, or date. You only ever see your own records.
          </p>
        </header>

        <form
          className="mb-10 max-w-[70ch]"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(input.trim());
          }}
        >
          <div className="flex items-center gap-2 border border-hairline bg-surface px-3 py-2 focus-within:ring-1 focus-within:ring-oxblood/70">
            <Search className="w-4 h-4 text-ink/50 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search a name, email, phone, date, venue, or role"
              className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink/40"
              data-testid="input-search"
              autoFocus
            />
            <button
              type="submit"
              className="text-sm bg-ink text-bg px-3 py-1.5"
              data-testid="button-search"
            >
              Search
            </button>
          </div>
        </form>

        {searchQuery.isLoading && hasSearched && (
          <div className="flex items-center gap-2 text-ink/60" data-testid="status-loading">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching
          </div>
        )}

        {!hasSearched && (
          <div className="text-ink/60" data-testid="text-empty-initial">
            Try searching a name, email, phone, date, venue, or role.
          </div>
        )}

        {hasSearched && !searchQuery.isLoading && !hasResults && (
          <div data-testid="text-empty-no-results">
            <p className="text-ink/80">No matching people or records found.</p>
            <p className="text-ink/60 mt-1">
              Try searching a name, email, phone, date, venue, or role.
            </p>
          </div>
        )}

        {hasResults && (
          <div className="space-y-10">
            {data!.groups.map((group) => (
              <section key={group.type} data-testid={`group-${group.type}`}>
                <h2 className="font-serif text-xl tracking-tight mb-3">
                  {group.label}
                  <span className="text-sm text-ink/50 ml-2">({group.results.length})</span>
                </h2>
                <div className="space-y-2">
                  {group.results.map((r) => (
                    <ResultRow key={`${r.type}-${r.id}`} r={r} slug={slug} authParam={authParam} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
