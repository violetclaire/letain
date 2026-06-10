# iOS TestFlight Prep

This repo is Capacitor-ready, but the native `ios/` project should be generated on a Mac with the Apple tooling installed.

Current Capacitor app settings:

- App ID: `com.atbriarwood.app`
- App name: `Briarwood`
- Server URL: `https://atbriarwood.com`

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
