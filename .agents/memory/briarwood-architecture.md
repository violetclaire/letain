---
name: Briarwood vs DateInquiry vs The Makeup Dolls
description: Permanent product identity and naming/architecture rules for intake and new services
---

## The three names
- **Briarwood** = the PERMANENT product: trusted-execution infrastructure for operators.
  All new permanent concepts, services, helpers, and tables should be named and
  designed as Briarwood core, channel-agnostic logic.
- **DateInquiry** = TEMPORARY intake/prototype bridge. It is live now and routes
  inquiries into Briarwood, but it will be removed later. Do not over-invest in
  DateInquiry-specific architecture. Do not name new permanent concepts after it.
- **The Makeup Dolls** = the user's CURRENT live business website, the real inquiry
  source feeding in today (currently via DateInquiry).

## Rules for new builds
- Preserve DateInquiry while it is live. Never break current inquiry routing from
  The Makeup Dolls (the standing "never change dateinquiry.com behavior" constraint).
- Design new logic as reusable Briarwood core, not DateInquiry-specific. Any new
  service/helper must work for FUTURE intake sources, not just the current bridge.
- Avoid naming new permanent concepts around DateInquiry.

## Permanent intended flow (channel-agnostic)
external inquiry source (Makeup Dolls site, other operators' sites, email, SMS,
manual entry, future channels)
-> Briarwood inquiry object
-> availability / contract / calendar check
-> assistant prompt
-> operator action
-> trusted network routing if needed
-> trust event captured
-> execution-trust history grows

**Why:** user explicitly clarified DateInquiry is a throwaway bridge; permanent
infra is Briarwood. Keeps future intake sources (email/SMS/manual/other operators)
from being bolted onto a temporary DateInquiry-shaped design.
