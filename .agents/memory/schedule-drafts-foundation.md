---
name: Schedule Drafts foundation
description: Why the Google-Docs-style schedule table builder is its own isolated table, not built on the legacy eventDaySchedules system.
---

The "schedule table builder" (operator-only editable table) lives in its OWN table
`schedule_drafts` with JSONB `columns`/`rows`/`serviceDefaults`/`providers`. It is
deliberately separate from the legacy `eventDaySchedules` + `scheduleAppointments`
+ `scheduleTeamMembers` system and its `/schedules/:tokens` public-share / send /
chat flows.

**Why:** Reusing the legacy schedule tables/routes risks breaking the live public
schedule links, share tokens, and sending that real users depend on. The standing
constraint is additive-only / never break live behavior, so a new isolated surface
was the safe choice. Naming collision also rules out reusing `schedules`.

**How to apply:** Any future schedule-builder work (rows, columns, durations,
provider assignment, paste-parsing) belongs on `schedule_drafts` + the
`/api/schedule-drafts*` routes. Do NOT wire it into eventDaySchedules. There is NO
sending, NO public link, and status is limited to `draft` by the PATCH whitelist —
keep that surface non-sending unless explicitly asked.

**Owner-scoping lesson:** by-link lookups (`getScheduleDraftByContract/ByInquiry`)
must be owner-scoped AT QUERY TIME (filter by artistId), not fetched globally then
checked, or you create an existence oracle + cross-tenant poisoning. Also validate
inquiryId/bookingId ownership on create (inquiries owner = `vendorId`, bookings
owner = `artistId`).
