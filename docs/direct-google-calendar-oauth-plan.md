# Direct Google Calendar OAuth Plan

This document describes the intended direct Google Calendar credential model. It does not change current calendar behavior.

## Current State

- `server/calendar/replitProvider.ts` remains the default calendar provider.
- `getDefaultCalendarProvider()` returns a `ReplitCalendarProvider` singleton.
- `server/googleCalendarService.ts` and `server/googleCalendarClient.ts` import that default provider directly from `server/calendar/replitProvider.ts`.
- Current Google Calendar access still depends on the Replit connector variables:
  - `REPLIT_CONNECTORS_HOSTNAME`
  - `REPL_IDENTITY`
  - `WEB_REPL_RENEWAL`
- Availability behavior remains unchanged: Google Calendar busy lookup failures are caught and return an empty busy list.

## Future Direct OAuth Model

The direct provider should use owner-scoped Google OAuth credentials instead of Replit connector tokens.

Suggested token record shape:

- `id`
- `operatorId`
- `provider`, fixed to `google_calendar`
- `googleAccountEmail`, nullable until userinfo is fetched
- `accessTokenEncrypted`, nullable/short-lived
- `refreshTokenEncrypted`, required after consent
- `scope`, storing granted scopes
- `tokenType`
- `expiryDate`
- `calendarId`, default `primary`
- `connectedAt`
- `lastRefreshAt`
- `lastErrorAt`
- `lastErrorCode`
- `createdAt`
- `updatedAt`

Token storage requirements:

- Tokens must be owner-scoped by `operatorId`.
- Refresh tokens must be encrypted at rest before storage.
- Access tokens should be treated as short-lived secrets and either encrypted or not persisted.
- Direct OAuth callback state must be signed or stored server-side with expiration.
- Disconnect must revoke/delete stored credentials without affecting inquiry, schedule, contract, payment, or trust data.

## Required Environment Variables For Direct OAuth

Future direct OAuth will require:

- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`
- token encryption key material, for example `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`

Keep the current Replit connector variables until the direct provider is active:

- `REPLIT_CONNECTORS_HOSTNAME`
- `REPL_IDENTITY`
- `WEB_REPL_RENEWAL`

## Required Future Endpoints

These endpoints should be added in a later PR only after token storage is designed and tested:

- `GET /api/calendar/google/status`
- `GET /api/calendar/google/connect`
- `GET /api/calendar/google/callback`
- `POST /api/calendar/google/disconnect`

Endpoint rules:

- authenticated artist/operator only
- owner-scoped token access only
- no public-token access
- no calendar event creation in the provider migration PR
- no availability behavior changes until the provider switch is separately tested

## Provider Switch Safety

Before switching the default calendar provider:

- Keep PR #43 calendar/availability characterization tests green.
- Add direct provider tests with mocked OAuth2 clients.
- Add token encryption/decryption tests.
- Verify expired access tokens refresh through the stored refresh token.
- Verify missing/revoked credentials fail closed and preserve existing availability fallback behavior.
- Confirm assistant availability analysis output stays unchanged unless a separate product PR intentionally changes it.

## What Not To Change Yet

- Current `ReplitCalendarProvider` default behavior.
- Availability decisions or `storage.checkAvailability` behavior.
- Assistant/auto-responder behavior.
- Calendar event creation behavior.
- Auth/session behavior.
- Schema/runtime migrations.
- UI, email/SMS, storage, payments/contracts, CDI/trust scoring, or iOS/native code.
