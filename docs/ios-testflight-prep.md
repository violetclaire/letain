# iOS TestFlight Prep

This repo is Capacitor-ready, but the native `ios/` project should be generated on a Mac with the Apple tooling installed.

Current Capacitor app settings:

- App ID: `com.atbriarwood.app`
- App name: `Briarwood`
- Server URL: `https://atbriarwood.com`

The Capacitor app uses `https://atbriarwood.com` as a remote webview. Before TestFlight, that URL must load the real React app, not only the API server, health routes, or marketing landing page. After PR #36, the backend no longer serves the React SPA itself, so backend/API hosting and frontend/static hosting must both be validated before generating or testing the iOS wrapper.

## Requirements

- Node.js `>=22.12.0`
- Xcode
- CocoaPods
- Apple Developer account access for signing and TestFlight upload

## Generate The iOS Wrapper

Run these commands from a clean branch on a Mac:

```bash
npm ci
npm run check
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

Before opening the app in Xcode, verify:

- the backend API is reachable at the expected production origin
- the frontend React app is hosted and loads at `https://atbriarwood.com`
- authenticated operator flows work from the hosted frontend
- the hosted frontend can call the backend API with the expected cookie/session behavior

## Production Environment Readiness

The iOS wrapper loads `https://atbriarwood.com`, so the hosted web app and API environment need to be production-ready before TestFlight validation.

Required production configuration to confirm before native testing:

- `NODE_ENV=production`
- `NEON_DATABASE_URL` for the live app/session database, with `DATABASE_URL` understood as the remaining Drizzle/fallback variable
- `SESSION_SECRET`
- `PUBLIC_BASE_URL=https://atbriarwood.com`
- `RESEND_API_KEY` for production email
- `REPL_ID` and `ISSUER_URL` while Replit OIDC remains the active login provider
- `PUBLIC_OBJECT_SEARCH_PATHS` and `PRIVATE_OBJECT_DIR` while the current object storage service remains active

Provider defaults to remember:

- Calendar still defaults to the Replit Google Calendar connector provider.
- Storage still defaults to the Replit object-storage sidecar provider.
- Email uses direct `RESEND_API_KEY` first; the Replit Resend connector is non-production legacy fallback only.
- Auth has neutral session/identity helpers, but login/logout/callback still use `server/replitAuth.ts`.

Do not remove the remaining Replit calendar, storage, or auth assumptions as part of iOS wrapper generation. Provider replacement should happen in separate backend PRs with characterization tests.

After `npx cap open ios`, use Xcode to configure signing, bundle capabilities, app icons, launch screen assets, and archive/upload settings.

## Commit Safety

Commit the generated Capacitor iOS project when it is ready for review, but do not commit local build artifacts or signing material.

Do not commit:

- `ios/App/Pods/`
- `ios/App/build/`
- `ios/DerivedData/`
- Xcode user state such as `*.xcuserdata/` or `*.xcuserstate`
- Signing secrets such as `*.mobileprovision`, `*.p12`, `*.cer`, or `*.developerprofile`

Keep generated native changes separate from product work. The iOS wrapper PR should not change auth, payments, contracts, SMS/email, CDI/trust scoring, public-token routes, schedule behavior, or inquiry behavior.
