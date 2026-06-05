---
name: Network-free demo/public routes
description: How to keep a public Briarwood demo route truly network-free
---

A global `InviteRedirectHandler` is mounted app-wide in `client/src/App.tsx` and
fires a `useQuery(["/api/auth/user"])` on every route, including otherwise static
public/demo pages.

Rule: any route that must make ZERO network calls (e.g. a no-login demo) must
disable that query for its path. The handler now gates it with
`enabled: !location.startsWith("/demo")`.

**Why:** a self-contained demo can still trip a backend auth call from a global
handler even when the page component itself has no fetches. Reviewers flag this as
violating a "no network calls" requirement.

**How to apply:** when adding a new network-free public surface, either put it
under `/demo/*` or extend the `enabled` guard to cover its prefix.
