# HOUSEOFPASHM Agent Source of Truth

**Current phase:** Phase 1 — commerce source complete; owner-controlled launch gate pending
**Current milestone:** Milestone 6 — production infrastructure and owner acceptance

Last updated: 15 August 2026

## Project brief

1. HOUSEOFPASHM is an India-focused D2C fashion and Kashmiri-craft storefront.
2. The repository currently contains an approved interactive front-end demonstration.
3. The target is an initial soft launch serving 1–10 orders per day.
4. The owner and one additional operator will run catalogue, fulfilment and support.
5. The owner can contribute approximately five hours per day.
6. The initial fixed setup budget is ₹2,000, so free tiers are preferred.
7. The first launch uses guest checkout and Razorpay; customer accounts are deferred.
8. The first catalogue is a verified 12–20-product subset, not an automatic Instagram import.
9. Shipping begins manually after a PAN-India courier and workflow are confirmed.
10. `PLAN.md` defines the phased path, gates, costs, risks and definition of done.

## Non-negotiable planning constraints

- India only for initial production.
- Conditional stretch target: 14 September 2026; move the date rather than skip security, payment verification or testing.
- Custom React/Vinext implementation; do not migrate to Shopify/WooCommerce without a recorded owner decision.
- Guest checkout at launch. Customer accounts are a post-launch milestone.
- Catalogue spreadsheet/CSV is the source of truth. Instagram automation is deferred and may only create drafts for human approval.
- Razorpay is the selected gateway, subject to KYC and account approval.
- Courier choice and tax/GST treatment are blocked decisions and must be resolved before live sales.

## Stack and pinned versions

Versions come from `package.json` and `package-lock.json`; update this section in the same commit as any dependency change.

| Layer | Technology | Version |
|---|---|---:|
| Runtime | Node.js | `>=22.13.0` |
| UI | React / React DOM | `19.2.6` |
| Framework compatibility | Next.js | `16.2.6` |
| Application/build bridge | Vinext | `0.0.50` |
| Build tool | Vite | `8.0.13` |
| Language | TypeScript | `5.9.3` |
| CSS | Tailwind CSS | `4.2.1` |
| Persistence ORM | Drizzle ORM | `0.45.2` |
| Migration tooling | Drizzle Kit | `0.31.10` |
| Cloudflare adapter | `@cloudflare/vite-plugin` | `1.37.1` |
| Cloudflare CLI/runtime | Wrangler | `4.92.0` |
| Cloudflare Worker types | `@cloudflare/workers-types` | `4.20260702.1` |
| Lint | ESLint | `9.39.4` |
| Admin JWT verification | jose | `6.2.8` |
| Browser testing | Playwright | `1.62.1` |
| Accessibility testing | axe-core Playwright | `4.13.0` |

Planned production services: Cloudflare Workers, D1, R2 and Access; Razorpay; Resend; a manual courier workflow. These are architecture decisions, not proof that accounts or production bindings are already configured.

## Repository map

```text
app/                         Storefront routes, protected admin/import API, React UI, metadata and global styles.
build/                       Existing hosting/build integration; preserve unless hosting changes are approved.
catalog/                     Controlled product, image and source CSVs for Milestone 0 intake.
db/                          D1 access and the application Drizzle schema.
drizzle/                     Committed database migrations and migration journal.
lib/catalog/                 Demo fallback, CSV parsing/validation/import and database catalogue queries.
examples/                    Starter examples; not production routes.
public/                      Static assets such as the favicon.
scripts/                     Verified Linux-oriented install/build/environment/artifact scripts.
tests/                       Automated rendered-output and future unit/integration/browser tests.
worker/                      Cloudflare Worker entry point.
.openai/hosting.json         Existing hosting project binding; protected configuration.
AGENTS.md                    Shared source of truth for Codex and Claude Code.
CLAUDE.md                    One-line pointer to AGENTS.md; never duplicate instructions here.
PLAN.md                      Human execution plan, costs, gates, risks and definition of done.
PRODUCTION_PLANNING_PROMPT.md Historical/corrected planning prompt; PLAN.md now supersedes its discovery stage.
HOUSEOFPASHM_DEMO_HANDOVER.md Authoritative description of the approved demo baseline.
package.json                 Scripts and direct dependency versions.
package-lock.json            Exact transitive dependency graph; never replace casually.
vite.config.ts               Vinext/Vite/Cloudflare build and local bindings.
```

## Conventions

- Use TypeScript for application code. Avoid `any`; validate all external input at the server boundary.
- Use `camelCase` for variables/functions, `PascalCase` for React components/types, and kebab-case URL slugs.
- Keep routes/components focused. Extract domain logic for money, inventory, orders and payments into testable server modules.
- Store money as integer paise, never floating-point rupees. The server recalculates every total.
- Represent stock per variant. All stock changes require an inventory movement/audit record.
- Treat Razorpay callbacks as user experience only; verified server webhooks determine payment state.
- Webhook and order transitions must be idempotent and transactionally safe.
- Return safe public errors to users; log structured internal context without secrets or full sensitive payloads.
- Use database migrations for every schema change. Never edit production data/schema manually as a deployment step.
- Preserve the existing visual direction and responsive behavior unless the requested milestone requires a change.
- Commit messages use Conventional Commits, for example `feat: add product variant model` or `fix: reject replayed payment webhook`.
- Branch strategy: `main` must stay deployable; use short-lived `feat/<scope>` or `fix/<scope>` branches and merge only after required checks.
- Every behavior change needs the smallest relevant automated test plus manual acceptance evidence for UI/payment changes.
- Never commit generated output (`node_modules`, `dist`, `.vinext`, `.wrangler`, `.sites-runtime`) or secrets.

## Commands

Run from the repository root.

| Purpose | Command | Current status |
|---|---|---|
| Install exact dependencies | `npm ci` | Supported; on restricted Windows PowerShell use `npm.cmd ci` |
| Development server | `npm run dev` | Package script uses POSIX environment assignment; use a Bash-compatible shell |
| Windows development fallback | `$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; npx.cmd vite` | Supported diagnostic fallback |
| Production build | `npm run build` | Verified Linux/Bash path; requires GNU `timeout` |
| Windows build fallback | `npx.cmd vinext build` | Builds successfully but does not replace artifact-script validation |
| Full test | `npm test` | Runs build plus rendered HTML and catalogue tests; Linux/Bash requirement inherited |
| Catalogue tests | `npm run test:catalog` | Supported on Windows and Linux |
| Commerce tests | `npm run test:commerce` | Supported on Windows and Linux |
| Browser/accessibility tests | `npm run test:e2e` | Requires an installed Playwright Chromium browser |
| Rendered test after build | `node --test tests/rendered-html.test.mjs` | Supported after build |
| Lint | `npm run lint` | Linux/Bash wrapper |
| Windows lint fallback | `npx.cmd eslint . --ignore-pattern dist --ignore-pattern .next` | Currently passes with image warnings |
| Typecheck | `npx.cmd tsc --noEmit` | Supported and passing |
| Validate built artifact | `npm run validate:artifact` | Linux/Bash wrapper |
| Generate migrations | `npm run db:generate` | Use only after an intentional schema change |
| Source push | `git push origin main` | Pushes GitHub source; this is not proof of production deployment |
| Production deploy | `NOT CONFIGURED` | Blocked until owner-controlled Cloudflare project, environments and secrets are established |

Do not “fix” Windows incompatibility by deleting the verified hosting scripts. Add a cross-platform wrapper only in an explicit tooling milestone while preserving remote build behavior.

## Environment variables and bindings

Never put real values in this file, source files, committed `.env*`, screenshots, logs or chat. Local values belong in ignored `.env.local` or Wrangler local secrets. Production values belong in the selected hosting provider's encrypted secret store. CI values belong in GitHub Actions secrets only when CI is configured.

| Key/binding | Purpose | Storage |
|---|---|---|
| `APP_BASE_URL` | Canonical public origin for callbacks and links | Local env / production variable |
| `RAZORPAY_KEY_ID` | Identifies test/live Razorpay account | Local env / production variable; never hardcode |
| `RAZORPAY_KEY_SECRET` | Creates/verifies Razorpay server requests | Local secret / production encrypted secret |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies webhook signatures | Local secret / production encrypted secret |
| `RAZORPAY_MODE` | `test` for staging, `live` only after the launch gate; `mock` is non-production only | Local env / production variable |
| `ALLOW_MOCK_PAYMENTS` | Explicitly permits mock rehearsals outside production | Local env only; `false` in production |
| `RESEND_API_KEY` | Sends transactional order email | Local secret / production encrypted secret |
| `EMAIL_MODE` | `disabled` until sender verification, then `resend` | Local env / production variable |
| `EMAIL_FROM` | Verified sender address | Local env / production variable |
| `SUPPORT_EMAIL` | Public support and notification address | Local env / production variable |
| `SUPPORT_WHATSAPP_NUMBER` | Public WhatsApp support target | Local env / production variable |
| `ADMIN_EMAILS` | Exact comma-separated allowlist for two operators when checked by the app | Local env / production variable; must match Access policy |
| `ADMIN_AUTH_MODE` | `cloudflare-access` in production; `local` is non-production only | Local env / production variable |
| `CATALOG_SOURCE` | `demo` by default; set `database` only after D1 is migrated/populated | Local env / production variable |
| `R2_PUBLIC_BASE_URL` | Public base URL for verified product objects referenced by storage key | Local env / production variable |
| `SHIPPING_FLAT_RATE_PAISE` | Flat shipping charge in integer paise | Local env / production variable |
| `FREE_SHIPPING_THRESHOLD_PAISE` | Optional free-shipping threshold in integer paise | Local env / production variable |
| `SELLER_LEGAL_NAME` | Approved seller identity shown in policies | Production variable |
| `SELLER_POSTAL_ADDRESS` | Approved seller address shown in policies | Production variable |
| `CLOUDFLARE_ACCESS_TEAM_DOMAIN` | Access JWT issuer/JWKS domain | Production variable |
| `CLOUDFLARE_ACCESS_AUD` | Access application audience verified by the server | Production variable |
| `DB` D1 binding | Product/order database | `.openai/hosting.json`/Cloudflare binding; currently null and not production-ready |
| R2 binding | Brand-owned product media | `.openai/hosting.json`/Cloudflare binding; currently null and not production-ready |
| `CLOUDFLARE_ACCOUNT_ID` | Deployment account identifier | CI secret/config, never application client code |
| `CLOUDFLARE_API_TOKEN` | Scoped deployment credential | CI secret only |

Add keys here before using them. Remove obsolete keys in the same change that removes their use. Customer-auth variables remain undecided because customer accounts are deferred.

## Do not touch without approval

- `.openai/hosting.json`: tied to the existing hosted project; accidental edits can disconnect or overwrite hosting resources.
- `build/`, `scripts/`, `worker/`, `vite.config.ts`: form the verified hosting/build pipeline.
- `package-lock.json`: update only through an intentional dependency change and review the diff.
- `drizzle/` migration history: append migrations; never rewrite an applied production migration.
- Payment/order/inventory state transitions: require a decision-log entry, tests and explicit milestone scope.
- Legal/policy text and tax rates: require owner and qualified professional approval; agents may draft but not represent drafts as legal advice.
- Brand-owned media and product truth: never scrape, invent, replace or publish without operator approval.
- Secrets, production databases, payment dashboard settings and DNS: no destructive or live mutations without explicit owner authorization and a rollback plan.
- Another agent's recorded in-progress files: read the handover and coordinate before editing overlapping areas.

## Decision log — append only

Do not rewrite prior entries. Append date, decision, reasoning and rejected alternatives.

### 2026-08-14 — Preserve the existing custom storefront

Decision: continue React/TypeScript/Vinext rather than migrate to Shopify/WooCommerce.

Reasoning: the owner approved the current custom design and explicitly chose continued custom development.

Rejected: Shopify for faster standard commerce; WooCommerce for plugin-led low-cost commerce. Revisit if deadline or development capacity becomes dominant.

### 2026-08-14 — Guest checkout for initial launch

Decision: ship guest checkout; defer customer accounts.

Reasoning: reduces security, privacy, password recovery and schedule scope while supporting initial orders.

Rejected: simultaneous guest and customer-account implementation within the one-month target.

### 2026-08-14 — Spreadsheet catalogue before social automation

Decision: launch from a human-approved spreadsheet/CSV containing 12–20 products.

Reasoning: Instagram posts are not reliable inventory records and lack structured variant/stock data.

Rejected: automatic import/activation of all Instagram posts. A later authorized importer may create drafts only.

### 2026-08-14 — Cloudflare-native low-cost backend

Decision: plan for Workers + D1 + R2, retaining Drizzle and the current build shape.

Reasoning: repository compatibility and free-tier capacity fit 1–10 orders/day and the ₹2,000 setup constraint.

Rejected: immediate managed PostgreSQL and separate object-storage vendors. Revisit when D1 constraints or reporting requirements justify migration.

### 2026-08-14 — Razorpay and manual shipping

Decision: Razorpay is the initial gateway; courier operations remain manual for soft launch until a provider is confirmed.

Reasoning: user preference and low initial order volume.

Rejected: premature courier API development and multiple gateway integrations.

### 2026-08-14 — Temporary demo catalogue references

Decision: populate the catalogue sheets with the existing ten demo products and remote reference images as unverified drafts while the owner obtains originals.

Reasoning: this keeps implementation and visual work moving without misrepresenting third-party imagery or placeholder product data as production-ready.

Rejected: activating demo products, claiming image ownership, downloading/rehosting third-party images, or delaying all catalogue structure work until originals arrive.

### 2026-08-14 — Fail-closed catalogue activation and admin access

Decision: keep `CATALOG_SOURCE=demo` until D1 is migrated and populated, require explicit operator verification plus owned images before a CSV row can become active, and deny admin access unless an exact `ADMIN_EMAILS` allowlist and approved authentication mode are configured.

Reasoning: the current ten products and images are placeholders, and the production bindings/operator emails are not available. Demo fallback preserves the approved preview without silently publishing unverified commercial data.

Rejected: activating imported drafts automatically, trusting a client-only admin gate, or treating a filename as proof that an R2 object and image rights exist.

### 2026-08-15 — Reserved inventory and webhook-authoritative payment lifecycle

Decision: reserve variant inventory when a server-priced checkout order is created, release expired/cancelled reservations, and treat verified Razorpay webhooks as authoritative for real payment state. Browser payment callbacks may only record verification/processing state; mock completion is restricted to explicit non-production rehearsal mode.

Reasoning: this prevents browser price manipulation, overselling, duplicate webhook effects and false paid orders while allowing safe local rehearsals before external accounts are ready.

Rejected: decrementing stock in the browser, marking real orders paid from the Razorpay callback alone, or enabling live checkout with incomplete production configuration.

## Task board

Update this board before ending every working session. Only one item should normally be In progress.

### Done

- Existing interactive storefront and ten-product demo received and verified.
- Brand renamed from Kashmir Elegance to HOUSEOFPASHM.
- Repository initialized and pushed to `https://github.com/Ankush231994/houseofpashm.git`.
- Handover corrected for the actual React/TypeScript/Vinext implementation.
- Production plan and shared agent protocol created.
- Catalogue, product-image and source CSV templates created with owner-provided WhatsApp/Instagram sources recorded.
- Ten existing demo products and their reference image URLs entered as unverified draft catalogue rows.
- Milestone 1A catalogue foundation: five-table D1/Drizzle schema and migration, validated idempotent CSV importer, inventory movement/import audit records, database-backed storefront mode with safe demo fallback, and fail-closed operator admin.
- Catalogue/admin tests (7/7), native TypeScript, production build and rendered-output checks passing on 14 August 2026.
- Product-detail routes, size/colour variants, persistent cart, guest Indian checkout and server-calculated pricing implemented.
- Order, order-item, reservation, payment, webhook, status-event and admin-audit schema plus append-only D1 migration implemented.
- Atomic stock reservation/release, overselling protection, Razorpay Orders/checkout/signature/webhook/refund handling and failed-payment retry implemented.
- Cloudflare Access JWT-verified order dashboard with packing, shipping, tracking, delivery and refund operations implemented.
- Transactional order email integration, WhatsApp support, draft policy pages, customer tracking and recovery/rollback runbook implemented.
- TypeScript and production build pass; 15/15 Node tests and 6/6 desktop/mobile Playwright and accessibility tests pass on 15 August 2026; ESLint has zero errors and eight external-image optimization warnings.
- Product images now expose a desktop zoom cursor and accessible desktop/mobile full-screen viewer with zoom toggle, backdrop/Escape close, scroll locking and reduced-motion support; browser and axe coverage passes on both viewports.

### In progress

- None. Software work requested through Milestone 5 and the product-image zoom enhancement are complete in source; owner-controlled production setup and acceptance are next.

### Next

- Owner exports or downloads original images for the first 12–20 products and completes their core product fields.
- Confirm exact operator emails and responsibilities.
- Create/migrate the owner-controlled D1 database and R2 bucket, upload verified originals, run a dry import, then switch `CATALOG_SOURCE` to `database` only after acceptance.
- Purchase a domain within the ₹2,000 setup cap.
- Start Razorpay unregistered-individual KYC and record requirements/status.
- Confirm courier capability, pricing, tracking, COD and returns.
- Obtain qualified GST/invoicing advice for PAN-India sales.
- Approve real seller/contact details and policy inputs.
- Follow `docs/OWNER_ACTIONS.md` in order, configure the five-minute reservation cleanup trigger, and record both staging rehearsal orders.

### Blocked

- Live payment launch: blocked by Razorpay approval, domain, approved policies/seller/tax data and two owner-run staging rehearsals.
- Production catalogue activation: blocked by verified product data and brand-owned media; the implementation remains safely in demo mode.
- Shipping automation: blocked by courier selection; manual flow is planned first.
- Tax calculations/invoices: blocked by qualified GST/tax decision.
- Customer accounts: intentionally deferred until after soft-launch stabilization.
- Instagram-assisted importer: intentionally deferred until spreadsheet workflow is stable.

## Known issues and gotchas

- The application defaults to ten demo products in `lib/catalog/demo.ts`; none are production catalogue records. Database mode is explicit via `CATALOG_SOURCE=database`.
- External image URLs are references, not confirmed HOUSEOFPASHM-owned assets.
- Cart persists in browser local storage; wishlist remains session-only and customer accounts remain intentionally deferred.
- Real Razorpay mode, database catalogue and Resend email fail closed until their production values/bindings are supplied.
- Policy pages remain visibly marked as drafts until approved seller identity, address and support contact are configured.
- Reservation expiry cleanup requires a deployed Worker Cron Trigger every five minutes.
- Newsletter submission is not persisted or sent.
- Current `.openai/hosting.json` has null D1/R2 bindings and must not be mistaken for production resources.
- Linux-oriented scripts require Bash and GNU `timeout`; native Windows PowerShell cannot run them unchanged.
- Direct `tsc --noEmit` passes with the Wrangler-compatible Cloudflare Worker type release.
- ESLint currently reports eight `next/image` optimization warnings for external/demo catalogue images and no errors.
- Instagram access may be rate-limited and posts do not encode trustworthy SKU/variant/stock state.
- The supplied public WhatsApp catalogue and Instagram profile expose cover/profile metadata but not authenticated product rows or durable product-image URLs; original owner exports are required.
- The source Git repository is at `origin/main`; pushing it is not yet a production deployment.

## Active handover

```text
Agent/session: Codex, 2026-08-15
Milestone: Milestones 1B–5 — shopping journey, payments, fulfilment and launch verification
Objective: Complete the user-requested commerce implementation and document every owner-only production step.
Status: Complete in source and automated local verification; external production configuration and human acceptance remain intentionally unconfigured.
Files changed: storefront/product/checkout/policy/tracking/admin routes; commerce APIs/domain modules; D1 schema/migration; Worker scheduler; security headers/auth; tests; production environment template; owner/runbook documentation.
Tests run and exact results: `npx.cmd tsc --noEmit` passed; Vinext production build passed; Node suite 15/15 passed; Playwright desktop/mobile interaction and axe suite 6/6 passed including the product zoom viewer; ESLint passed with zero errors and eight external-image warnings. `npm test` cannot invoke its Bash wrapper on this Windows host, so equivalent native stages were run separately.
Failures/blockers: Production D1/R2/Access, verified owned media/product facts, domain, seller/tax/policy inputs, Razorpay/Resend accounts and courier rules require owner action. Two real staging rehearsal orders cannot be performed without those accounts.
Uncommitted changes: None at handoff; the commerce completion source and documentation are committed together.
Next exact action: Owner follows `docs/OWNER_ACTIONS.md` Step 1 onward; first provide two operator emails, approved seller/contact details and completed catalogue rows/assets.
Do not overwrite: `.openai/hosting.json`, prior migrations, payment/inventory transition decisions, or the demo fallback safety gate.
```

## Agent working protocol

1. Read this entire file, `PLAN.md`, the relevant source, and the latest Git status before acting.
2. State the current milestone in commentary before modifying files.
3. Classify the task as preserve, refactor, add missing production functionality, or replace unsafe implementation.
4. If the request conflicts with this file, the repository, or a recorded decision, stop and report the conflict before editing.
5. Inspect existing changes and preserve unrelated user/agent work.
6. Make the smallest coherent change for the milestone; do not introduce deferred features opportunistically.
7. Add or update tests and run the narrowest relevant checks, followed by build when the milestone requires it.
8. Never commit secrets, real customer data, payment payloads, identity documents or unredacted logs.
9. Never run destructive commands or mutate production/DNS/payment settings without explicit confirmation and exact target verification.
10. Before ending, update the task board, append material decisions, and record a handover if anything remains incomplete.

Mid-task handover format:

```text
Agent/session:
Milestone:
Objective:
Status:
Files changed:
Tests run and exact results:
Failures/blockers:
Uncommitted changes:
Next exact action:
Do not overwrite:
```

## Claude Code ↔ Codex sync protocol

- `AGENTS.md` is the only shared instruction/status source. `CLAUDE.md` remains a one-line pointer.
- At session start, read the latest `AGENTS.md`, run `git status --short`, and identify any active handover before editing.
- Claim work by moving exactly one task into **In progress** and appending `(Codex, YYYY-MM-DD)` or `(Claude Code, YYYY-MM-DD)`. Do this before application edits.
- An agent may edit only its claimed task's files. If overlap is necessary, stop and leave a handover request; do not silently merge or overwrite the other agent's work.
- Append decisions as new dated entries. Never modify an earlier decision to make history look consistent.
- Before committing, re-read `AGENTS.md` and merge only additive task-board/decision-log changes. On conflict, preserve both entries, mark the task Blocked, and ask the owner which decision controls.
- End a completed task by moving it from In progress to Done, adding the next concrete task, and recording tests/commit in the session handover or commit message.
- End an incomplete task by leaving it In progress with the full handover format. The next agent must acknowledge that handover before continuing.
- Never have both agents modify payment, inventory, migrations, deployment or `AGENTS.md` simultaneously.
