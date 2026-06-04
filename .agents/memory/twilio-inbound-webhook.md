---
name: Twilio inbound webhook signature validation on Replit
description: How to authenticate Twilio inbound webhooks in this repo and the URL-reconstruction gotcha behind the Replit proxy.
---

Public Twilio webhooks (e.g. inbound SMS) MUST validate the `X-Twilio-Signature` header before doing any work, or anyone can spoof `From` and inject fake data/trust events. Use `twilio.validateRequest(authToken, signature, url, params)` (wrapped as `validateTwilioRequest` in `server/smsService.ts`). Fail-closed: reject (403) when Twilio is unconfigured or the signature is missing/invalid.

**Gotcha — URL reconstruction:** `validateRequest` recomputes the HMAC over the *exact* URL Twilio POSTed to. Behind Replit's proxy, rebuild it as `` `${proto}://${req.get('host')}${req.originalUrl}` `` where `proto = req.headers['x-forwarded-proto']?.split(',')[0] || req.protocol`. If the host/proto don't match what's configured in the Twilio console, legit messages get 403'd. The webhook URL the user pastes into Twilio (e.g. the custom domain) must match the public host the request arrives on.

**Testing:** The agent shell/code-execution sandbox does NOT have `TWILIO_AUTH_TOKEN` (only the running workflow does), so you can't forge a signed request to test the happy path. Prove the security boundary instead: unsigned POST -> 403, unauthenticated admin route -> 401. Downstream logic can be tested before adding the signature gate.

**No new env vars** are needed for inbound — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` already exist.
