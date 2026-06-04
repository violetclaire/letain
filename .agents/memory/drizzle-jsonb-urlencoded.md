---
name: Drizzle jsonb insert crashes on null-prototype req.body
description: Why storing a parsed urlencoded body into a Drizzle jsonb column throws "Cannot read properties of null (reading 'constructor')", and the fix.
---

When Express parses `application/x-www-form-urlencoded` with `express.urlencoded({ extended: false })`, `req.body` is a **null-prototype object** (Node's `querystring`). Passing that object directly as the value of a Drizzle `jsonb` column makes `.values()` throw `TypeError: Cannot read properties of null (reading 'constructor')`.

**Why:** Drizzle's `is()` (entity.js) does `Object.getPrototypeOf(value).constructor` on each insert value; on a null-prototype object `getPrototypeOf` returns `null`, so reading `.constructor` crashes. Explicit `null` column values are fine (the `!value` guard catches them) — only the null-prototype *object* is the problem.

**How to apply:** Before inserting a parsed form body (or any object that might have a null prototype) into a jsonb column, shallow-clone it into a normal object: `rawPayload: { ...body }`. Webhook handlers (Twilio, etc.) that store the raw payload are the common trigger here.
