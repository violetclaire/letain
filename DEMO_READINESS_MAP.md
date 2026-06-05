# Briarwood Demo Readiness Map

Snapshot of what you can demonstrate end to end in the current prototype. No code was changed to produce this. Read it top to bottom before a demo.

Legend:
- Demo-ready: works end to end, safe to show.
- Works but needs manual testing: built, but click through it once with your own test data before the demo.
- Partially built: usable in parts, has a visible gap.
- Not built yet: not present.
- Risk / technical debt: works, but has a sharp edge to avoid on stage.

---

## Part 1: Area-by-area readiness

### 1. Inquiry intake
Status: Demo-ready (Works but needs manual testing for live email)
- Public form at `/:slug`. A client submits name, email, date, message. It creates the inquiry thread and kicks off the assistant logic.
- On submit it can send two real emails: a notification to the artist, and an auto-responder to the client if the artist turned that on.
- For a clean demo, keep the auto-responder OFF so nothing surprises you.

### 2. Availability / contract / calendar check
Status: Works but needs manual testing
- The server checks the requested date against signed contracts, existing bookings, and blocked calendar dates, then surfaces a verdict the assistant uses.
- Artist calendar UI at `/artist/availability` lets you block, view pending, and view booked dates.
- Test it by blocking the date you will use in the demo so you can show a real conflict.

### 3. Assistant prompt creation
Status: Demo-ready
- When a new inquiry arrives, the system generates an actionable assistant prompt server side and stores it. The prompt carries availability context and routing suggestions.

### 4. Assistant settings and prompt queue
Status: Demo-ready, with one Risk note
- `/admin/:slug/assistant` shows the prompt queue and the delivery settings (SMS on/off, email on/off, quiet hours).
- Risk / technical debt: prompts created during quiet hours (or in digest mode) are saved with a "queued" status, but there is no job that later flushes them. They will sit. Do not demo quiet hours as if it delivers later.

### 5. Response composer
Status: Demo-ready
- Opens from a prompt inside `/admin/:slug/assistant` as the inquiry composer. Pulls the inquiry context and lets the operator draft and send.
- Saving a draft never sends. Sending is a separate, explicit action. This is the core "operator approves every send" behavior.

### 6. Personalized pricing / decline draft
Status: Demo-ready
- The composer loads the artist's default pricing and decline templates, and the operator can edit the body before sending. Good moment to show personalization on stage.

### 7. Generic route / delegation target management
Status: Demo-ready
- `/admin/:slug/network` is the address book of route targets (team, trusted circle, or external colleagues). Full create/edit/list.

### 8. Route / delegation preflight
Status: Works but needs manual testing
- From the composer's refer/route mode, the operator picks a target and sends a preflight to check interest before any client is involved.
- This sends a real message to the target (email, or SMS if that channel is set). Use a target contact you control.

### 9. Accepted route target gating before client referral
Status: Demo-ready
- A referral to the client can only be sent after at least one target has accepted the preflight. The button is disabled in the UI, and the rule is also enforced on the server so it cannot be skipped. Strong trust story to show.

### 10. Trust Timeline showing SMS / composer / routing activity
Status: Demo-ready
- On the private inquiry thread (`/inquiry/{token}`), visible only to the signed-in artist or admin.
- Now shows: inbound SMS matches, composer activity (drafted, pricing sent, declined, referral sent), and routing activity (routed/delegated, preflight sent, target accepted/declined, reply needs review), plus booking/system events.
- Read only. It derives entries from the inquiry's own records, so links are exact and nothing is invented.

### 11. Observational score-neutral events
Status: Demo-ready (verify by inspection, not by a screen)
- All composer and routing events are recorded with signal strength 0 and never move a CDI score. This is correct by design, but it is "absence of an effect," so it does not have its own screen. Show it via the Trust Timeline (the entries appear but carry no score) or by a read-only database check if a technical audience asks.

---

## Part 2: How to run the demo safely

### A. The cleanest demo flow (test emails/phones only)
Use one test address as the "client" and a second test address/phone as the "route target." Everything you trigger should land in inboxes you own.

1. Submit a test inquiry on the public form as the client.
2. Open the assistant queue and show the prompt that was generated, with availability context.
3. Open the composer from that prompt. Show the pricing draft, personalize it, send it to your test client.
4. Switch the composer to refer/route mode. Send a preflight to your test target.
5. As the target, accept the preflight.
6. Show the gate flip: the client referral is now allowed. Send it.
7. Open the inquiry thread and walk the Trust Timeline showing SMS, composer, and routing entries.
8. Optional for a technical audience: show that those events carry signal strength 0 and the CDI score is unchanged.

### B. Which screens to open, in order
1. `/:slug` (public inquiry form)
2. `/admin/:slug/assistant` (prompt queue + settings + composer)
3. `/admin/:slug/network` (route targets, if you need to add one live)
4. `/artist/availability` (only if you want to show a calendar conflict)
5. `/inquiry/{token}` (the thread + Trust Timeline)

### C. Which data to create first
1. An artist/operator account with a slug.
2. In assistant settings: set the assistant email and phone to addresses you control, and turn the auto-responder OFF.
3. Fill in the pricing and decline templates on the artist profile.
4. Add at least one route target whose contact is your second test address/phone.
5. Optional: block the demo date on the calendar to show an availability conflict.

### D. Which parts send real emails / SMS
Real email (Resend):
- Artist notification on new inquiry.
- Client auto-responder (only if turned on).
- Composer sends (pricing/info to the client).
- Referral notifications (to client and/or referred vendor).
- Schedule emails (if you show scheduling).
Real SMS (Twilio):
- Assistant prompt delivery to the operator.
- Preflight to a target, when its channel is SMS.
- Schedule SMS and booking reminders (if you show them).
Rule: only ever point these at addresses/phones you own during a demo.

### E. Which parts are simulated or manual
- If the email or SMS keys are missing, the app logs a warning and does not send. It will not crash, but nothing arrives.
- Quiet hours / digest: messages are saved as "queued" but never auto-flushed (no job yet). Treat as manual/incomplete.
- The score-neutral events have no dedicated screen; confirm them via the timeline or a read-only DB check.
- Marking a preflight as accepted during the demo is an operator/manual step.

### F. Briarwood core vs temporary DateInquiry bridge
Briarwood core (permanent infrastructure, safe to anchor the story on):
- Assistant prompt layer, response composer, route targets, inquiry routes, inquiry responses, the preflight handshake, the acceptance gate, the Trust Timeline, and the score-neutral event model.
Temporary DateInquiry bridge (intake plumbing, do not name permanent concepts after it):
- The public inquiry intake form, the inquiry status/flow, the auto-responder, and the info-sheet send path.
Live source for real data: Makeup Dolls.

### G. What not to show yet
- Quiet hours / digest delivery (queued items do not flush).
- Anything you were told to keep out of scope: payments, contracts, invoices, AI/smart auto-responder, and inbound email. Code paths for some of these exist but are not part of this demo and are not validated for it.
- The raw database or any view that could expose more than one artist's data.

### H. The safest next build after demo validation
Build a delivery preview / dry-run mode for the composer, preflight, and assistant prompts: a toggle that shows exactly what would be sent and to whom, without sending. 
- Why this first: it makes every future demo and every operator's first run safe by default, it removes the "real email might fire" risk noted above, and it touches only the send layer (no payments, no AI, no contracts, no inbound email, no refactor).
- Close second: a flush job for queued quiet-hours/digest prompts, so that the one visible gap in the assistant queue is closed.

