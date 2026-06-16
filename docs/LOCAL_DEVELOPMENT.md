# Local Platform Preview

This guide is for viewing the current Briarwood prototype locally. It does not change production hosting, domains, auth, database behavior, or provider defaults.

## What This Preview Loop Does

- Backend API: `http://localhost:5000`
- Vite frontend: `http://localhost:5173`
- Vite dev-only proxy: local `/api` requests from `localhost:5173` are forwarded to `http://localhost:5000`

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

The backend reads `process.env` directly. This repo does not currently add a dotenv loader for `npm run dev:server`, so make sure your shell, terminal profile, or host tooling exports the needed values before starting the backend.

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
