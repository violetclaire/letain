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
