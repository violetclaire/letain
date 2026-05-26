# Briarwood — Coding Session Transcript

**What we built in one session:** a "handoff accountability loop" for Briarwood, a coordination layer for independent bridal artists. When one artist is double-booked and refers the client to a peer, the originator is supposed to have secured payment and locked scope before handing off. Today there's zero accountability. This session adds the schema, API, UI, and security review for a working slice.

The valuable part of this transcript isn't the code — it's the back-and-forth. I told the agent a real failure I lived through, it proposed schema in my domain language, I corrected it twice on product semantics, and the final code reflects those corrections exactly.

---

## Round 1 — The story

> Me: "$2000 wedding got bumped to $2600 last-minute. I handed it to a peer. She wasn't paid as agreed, she didn't disclose the full scope of services, and I can't even ask her about it without ruffling feathers. I extracted rules: payment 2 weeks ahead = good, day-of = bad, scope lives ON the contract, willingness-to-work-again is private/gut-driven."

> Agent (proposed): extend the existing `threadReferrals` table with `paymentSecuredStatus`, `contractAttachedId`, `helperReportedOutcome`, `helperWouldWorkAgain` (boolean), aggregate "% of peers willing to work with you again" surface for the originator.

## Round 2 — My first correction

> Me: "We don't say never again. I have compassion. The lesson is COACHING. She should take payment 2 weeks ahead — I never have either, that's why this protects everyone. The real problem was she wasn't paid as said and didn't tell us full scope. And we can't ask, it's too sensitive."

> Agent (reframed):
> - The product is not a blacklist. It's a coach + a shield.
> - Gate at handoff creation, not after — if the originator can't attest payment + scope + contract, the handoff goes out flagged so the helper sees gaps before accepting.
> - Outcome buckets reframed with compassion: `clean` / `paid_as_agreed_but_scope_off` / `paid_late_or_partial` / `scope_and_payment_both_off` / `cancellation_no_fault`. No "would never work with them again" flag.
> - Helper's response is a coaching note, not a verdict. System drafts a kind anonymized message.

## Round 3 — My second correction

> Me: "What if people don't want advice? The prompt could be: 'Do you want some advice I've noticed that could improve workflow?'"

> Agent: locked in **consent-gated coaching**. Helper writes the note privately. Originator gets a prompt: *"Your last handoff partner has feedback that could improve future bookings. Want to hear it?"* If yes → see it. If no → it stays with the helper, and the system quietly notes the originator opted out (which itself is a signal over time).

---

## What got shipped

### Schema additions (`shared/schema.ts`)

```ts
// Thread Referrals — extended with handoff accountability fields
export const threadReferrals = pgTable("thread_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => threads.id),
  referredArtistId: varchar("referred_artist_id").notNull(),
  status: text("status").default("pending"),

  // Handoff accountability (originator attests at handoff time)
  urgencyHours: integer("urgency_hours"),
  paymentSecuredStatus: text("payment_secured_status"),
    // 'secured_2plus_weeks' | 'secured_1_to_2_weeks' | 'secured_under_1_week' | 'not_yet_secured'
  contractAttachedId: varchar("contract_attached_id"),
  scopeSummary: text("scope_summary"),

  // Helper outcome report
  helperReportedOutcome: text("helper_reported_outcome"),
    // 'clean' | 'paid_as_agreed_but_scope_off' | 'paid_late_or_partial'
    // | 'scope_and_payment_both_off' | 'cancellation_no_fault'
  helperPaidAt: timestamp("helper_paid_at"),
  helperPaymentNote: text("helper_payment_note"),
  helperPrivateNote: text("helper_private_note"),    // gut note, never shared
  helperOutcomeReportedAt: timestamp("helper_outcome_reported_at"),

  // Consent-gated coaching loop
  helperWantsToShareAdvice: boolean("helper_wants_to_share_advice").default(false),
  helperAdviceDraft: text("helper_advice_draft"),
  originatorAdvicePromptedAt: timestamp("originator_advice_prompted_at"),
  originatorAdviceConsent: text("originator_advice_consent"), // 'yes' | 'no' | 'not_yet'
  originatorAdviceConsentAt: timestamp("originator_advice_consent_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Trusted Circle — compassionate exit (not a blacklist)
export const trustedCircle = pgTable("trusted_circle", {
  // ... existing fields ...
  quietlyRemoved: boolean("quietly_removed").default(false),
  removedAt: timestamp("removed_at"),
  removedReason: text("removed_reason"), // private note to yourself
});
```

### Live additive migration (`server/index.ts`)

17 new columns on `thread_referrals` + 3 on `trusted_circle`, all `ADD COLUMN IF NOT EXISTS` so the live Neon DB stays healthy across deploys. Mid-session discovered the existing schema declared `referred_artist_profile_id` but the live DB actually had `referred_artist_id` — aligned the schema to the DB rather than the other way around (no live data loss).

### API — six new endpoints (`server/routes.ts`)

```
POST   /api/handoffs                            create attested handoff (enforces required fields)
GET    /api/handoffs/:id?token=…                helper view + gaps list
POST   /api/handoffs/:id/helper-outcome         helper reports outcome
GET    /api/handoffs/:id/coaching-prompt        consent prompt (advice text hidden)
POST   /api/handoffs/:id/coaching-consent       originator yes/no/not_yet
GET    /api/handoffs/originator/:userId/mirror  aggregate pattern (no attribution)
POST   /api/trusted-circle/:memberId/quietly-remove   compassionate exit, reversible
```

Every public endpoint is token-gated by the existing thread magic link (the helper got it via email; the originator already has it):

```ts
async function authorizeHandoff(req, res) {
  if (!UUID_RE.test(req.params.id)) {
    res.status(404).json({ error: "Handoff not found" });
    return null;
  }
  const token = req.query.token || req.headers["x-thread-token"];
  if (!token) { res.status(401).json({ error: "Missing thread token" }); return null; }

  const handoff = await db.query.threadReferrals.findFirst({
    where: (r, { eq }) => eq(r.id, req.params.id),
  });
  if (!handoff) { res.status(404).json({ error: "Handoff not found" }); return null; }

  const thread = await db.query.threads.findFirst({
    where: (t, { eq }) => eq(t.id, handoff.threadId),
  });
  if (!thread || thread.threadPublicToken !== token) {
    res.status(403).json({ error: "Invalid thread token for this handoff" });
    return null;
  }
  return { handoff, thread };
}

// Strips fields the originator must never see (consent guarantee).
function publicHandoffView(h) {
  return {
    id: h.id, threadId: h.threadId, referredArtistId: h.referredArtistId,
    status: h.status, urgencyHours: h.urgencyHours,
    paymentSecuredStatus: h.paymentSecuredStatus,
    contractAttachedId: h.contractAttachedId, scopeSummary: h.scopeSummary,
    helperReportedOutcome: h.helperReportedOutcome, helperPaidAt: h.helperPaidAt,
    helperOutcomeReportedAt: h.helperOutcomeReportedAt,
    helperWantsToShareAdvice: !!h.helperWantsToShareAdvice,
    // Excluded: helperPrivateNote, helperPaymentNote, helperAdviceDraft.
    createdAt: h.createdAt,
  };
}
```

Attested creation enforces the moat at handoff time:

```ts
app.post("/api/handoffs", async (req, res) => {
  const schema = z.object({
    threadId: z.string().uuid(),
    threadToken: z.string().min(1),
    referredArtistId: z.string().uuid(),
    paymentSecuredStatus: z.enum([
      "secured_2plus_weeks", "secured_1_to_2_weeks",
      "secured_under_1_week", "not_yet_secured",
    ]),
    scopeSummary: z.string().min(10, "Document the full scope of services"),
    contractAttachedId: z.string().optional(),
  });
  const data = schema.parse(req.body);

  const thread = await db.query.threads.findFirst({
    where: (t, { eq }) => eq(t.id, data.threadId),
  });
  if (!thread || thread.threadPublicToken !== data.threadToken) {
    return res.status(403).json({ error: "Invalid thread token" });
  }

  // Urgency is computed, not asked — removes a friction point and a lie surface.
  let urgencyHours;
  if (thread.eventDate) {
    urgencyHours = Math.max(0, Math.round(
      (new Date(thread.eventDate).getTime() - Date.now()) / 36e5
    ));
  }

  const [created] = await db.insert(threadReferrals).values({
    threadId: data.threadId,
    referredArtistId: data.referredArtistId,
    paymentSecuredStatus: data.paymentSecuredStatus,
    scopeSummary: data.scopeSummary,
    contractAttachedId: data.contractAttachedId,
    urgencyHours,
  }).returning();

  res.json({ ok: true, handoff: publicHandoffView(created) });
});
```

The coaching-prompt endpoint never reveals the advice text until consent:

```ts
app.get("/api/handoffs/:id/coaching-prompt", async (req, res) => {
  const auth = await authorizeHandoff(req, res); if (!auth) return;
  const h = auth.handoff;
  const hasAdviceWaiting = !!(h.helperWantsToShareAdvice && h.helperAdviceDraft);
  res.json({
    hasAdviceWaiting,
    promptCopy: hasAdviceWaiting
      ? "Your last handoff partner has some feedback that could improve future bookings. Want to hear it?"
      : null,
    consent: h.originatorAdviceConsent,
    adviceVisible: h.originatorAdviceConsent === "yes" ? h.helperAdviceDraft : null,
  });
});
```

### Helper outcome page (`client/src/pages/HandoffOutcome.tsx`)

Editorial single-column form, parchment background, hairline borders. The five outcome buckets are framed with compassion. The "share coaching" checkbox is opt-in; if unchecked, the private note stays with the helper forever.

```tsx
const OUTCOME_OPTIONS = [
  { value: "clean", label: "Clean",
    help: "Went as described. Paid as agreed." },
  { value: "paid_as_agreed_but_scope_off", label: "Paid fine, scope was off",
    help: "Money was right, but the services or count weren't what I was told." },
  { value: "paid_late_or_partial", label: "Paid late or partial",
    help: "The work was fine, but the payment broke the agreement." },
  { value: "scope_and_payment_both_off", label: "Both off",
    help: "Scope and payment were both not as described." },
  { value: "cancellation_no_fault", label: "Cancelled, no fault",
    help: "Client cancelled. Originator had secured payment. Everyone protected." },
];

// ...

<label className="flex items-start gap-3 cursor-pointer">
  <input type="checkbox" checked={wantsToShareAdvice}
    onChange={e => setWantsToShareAdvice(e.target.checked)} />
  <span>
    <span className="text-ink font-medium">Offer coaching to the originator.</span>
    <span className="block text-sm text-faint-ink mt-1">
      They will be asked: "Want some feedback that could improve future bookings?"
      If they say no, your note stays here.
    </span>
  </span>
</label>
```

---

## Code review caught five real bugs

Ran an architect review after the first draft. It failed me. The findings were not nitpicks:

1. **Attestation not actually enforced** — only computed advisory "gaps" after creation.
2. **Aggregate mirror query was broken** — used `threads.artistId` (doesn't exist) instead of joining `users → artistProfiles → threads.artistProfileId`.
3. **Quiet removal column was added but no route writes it.**
4. **Consent-gated coaching was bypassable** — `GET /api/handoffs/:id` returned the full row including `helperPrivateNote` and `helperAdviceDraft`.
5. **Missing `sql` import in `routes.ts`** — runtime crash on coaching-consent.

Plus a serious security finding: every public handoff endpoint was keyed only by UUID with no token binding. Anyone with the id could read or overwrite outcomes.

Fixed all five in one pass:
- Added `POST /api/handoffs` that enforces attestations via Zod at creation time.
- Rewrote the mirror to do the proper `userId → artistProfiles.id → threads.artistProfileId → threadReferrals` join, and added `isAuthenticated` middleware scoping to the originator's own userId.
- Added the `POST /api/trusted-circle/:memberId/quietly-remove` route.
- Added `publicHandoffView()` whitelist so private fields never leak through the general handoff GET.
- Added `authorizeHandoff()` helper that token-gates every endpoint via the existing thread magic link.
- Fixed the missing import.

Re-verified with curl:

```
GET handoff no token              → 401  {"error":"Missing thread token"}
GET handoff bad uuid              → 404  {"error":"Handoff not found"}
GET handoff valid uuid + wrong token → 404
POST create missing scope         → 400  Zod validation error
GET mirror unauthenticated        → 401  {"message":"Unauthorized"}
```

---

## Why this matters for Briarwood

The single line that drove the whole session: *"the original operator needs visibility into whether the client was actually protected when they routed them to a peer."*

The schema captures the truth. The UI asks the awkward questions so humans don't have to. The consent gate honors that not everyone wants feedback. The compassionate exit honors that a network is people, not a leaderboard.

The Choreography Depth Index that's already in the codebase can now consume real handoff outcomes as input signal — clean handoffs raise trust, broken-payment handoffs lower it, opted-in coaching responses raise it again. The accountability loop becomes the trust loop.

Built in one session. Live on the dev branch. Did not touch the existing customer code paths.
