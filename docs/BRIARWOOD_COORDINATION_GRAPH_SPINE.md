# Briarwood Coordination Graph Spine

This document defines the durable product spine for Briarwood. It is
documentation only. It does not add schema, routes, UI, migrations, sends,
uploads, payment behavior, contract behavior, auth behavior, CDI behavior, or
verification behavior.

## Product Definition

Briarwood is private coordination infrastructure for real-world work.

It is not:

- A booking app.
- A public marketplace.
- A flat contact list.
- A public reputation system.
- A provider ranking system.
- A payment or contract product first.

Briarwood helps an operator understand who they know, what those people or
businesses can do, whether they are reachable enough for a specific inquiry,
and whether the current coordination path is safe to continue.

## Core Graph

The product spine is a private coordination graph:

```text
operator
-> inquiry
-> availability
-> skill/capability
-> private network target
-> contact readiness
-> routing path
-> verification decision
-> prompt
-> schedule
-> contract
```

This graph is operator-private and path-based. It should support coordination
judgment without turning route targets into public rankings or person scores.

## First Product Domain

The first product domain is wedding and beauty coordination:

- Makeup.
- Hair.
- Bridal beauty.
- Aesthetics.
- Wardrobe and styling.
- Photography.
- Events.
- Venues.
- Adjacent personal-service coordination.

This domain matters because it has real-world timing, handoff, reputation,
availability, and fallback pressure. Briarwood should support this domain first
without hard-coding the product into beauty-only language forever. The same
coordination graph can later generalize to other operators who coordinate
physical-world work.

## Network Graph And Contact Readiness

Network Graph + Contact Readiness is the next product slice after the cleanup
and architecture spine work.

The goal is not to build a public directory. The goal is to make the operator's
private network legible enough that Briarwood can help answer:

- Who do I know?
- What can they do?
- How are they connected to this inquiry?
- Can I reach them?
- What contact information is missing?
- Can this inquiry safely route to them?
- What should I ask the operator next?

## Incomplete Contacts Are Valid

Briarwood must support incomplete contacts.

A network target may start with only:

- A role or capability.
- A note from the operator.
- An Instagram handle.
- A phone number.
- An email address.
- A business name.
- A preferred channel.
- A relationship label.

An incomplete contact is not bad data. It is coordination state.

## Contact Readiness

Contact readiness describes whether Briarwood has enough private, operator-owned
information to support a specific route or handoff.

Examples:

- Instagram-only can be valid, but it is not fully reachable.
- Phone and email improve reachability but do not guarantee suitability.
- Preferred channel matters because a route target may be reachable by text but
  not email, or reachable by Instagram but not safe for time-sensitive handoff.
- Missing contact data should prompt the operator only when it becomes relevant
  to an inquiry or route.

Contact readiness should not become a public score, marketplace ranking, or
provider quality judgment. It should answer whether this route target is
reachable and sufficiently specified for the current coordination path.

## V1 Guardrails

The first Network Graph + Contact Readiness implementation should be private,
operator-scoped, and non-sending.

V1 should not include:

- Scraping.
- Instagram automation.
- Automatic outreach.
- Email or SMS sends.
- Public/client visibility.
- Public rankings.
- Provider scores.
- Person scores.
- Paid placement.
- Marketplace matching.

V1 may include:

- Contact completeness indicators.
- Preferred channel fields or summaries, if supported by existing data or a
  reviewed schema plan.
- Missing-contact prompts for the operator.
- Role and capability labels.
- Route-readiness language tied to a specific inquiry.
- Links from inquiry routing to the relevant private network target.

## Relationship To Verification And CDI

The coordination graph feeds the existing Verification Layer. See
`docs/VERIFICATION_LAYER_AUDIT.md`.

The Verification Layer answers:

```text
Given the current evidence, what is safe to do next?
```

CDI is the private behavioral reliability and coordination-depth measurement
thesis. See `docs/CDI_PRODUCT_AND_RESEARCH_SCOPES.md`.

CDI answers:

```text
How much behavioral reliability or coordination depth does this path or context
show?
```

Contact readiness is narrower than both. It asks:

```text
Can this route target be reached and used safely enough for this coordination
path right now?
```

These concepts should support each other without collapsing into a public score.

## Product Implications

Future Briarwood work should make the graph clearer before adding broad new
features.

Preferred next work:

- Make private network targets role/capability-first.
- Show contact readiness and missing contact data in the operator workflow.
- Connect route-readiness prompts to the current inquiry.
- Keep schedule drafts tied to the active coordination path.
- Keep permission decisions path-based and operator-private.

Avoid:

- Booking-app language as the primary frame.
- Marketplace discovery as the primary frame.
- Public reputation, rank, or score language.
- Broad refactors across contract, payment, auth, sender, upload, or public-token
  surfaces.
- New schema before the graph fields and ownership model are explicitly reviewed.

## Review-Only Surfaces

The following surfaces must remain review-only until a focused plan and tests
exist:

- Database schema and migrations.
- Auth, session, OIDC, and provider defaults.
- Contracts and signing.
- Payments, Square, invoices, and checkout.
- Email and SMS sends.
- Object storage and uploads.
- Public/client share links.
- CDI and verification runtime behavior.
- Public inquiry intake behavior.

This document should be used as a product filter: does the next change make the
private coordination graph clearer and safer, or is it only adding booking-app
clutter?
