# Briarwood Operating Logic Spec

Author: Violet Herod

Purpose: This is the source of truth for how Briarwood actually behaves. It
captures the operator logic so the build follows it instead of inventing a
generic version. Every build slice should be checked against this document.

Status: Working spec, v2

## 0. The Spine: Headless By Design

Nobody logs into Briarwood. The operator authorizes once through OAuth. After
that, the intelligence rides inside the channels people already use: email and
SMS. The client and the planner never sign in anywhere and never learn a new
tool. To them, it feels like they are simply texting and emailing the operator.
Briarwood is invisible to the outside party and acts as a prompt engine for the
operator.

This is the load-bearing principle. Every flow below assumes no external login
for clients or planners, and operator approval before anything leaves the
system.

## 1. The Calendar Is The Source Of Truth

The calendar is not a booking widget. It is the state that every other part of
the system reads from and writes back to.

- During onboarding, the operator marks dates they are booked or unavailable.
  The interface makes clear these are always editable: "Select the dates you're
  already booked for or want to mark unavailable for now. You can change these
  anytime."
- The calendar updates automatically as work progresses: contract sent marks
  the date, contract signed updates the state. States include at least:
  available, unavailable (manually blocked), contract sent, and contract
  signed/booked.
- Because of this, the system can answer "Am I available for this date?"
  instantly, instead of the operator digging through Google Docs to check.
- The auto-updating, searchable record is also the bookkeeping artifact
  high-value clients need. A client signing a large contract needs a clean,
  findable record that it happened. The operator should be able to find any
  commitment by searching or by asking the assistant, rather than hunting
  through documents.

Everyone's parameters are different, so calendar state and the actions that
change it should be configurable per operator.

## 2. Inquiry Decision Branch: Can I Respond Yet?

An inquiry arrives, typically through the operator's website contact form,
which routes to email. The first thing Briarwood does is read the inquiry
against the calendar. The central question is: can I respond yet, and how?

The system computes the answer from connected readiness:

- Is the date known?
- Is the service need known?
- Am I available?
- Is there a conflict?
- Is pricing/info ready?
- If I am unavailable, is there a route target who is contact-ready?

### 2a. If Available

Prompt the operator, never the client directly unless auto-send is on:

```text
You're open for this date. Send your info sheet?
```

The operator always approves before anything goes out, because every operator's
materials are different:

```text
This is your pricing sheet -- click to view. Send?
```

Auto-send on availability is an existing setting, off by default. If an
operator turns it on, anyone who inquires on an available date automatically
receives pricing/info. Most operators with internal calendars do not want this
on, because availability is private to their calendar logic.

### 2b. If Not Available

Prompt the operator with the referral branch:

```text
You're not available for this date. How do you want to proceed?
```

Options:

- Send to your referral network or other trusted businesses.
- Add a new referral inline, for example adding a new spray-tan provider
  because clients keep asking. The network is editable in the moment, so no
  referral dies because a contact was missing.

## 3. The Info Sheet

The info sheet is the operator's own pricing and policies. Keep onboarding
short.

- When the operator is ready to send an info sheet: "Upload your existing PDF,
  or use our template?"
- The template is a minor, later feature. For v1, support uploading an existing
  PDF: pricing sheet, policies, name, and whatever the operator wants clients
  to see. This works for any operator's services or products, not just beauty.
- Nothing goes out without operator approval, unless auto-send is explicitly
  enabled.

## 4. The Schedule Engine

This is where the product feels like magic, and it is the slice that needs the
most of the operator's actual logic.

When a planner or client sends event details by email or text, the system reads
from the contract first:

- How many services?
- How many artists/providers are working the event?
- What is each artist doing?
- What is the timing?

Then it builds the schedule. The difficulty, stated honestly: there is a real
pattern, but it bends for every event.

- Some senders upload names, some do not. The system must handle partial info;
  placeholder names are allowed.
- Bride and bridesmaid timings vary every time.

The rule: there is a standard set of default timings that the operator can edit
to their usual numbers. These include bride block, makeup duration, hair
duration, buffers, ready time, end time, ceremony time, photographer arrival,
number of people, services per person, and provider lanes. The system drafts
what it can and asks for the next missing piece rather than failing on a blank
page. It would rather ask than assume.

Example prompts:

```text
Need ready time before finalizing the schedule.
Need number of hair services.
Bride block assumed 2 hours -- confirm?
3 artists available -- draft provider lanes?
```

Every assumption the system makes must be surfaced as a confirmable prompt,
never a silent guess. A written, editable rule can be checked and defended; a
guessed schedule cannot.

## 5. Contracts Come Last

Contracts are sequenced last because they touch legal commitment and payment.

- Contracts go out through a trusted, secure e-signature path, such as DocuSign
  or whatever is most trusted. The operator can use what they already use.
- A contract should only be drafted when the graph has enough context: inquiry,
  client, date, services, pricing, schedule or service summary, and
  payment/deposit terms.
- When a contract changes state, such as sent or signed, it writes back to the
  calendar.
- Keep contract generation frozen in the build until the upstream coordination
  logic, inquiry, referral, info sheet, and schedule, is solid.

## 6. Channel Behavior

- Outside parties, including clients, planners, and brides, do not log in
  anywhere. They receive and reply in email and SMS as normal.
- The operator gets prompts from Briarwood; the outside party just experiences
  a normal text or email thread.
- Onboarding for the outside party is minimal: name, phone number, and the
  relevant details. Do not make it long.
- Everything connects because the operator authorized it once via OAuth.

## 6a. Referral And Onboarding: Distribution Is The Routing

There is no marketing push. Briarwood spreads because real, paying jobs arrive
through trusted peers. A referral that pays, arriving in the channel you already
use, is the onboarding. The lead is the message; the tool is just how the lead
got to you.

If the referred person is already on the platform, routing is one tap. The job
arrives and they pick who to route it to, or accept it. No explanation is
needed.

If the referred person is not on the platform, the operator sends a plain,
honest note by text or email with a link:

```text
Hey, I'm not available for this date and didn't want to drop this client. Are
you available? Here's the info.
```

The link opens a page that shows the actual job first, then a short, non-salesy
explanation of what Briarwood is. The job is the hook; the explanation is
secondary. They do not have to onboard to take the job. They onboard because it
is how more jobs arrive, not because they were sold.

The honest explanation:

```text
Set up your own trusted network, update your calendar, send contracts and
invoices, and communicate under your own business. We stay behind the scenes.
It's how the network actually runs.
```

The acquisition logic, stated once and never pushed: you are getting a paying
job you would never have gotten, and it costs nothing unless you run a
transaction. The free lead does the convincing.

The client/peer visibility split:

- The client experience stays invisible and branded entirely as the operator.
  The client never knows Briarwood exists; they just text and email the
  operator.
- The referred peer, a potential operator themselves, gets the light, honest
  mention of Briarwood, because they need to understand how the job reached
  them.

## 6b. Adding A Person To The Network

Most operators already know who they want to add. The default path is free and
needs no AI:

- The operator enters whatever they have: name, phone, email, Instagram or
  TikTok handle, or website.
- The system stores a partial person, also called a partial node.
- Instagram-only, phone-only, and name-only are all valid states.
- The system tracks what is missing and what is needed before an action:
  "Known, but not safely reachable yet." "Add phone before SMS." "Preferred
  channel unknown."

The expensive path is the exception only:

- When the operator wants the system to find or verify a business from a
  fragment, such as a name with no contact or confirming a handle is the right
  person, that requires a search and a model, and it spends tokens.
- Design rule: never run a search by default. "Find this business" or "Verify
  this contact" is an explicit, optional, operator-triggered action, so token
  cost only happens on demand and only when it is worth it. Most adds are
  manual and free; the paid lookup is rare.
- Verifying that a referral is who they claim and is reachable is itself a
  small instance of the Briarwood trust primitive applied to the operator's own
  network. It does not need to be big on day one.

## 6c. Customization

Every operator runs under their own brand. Operators configure and brand their
own outgoing materials. Customizable surfaces include:

- What gets sent.
- Colors and branding.
- Info-sheet contents.
- Inquiry-handling rules.
- Default timings.
- Auto-send settings.

Briarwood stays behind the scenes; the operator's business is what the outside
world sees.

## 6d. Horizontal Spine Vs. Vertical Magic

There are two layers, and the distinction matters for both build and pitch:

- The horizontal spine: inquiry in, read against calendar, route fast, respond,
  send contract. This serves any high-trust operator in any industry. The
  high-value case, the large job that dies in an inbox or turns into a chaotic
  "who's available Saturday" post, is won by whoever can respond and lock
  instantly. This spine is general.
- The vertical magic: the schedule engine. This is the deep, domain-specific
  logic that makes it feel like mind-reading in the launch vertical. This is
  the wedge.

Build the horizontal spine to be general; pour the operator's deepest nuance
into the vertical schedule slice.

## 6e. Pricing

Coordination is free. No subscription. No floor. The operator pays only when a
real transaction runs, via a small percentage taken on top of the transaction
they were already going to process.

Mechanics:

- Stripe charges its normal processing fee, unchanged. Briarwood does not raise
  or alter it.
- Briarwood takes a percentage of the operator's transaction, because it
  removed the invisible labor between inquiry and paid and got them to the
  payment point faster.
- No new cost is invented. A sliver is taken from money that was already going
  to move.

The clean answer to "how do you make money": the entire chain from inquiry to
paid is currently un-monetized friction. Briarwood monetizes it by making it
faster, then taking a small percentage of the transaction at the end. It is not
a charge for coordination; it is a sliver of the payment the coordination made
happen sooner.

Briarwood is not the service. The operator is. So Briarwood does not charge for
access. It sits underneath the service and takes a cut only when the service
sells. The fee being on the transaction, not the relationship, is what keeps the
trust signal clean.

The differentiator: everyone before tried to monetize the relationship itself,
charging for leads, the network, or the word-of-mouth trust. Briarwood refuses
that on purpose. It preserves the word-of-mouth relationship for free and
monetizes only the transaction it produces. That is the reason it is
trustworthy where others corrupt the signal.

Cost discipline: coordination is free to the user but not free to run. The
expensive pieces are AI calls, find-or-verify searches, and any model use in
scheduling or prompting. These fire only on explicit, on-demand operator action,
never automatically, so Briarwood's cost scales with value, not idle clicks.

## 7. What Magic Means Here

The "holy shit, this reads minds" feeling does not come from more features. It
comes from:

- The system asking the next right question before the operator realizes it is
  missing.
- Drafting what it can instead of showing a blank form.
- The calendar and contracts staying in sync automatically, so nothing has to
  be remembered or hunted down.

The mind-reading lives in the missing-info prompt logic. That is where the most
operator nuance must be poured in.

## 8. Build Order

Build one slice at a time, never more than one:

1. Network Graph + Contact Readiness.
2. Inquiry "Can I respond yet?" decision engine.
3. Schedule missing-info prompt engine.
4. Schedule generation hardening, deterministic rules first and AI assists
   later.
5. Contract readiness/generation, last.

For each slice: confirm it behaves like the operator's brain before moving to
the next. External, checkable verification only; never "the agent says it's
done."
