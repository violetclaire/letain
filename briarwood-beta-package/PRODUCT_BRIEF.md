Copy/paste this to Dundy/Replit as the product brief.

⸻

Briarwood Product Build Brief

Core product

Briarwood is a headless SaaS workflow layer for trusted service operators.

The goal is not to build a big dashboard first. The goal is to make the workflow magical and simple:

Inquiry → availability check → operator decision → proposal/contract/payment → schedule → handoff/referral → outcome → trust signal

Briarwood captures how word-of-mouth service networks already operate and turns that workflow behavior into structured, agent-readable data.

Core thesis

The service economy runs on trust, referrals, judgment, and follow-through.

Today that trust lives in DMs, texts, emails, calls, memory, contracts, payments, and private networks.

Briarwood captures that workflow and makes the trust behavior machine-readable.

MVP goal

Build the simplest operator workflow that lets a service provider:

1. onboard quickly
2. receive and process inquiries
3. check availability
4. respond or route
5. generate proposal/contract/payment
6. create a schedule
7. manage trusted referral network
8. store all workflow events as structured data
9. expose future-ready API/agent-readable records

The first product should feel like an AI secretary + trusted referral router + proposal/contract/payment workflow.

⸻

1. Simple onboarding

The operator should onboard in under 5 minutes.

Required fields:

* name
* business name
* email
* phone number
* SMS opt-in
* service category
* location / service area
* timezone
* website / Instagram optional

Then:

* connect or create internal availability calendar
* mark unavailable dates
* upload pricing sheet
* upload proposal template or choose generated proposal
* upload contract template or choose generated contract
* connect payment account
* add trusted network contacts

Onboarding principle

Do not make the operator configure a huge system.

Start with the minimum needed to process an inquiry.

⸻

2. Inquiry intake

Each inquiry should create a structured record.

Fields:

* client name
* client email
* client phone
* event/service date
* location
* service type
* party size / scope
* budget if provided
* notes
* source
* status

Statuses:

* new
* needs review
* available
* unavailable
* proposal sent
* contract sent
* payment pending
* booked
* routed
* declined
* completed

When inquiry arrives, Briarwood checks the operator calendar.

If available:

* alert operator by SMS/email
* suggest response
* allow one-click proposal creation

If unavailable:

* alert operator by SMS/email
* suggest trusted referral routing
* ask: “You’re unavailable for this date. Route this to someone trusted?”

⸻

3. Calendar logic

The operator has an internal Briarwood calendar.

They can:

* mark unavailable dates
* mark tentative holds
* mark booked dates
* add event details
* see upcoming jobs
* attach contracts/proposals/payments to calendar dates

When inquiry arrives, the system checks:

* date available?
* existing hold?
* existing booking?
* service area conflict?
* possible staffing/network need?

Calendar should be the first source of truth for availability.

⸻

4. Operator decision prompt

When an inquiry comes in, send a simple SMS/email prompt:

New inquiry: [Client Name] for [Date] in [Location].
You are [available/unavailable].
What do you want to do?

Buttons:

* Send proposal
* Ask follow-up
* Route to trusted network
* Decline
* Save for later

If voice is available later:

Operator should be able to say:

“Send this to Sarah and include that it’s a Napa wedding on June 8.”

or:

“Create a proposal for Emily Ruderman on May 20 with bridal makeup and 8 services.”

⸻

5. Proposal, contract, payment

The operator needs three options:

Option A — upload existing proposal/contract

Operator uploads their own PDF/doc.

System stores it and associates it with client/job.

Option B — use Briarwood generated proposal

Operator uploads pricing sheet and business details.

System generates a polished proposal based on inquiry details.

Option C — hybrid

Operator uploads existing template.

System fills in:

* client name
* date
* services
* pricing
* travel/staffing fees
* payment schedule
* terms

Payment

Connect Stripe or payment provider.

Each job should support:

* retainer
* final payment
* invoice
* payment status
* paid/unpaid timestamps

⸻

6. Schedule maker

This is a major product feature.

For each booked job, operator can generate a schedule.

Example inputs:

* event date
* ready time
* number of services
* number of artists/providers
* location
* service duration
* buffer time
* client preferences

Outputs:

* clean getting-ready/service schedule
* shareable link
* PDF export
* client-facing version
* internal provider version

Operator should be able to send a link:

“Here is your schedule.”

This should feel magical and simple.

⸻

7. Trusted network

This is the most important part.

Each operator has a private trusted network.

Contacts can be categorized.

Possible categories:

* service providers
* assistants
* admin/secretary
* referral partners
* venue/vendor partners
* emergency backup
* staffing support
* contractors
* agencies
* private network

Each contact record:

* name
* business
* email
* phone
* category
* services offered
* location/service area
* notes
* trust status
* past handoffs
* accepted/rejected referrals
* completed outcomes

Operator can route inquiry to:

* one trusted contact
* multiple contacts
* category group
* backup list

The route should be trackable.

⸻

8. Routing workflow

When operator routes inquiry:

System creates a handoff event.

Handoff record:

* original inquiry
* referring operator
* referred provider/contact
* timestamp
* message sent
* accepted?
* declined?
* no response?
* booked?
* completed?
* payment happened?
* outcome notes

This is where trust data begins.

The key loop:

Inquiry → Handoff → Payment → Outcome → Referral

Every step should be stored as structured data.

⸻

9. Trust signal / CDI event logging

Do not overbuild CDI yet.

But every action should be logged for future CDI scoring.

Event types:

* inquiry received
* operator available/unavailable
* response sent
* proposal generated
* proposal sent
* contract sent
* payment requested
* payment received
* handoff created
* handoff accepted
* handoff declined
* job booked
* schedule created
* job completed
* referral completed
* outcome confirmed
* repeat referral created

Each event should include:

* timestamp
* actor
* object/job ID
* status
* metadata
* source

This is the foundation of machine-readable trust.

⸻

10. Headless / API-first architecture

Build the product so the UI is not the only interface.

Every core object should be API-readable:

* operator
* inquiry
* job
* client
* proposal
* contract
* payment
* schedule
* network contact
* handoff
* outcome
* trust event

Every record should have:

* unique ID
* timestamps
* status
* owner/operator
* related entities
* audit trail

Future API endpoints should support:

* create inquiry
* check availability
* route inquiry
* create proposal
* create contract
* create schedule
* update payment
* update outcome
* query trust signal
* retrieve job history
* retrieve contract PDF
* retrieve schedule link

Build with clean schemas from day one.

⸻

11. Agent-readable / SEO-ready

Every object should be structured cleanly enough for future agents.

Use clear semantic fields, not messy blobs.

For example:

A job should know:

* what service
* when
* where
* who requested it
* who owns it
* who received the handoff
* what was sent
* what was paid
* what outcome happened

Contracts and proposals should be stored as:

* PDF file
* structured metadata
* searchable text
* linked to job/client/date

Operator should be able to ask later:

“Pull up the contract for Emily on May 20.”

System should retrieve:

* client
* job
* contract
* PDF
* payment status
* schedule
* notes

⸻

12. Voice layer later

Do not make voice the first bottleneck, but architect for it.

Future voice commands:

* “Create a proposal for Emily for May 20.”
* “Route this inquiry to Sarah.”
* “Show me the contract for the Napa wedding.”
* “Make a schedule for 9 services with 2 artists.”
* “Send the schedule link to the client.”
* “Who did I refer the June 8 inquiry to?”

Potential voice stack:

* Whisper / OpenAI speech-to-text
* ElevenLabs if needed later
* Claude/OpenAI for action parsing

Voice should trigger structured actions, not just notes.

⸻

13. MVP screens

Keep UI minimal.

Screens:

1. Dashboard
    * new inquiries
    * upcoming jobs
    * availability conflicts
    * routed handoffs
2. Inquiry detail
    * client info
    * date/location
    * availability status
    * action buttons
3. Calendar
    * unavailable dates
    * holds
    * booked jobs
4. Proposal/contract/payment
    * create/send/store
5. Schedule maker
    * generate/edit/share
6. Trusted network
    * contacts
    * categories
    * route history
7. Job record
    * all documents, payments, schedule, handoffs, outcome

⸻

14. Most important user experience

The operator should feel:

“This is the secretary I wish I had.”

Not:

“This is another CRM I have to manage.”

The product should reduce work, not create more work.

Every screen should answer:

* What came in?
* Am I available?
* What should happen next?
* Who do I trust if I can’t take it?
* Did the work move?
* Was the outcome captured?

⸻

15. Build order

Phase 1

* onboarding
* manual calendar/unavailable dates
* inquiry form/intake
* availability check
* SMS/email alert
* inquiry status
* trusted network contacts
* manual route inquiry
* event logging

Phase 2

* proposal generator
* contract upload/generation
* Stripe/payment integration
* schedule maker
* PDF export
* shareable links

Phase 3

* trust event dashboard
* handoff outcome tracking
* CDI proof-of-concept
* API endpoints
* agent-readable records

Phase 4

* voice commands
* automated follow-up
* network routing recommendations
* trust signal query endpoint

⸻

One-sentence product direction

Briarwood is a headless workflow layer that helps trusted service operators manage inquiries, route work through their private networks, and capture the behavioral proof that shows who follows through.