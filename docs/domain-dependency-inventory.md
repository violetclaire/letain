# Domain Dependency Inventory

This is the source of truth for remaining Briarwood, DateInquiry, and related legacy domain references. It records current behavior only. Do not use this document to justify changing a sender domain, Square callback, payment redirect, public token link, or contract link without a separate scoped PR and tests.

## Classification Key

- `sender/from-domain sensitive`: affects outbound email sender identity, domain authentication, deliverability, or replies.
- `Square OAuth/callback sensitive`: affects Square OAuth redirect URIs, Square application configuration, or OAuth success/error routing.
- `payment-link sensitive`: affects payment success redirects or payment-link behavior.
- `contract/token-link sensitive`: affects public client thread, quote, contract, schedule, share, or signing/token links.
- `public metadata / SEO / branding`: affects static metadata, app domain display, preview cards, or app wrapper config.
- `client-visible branding`: text, links, redirects, or examples visible to operators or clients.
- `docs/reference only`: documentation, comments, tests, or historical notes with no direct runtime behavior.
- `legacy bridge context`: existing compatibility path while DateInquiry-era routes, slugs, or helpers remain.

## Sensitive Runtime Dependencies

| Area | File | Reference | Classification | Runtime or docs/test | Replacement path | SWE review |
| --- | --- | --- | --- | --- | --- | --- |
| Email sender domain | `server/emailService.ts` | `dateinquiry.com`, `notifications@dateinquiry.com`, `WHITELABEL_EMAIL_DOMAIN`, `WHITELABEL_FROM_EMAIL` | sender/from-domain sensitive | runtime | Move only after Briarwood sender domain, DNS, Resend domain verification, reply handling, and deliverability checks are ready. | yes |
| Email and public links | `server/emailService.ts` | `getLegacyDateInquiryPublicBaseUrl()` and `PUBLIC_BASE_URL || 'https://dateinquiry.com'` | sender/from-domain sensitive; contract/token-link sensitive; legacy bridge context | runtime | Migrate one template/link class at a time under public URL and email characterization tests. | yes |
| AI email sender | `server/aiChat.ts` | `WHITELABEL_FROM_EMAIL = "notifications@dateinquiry.com"` and fallback email senders | sender/from-domain sensitive | runtime | Share the same Briarwood sender-domain rollout as `server/emailService.ts`. | yes |
| AI payment redirect | `server/aiChat.ts` | `PUBLIC_BASE_URL || REPLIT_DEPLOYMENT_URL || 'https://dateinquiry.com'` in Square payment-link creation | payment-link sensitive | runtime | Replace only after Square/domain payment redirect tests are updated and reviewed. | yes |
| AI-generated public links | `server/aiChat.ts` | `PUBLIC_BASE_URL || 'https://dateinquiry.com'` chat and appointment confirmation links | contract/token-link sensitive; legacy bridge context | runtime | Move to the public URL helper in a scoped PR that preserves generated output. | yes |
| Square OAuth | `server/squareRoutes.ts` | `https://dateinquiry.com/api/square/connect/callback`, `callbackBaseUrl`, `errorRedirect`, `productionDomain` | Square OAuth/callback sensitive | runtime | Coordinate Square app redirect URI changes with production deploy and callback tests. | yes |
| Public links and sends | `server/routes.ts` | `https://dateinquiry.com`, `notifications@dateinquiry.com`, client thread/admin thread links, slug messages, custom-domain fallbacks | sender/from-domain sensitive; contract/token-link sensitive; client-visible branding; legacy bridge context | runtime | Split by link class: public inquiry/thread links, email senders, schedule/quote links, then slug copy. | yes |
| Agent/ACP public links | `server/agentRoutes.ts`, `server/acpHandler.ts` | `getLegacyDateInquiryPublicBaseUrl()` and `PUBLIC_BASE_URL || "https://dateinquiry.com"` | contract/token-link sensitive; legacy bridge context | runtime | Migrate after generated agent/ACP links are covered by tests. | yes |
| Auth/domain redirect behavior | `server/replitAuth.ts` | `req.hostname.includes('dateinquiry')` | legacy bridge context; client-visible branding | runtime | Wait until the auth provider migration plan is active; do not mix with domain cleanup. | yes |
| Client setup and embeds | `client/src/pages/ArtistSettings.tsx`, `client/src/pages/Login.tsx`, `client/src/pages/intake/ArtistIntake.tsx`, `client/src/pages/SecretaryOnboarding.tsx` | hard-coded `https://dateinquiry.com` links, iframe embed URLs, setup redirects | client-visible branding; contract/token-link sensitive; legacy bridge context | runtime | Replace with Briarwood-domain UX after public links and embed/API behavior are reviewed. | yes |
| Client DateInquiry routing | `client/src/App.tsx`, `client/src/hooks/useDashboard.ts`, `client/src/components/AIChatPanel.tsx`, `client/src/pages/ArtistDashboard.tsx` | DateInquiry hostname checks, comments, or route assumptions | client-visible branding; legacy bridge context | runtime | Remove after DateInquiry bridge routes are no longer needed. | yes |

## Briarwood Canonical Domain References

These references use the current Briarwood domain and are not legacy DateInquiry dependencies. They remain inventoried because changing them can still affect production hosting, TestFlight, public links, or client-visible copy.

| Area | File | Reference | Classification | Runtime or docs/test | Replacement path | SWE review |
| --- | --- | --- | --- | --- | --- | --- |
| Public URL helper | `server/config/publicUrl.ts` | `https://atbriarwood.com` | public metadata / SEO / branding | runtime | Keep as canonical fallback unless hosting strategy changes. | no |
| Capacitor wrapper | `capacitor.config.ts` | `server.url: 'https://atbriarwood.com'` | public metadata / SEO / branding | runtime config | Confirm the URL serves the React app before TestFlight. | Mac/Xcode review |
| CORS/host config | `server/index.ts` | `atbriarwood.com`, `www.atbriarwood.com` | public metadata / SEO / branding | runtime | Change only with deployment/CORS review. | yes |
| Generated public links and metadata | `server/routes.ts`, `server/agentRoutes.ts` | `PUBLIC_BASE_URL || 'https://atbriarwood.com'`, `getBriarwoodPublicBaseUrl()`, and public atbriarwood links | contract/token-link sensitive; client-visible branding; public metadata / SEO / branding | runtime | Continue migrating inline fallbacks to `server/config/publicUrl.ts` in scoped PRs. | yes |
| Operator/admin UI | `client/src/pages/ArtistAdmin.tsx`, `client/src/pages/ArtistDashboard.tsx`, `client/src/pages/ArtistLogin.tsx`, `client/src/pages/ArtistSettings.tsx`, `client/src/pages/ProfileSettings.tsx`, `client/src/pages/PublicOnboarding.tsx`, `client/src/pages/SetupComplete.tsx`, `client/src/pages/SecretaryOnboarding.tsx` | atbriarwood profile, login, setup, invite, and direct-link copy | client-visible branding | runtime | Polish with UI copy PRs after public URL behavior is stable. | no |
| Demo/marketing UI | `client/src/pages/ContextGraph.tsx`, `client/src/pages/DemoLandingPreview.tsx`, `client/src/pages/Landing.tsx`, `client/src/pages/Memo.tsx`, `client/src/pages/Pitch.tsx`, `client/src/pages/Sandbox.tsx`, `client/src/lib/demoData.ts` | atbriarwood examples, demo API URLs, admin email | public metadata / SEO / branding; client-visible branding | runtime/demo | Review during app-store/mobile polish, not provider migration. | no |

## Legacy Naming And Bridge References

These are not necessarily domain dependencies, but they are tracked so DateInquiry migration work does not confuse comments, type names, or legacy bridge code with sensitive live URLs.

| File or group | Reference | Classification | Runtime or docs/test | Replacement path | SWE review |
| --- | --- | --- | --- | --- | --- |
| `shared/schema.ts` | DateInquiry comments and bridge notes | docs/reference only; legacy bridge context | runtime source comments | Rename only after schema/API naming review. | yes |
| `server/assistantService.ts`, `server/routingService.ts`, `server/storage.ts`, `server/cronJobs.ts` | DateInquiry comments, bridge labels, or fallback context | docs/reference only; legacy bridge context | runtime source/comments | Clean comments after behavior has migrated. | no |
| `server/config/publicUrl.ts` | `LEGACY_DATEINQUIRY_PUBLIC_BASE_URL` and `getLegacyDateInquiryPublicBaseUrl()` | legacy bridge context; contract/token-link sensitive | runtime | Remove only after all legacy-link callers are gone. | yes |
| `server/cdiService.ts`, `server/routingService.ts`, `server/timelineParser.ts` | The Makeup Dolls / Makeup Dolls references | legacy bridge context; client-visible branding where shown | runtime/source comments/parser | Keep parser keyword support unless product explicitly drops it. | yes for runtime parser changes |
| `client/src/pages/Proposals.tsx`, `client/src/pages/Sandbox.tsx` | Violet / The Makeup Dolls demo references | client-visible branding; legacy bridge context | runtime/demo | Move to Briarwood demo content in a UI polish PR. | no |

## Test And Documentation References

Tests intentionally include these strings to lock current behavior. Documentation intentionally includes them to describe migration status. They are not new runtime dependencies.

- `server/public-url.characterization.test.ts`
- `server/square-domain.characterization.test.ts`
- `server/domain-dependency-inventory.characterization.test.ts`
- `docs/domain-dependency-inventory.md`
- provider, architecture, handoff, and platform-readiness docs that explain Briarwood, DateInquiry, Replit, Square, storage, calendar, or TestFlight migration status

## Runtime Source Files With Tracked Domain Or Legacy References

Every file below contains at least one tracked runtime-source reference to `dateinquiry.com`, `atbriarwood.com`, `DateInquiry`, `The Makeup Dolls`, or `Makeup Dolls`. Additions must update this document and the source assertions in `server/domain-dependency-inventory.characterization.test.ts`.

- `capacitor.config.ts`
- `client/src/App.tsx`
- `client/src/components/AIChatPanel.tsx`
- `client/src/hooks/useDashboard.ts`
- `client/src/lib/demoData.ts`
- `client/src/pages/ArtistAdmin.tsx`
- `client/src/pages/ArtistDashboard.tsx`
- `client/src/pages/ArtistLogin.tsx`
- `client/src/pages/ArtistSettings.tsx`
- `client/src/pages/ContextGraph.tsx`
- `client/src/pages/DemoLandingPreview.tsx`
- `client/src/pages/Landing.tsx`
- `client/src/pages/Login.tsx`
- `client/src/pages/Memo.tsx`
- `client/src/pages/Pitch.tsx`
- `client/src/pages/ProfileSettings.tsx`
- `client/src/pages/Proposals.tsx`
- `client/src/pages/PublicOnboarding.tsx`
- `client/src/pages/Sandbox.tsx`
- `client/src/pages/SecretaryOnboarding.tsx`
- `client/src/pages/SetupComplete.tsx`
- `client/src/pages/intake/ArtistIntake.tsx`
- `server/acpHandler.ts`
- `server/agentRoutes.ts`
- `server/aiChat.ts`
- `server/assistantService.ts`
- `server/cdiService.ts`
- `server/config/publicUrl.ts`
- `server/cronJobs.ts`
- `server/emailService.ts`
- `server/index.ts`
- `server/replitAuth.ts`
- `server/routes.ts`
- `server/routingService.ts`
- `server/squareRoutes.ts`
- `server/storage.ts`
- `server/timelineParser.ts`
- `shared/schema.ts`

## Safe Migration Order

1. Keep this inventory current with every domain PR.
2. Migrate low-risk `PUBLIC_BASE_URL || 'https://atbriarwood.com'` fallbacks to `server/config/publicUrl.ts`.
3. Migrate non-sensitive DateInquiry public links only when output is preserved.
4. Migrate client-visible DateInquiry copy and embeds after public URL behavior is reviewed.
5. Migrate sender/from domains only after DNS, Resend verification, reply handling, and deliverability checks.
6. Migrate Square OAuth/callback and payment redirects only after Square app configuration and callback tests are updated.
7. Remove `LEGACY_DATEINQUIRY_PUBLIC_BASE_URL` only after no runtime callers remain.

## Do Not Touch Yet

- `server/squareRoutes.ts` callback URLs and Square success/error redirects.
- `server/aiChat.ts` Square payment redirect fallback.
- `notifications@dateinquiry.com` sender/from-domain behavior.
- Contract, signing, thread, schedule share, and public-token links without focused tests.
- `server/replitAuth.ts` DateInquiry-aware redirect behavior while auth migration remains in progress.
