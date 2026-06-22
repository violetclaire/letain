# Local Platform Preview

This guide is for viewing the current Briarwood prototype locally. It does not change production hosting, domains, auth, database behavior, or provider defaults.

## What This Preview Loop Does

- Backend API: `http://localhost:5000` by default, or `http://localhost:5001` when `PORT=5001`
- Vite frontend: `http://localhost:5173`
- Vite dev-only proxy: local `/api` requests from `localhost:5173` are forwarded to `http://localhost:5000` by default, or to `VITE_API_PROXY_TARGET` when set
- Local backend bind override: `DEV_SERVER_HOST=127.0.0.1`
- Local preview does not require `reusePort`; leave `DEV_SERVER_REUSE_PORT` unset unless you explicitly need to opt in.

The proxy exists only in the Vite development server. Production builds and backend runtime behavior are unchanged.

## Setup

Install dependencies:

```powershell
npm ci
```

Create local environment values from the placeholder file:

```powershell
Copy-Item .env.example .env.local
```

Fill `.env.local` with staging or disposable local-preview values. `npm run dev:server` loads `.env.local` for the local dev server. If `.env.local` is absent, it falls back to `.env`. Existing shell-provided values for variables in the env file still win over file values.

This local env loading is only part of the development server script. Production startup remains `npm run start` and does not use the local dev wrapper.

Keep `DEV_SERVER_HOST=127.0.0.1` in local preview if your machine cannot bind the API server to `0.0.0.0`. The production/default host remains unchanged unless this variable is set, and the local preview API should bind to `127.0.0.1` on the configured backend port.

If `127.0.0.1:5000` is unavailable locally, keep production/default behavior unchanged and use a local alternate port in `.env.local`:

```env
PORT=5001
VITE_API_PROXY_TARGET=http://localhost:5001
```

With those values, the backend should bind to `127.0.0.1:5001` and the Vite dev proxy should forward `/api` calls to `http://localhost:5001`.

Leave `DEV_SERVER_REUSE_PORT` unset for normal local preview. When `DEV_SERVER_HOST` is set, the backend omits `reusePort` by default for Windows/local compatibility. Set `DEV_SERVER_REUSE_PORT=true` only if you explicitly need to opt back into reuse-port binding.

Current login/logout/callback behavior is Replit OIDC-backed by default. If Replit OIDC discovery is unavailable during local preview, set `LOCAL_AUTH_BYPASS=true` only with localhost preview values and use the seeded demo operator credentials at `/artist-login`. The bypass skips Replit OIDC route setup for local preview only; it does not create production auth behavior and should not be set in production.

If your local network blocks background scheduled database work during browser preview, set `LOCAL_PREVIEW_DISABLE_JOBS=true` only with localhost preview values. This disables in-process cron, scheduled-email processing, and background OAuth-state cleanup registration for local preview while leaving API routes, auth, database reads, and page loading available. Do not set this flag in production.

Use a staging or disposable database for local preview. The backend may run additive database setup on startup, so do not point local preview at production casually.

## Run

Start the backend API:

```powershell
npm run dev:server
```

In a second terminal, start the Vite frontend:

```powershell
npm run dev:client
```

Open:

```text
http://localhost:5173
```

Useful local paths:

- Public app shell: `http://localhost:5173/`
- Operator login: `http://localhost:5173/artist-login`
- Operator dashboard: `http://localhost:5173/artist`
- Inquiry Workspace: `http://localhost:5173/inquiry-workspace`
- Route target network: `http://localhost:5173/admin/:slug/network`
- Schedule draft builder: `http://localhost:5173/admin/:slug/schedules/:scheduleId`

## Safety Notes

- Do not test email, SMS, payments, contract sends, Square, or public-token delivery against production services from local preview.
- Do not add real secrets to `.env.example`.
- Do not use production databases for exploratory local preview.
- This guide does not create demo data. A safe demo dataset should be designed separately before seeding.
