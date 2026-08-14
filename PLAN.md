# HOUSEOFPASHM Production Plan

Planning date: 14 August 2026
Target market: India
Initial demand target: 1–10 orders per day
Available effort: 5 hours per day
Operators: owner plus one person
Initial cash budget: ₹2,000
Requested launch target: 14 September 2026

## 1. Reality check

A fully live custom store in one month is possible only as a tightly controlled soft launch, not as a mature production platform. The best-case implementation requires roughly 150 focused hours, which consumes the entire stated availability and leaves no meaningful buffer for catalogue cleanup, Razorpay review, courier delays, legal/tax decisions, or failed testing. A safer delivery estimate is six to eight weeks.

The one-month target remains a conditional stretch goal with these cuts: launch with 12–20 verified products, guest checkout only, manual courier booking, a two-person internal admin, no coupons, no customer accounts, no automated Instagram ingestion, and no advanced reporting. If the catalogue, domain, Razorpay KYC submission, courier decision, and approved policies are not ready by 18 August 2026, the live-payment date moves; security and payment verification must not be cut to preserve the date.

The ₹2,000 budget can cover a basic domain and little else. Fixed infrastructure can initially remain near ₹0 by using free tiers, but payment fees, shipping, packaging, returns, product photography, professional tax/legal advice, and future service upgrades are real business costs outside this budget.

Coding proficiency was not specified. Estimates therefore assume the owner can run commands, follow agent-generated changes, inspect browser behavior, and perform structured acceptance tests, but is not independently designing production payment or security systems. Re-estimate after the first milestone if that is inaccurate.

## 2. Recommended stack

| Area | Recommended choice | Why | Runner-up rejected | When the runner-up wins |
|---|---|---|---|---|
| Storefront | Existing React 19 + TypeScript + Vinext/Vite | Preserves the approved design and avoids a rewrite | Shopify | Choose Shopify if the deadline matters more than custom design/control or development time falls below 100 hours |
| Runtime/hosting | Cloudflare Workers using the existing Worker-compatible build | Already supported by the repository; low fixed cost and sufficient early capacity | Vercel | Choose Vercel if Vinext/Worker compatibility becomes a recurring delivery blocker |
| Database | Cloudflare D1 with Drizzle | Existing starter integration, transactional SQLite model, free capacity suitable for early volume | Managed PostgreSQL | Choose PostgreSQL when reporting, concurrency, extensions, or operational complexity outgrow D1 |
| Product media | Cloudflare R2 | No egress charge and a useful free allowance; works beside Workers | Cloudinary | Choose Cloudinary if automatic transformations and non-technical media workflows justify a paid service |
| Payments | Razorpay Orders API + Standard Checkout + verified webhooks | User choice, India payment support, no setup/AMC, test mode | Cashfree | Choose Cashfree if Razorpay rejects onboarding or measured payment success/support is worse |
| Admin access | Cloudflare Access OTP restricted to the two exact operator emails | Avoids building password security for launch and remains separate from customer identity | Application-managed admin auth | Choose application auth when roles, audit history, or many staff accounts are required |
| Customer identity | Guest checkout at launch; accounts deferred | Reduces abandonment, privacy scope, recovery flows, and deadline risk | Auth.js/customer accounts | Add after launch when repeat-order behavior demonstrates value |
| Email | Resend transactional email free tier | At 1–10 orders/day, 3,000 emails/month and 100/day are initially adequate | Brevo/Postmark | Switch when volume, deliverability, support, or marketing automation requires it |
| Shipping | Manual booking with the confirmed local courier for soft launch | Courier/API is unknown; manual operation is acceptable at 1–10 orders/day | Shiprocket API | Use when courier coverage is inadequate or manual entry causes errors/delay |
| Catalogue intake | Controlled spreadsheet/CSV import with human approval | Creates an auditable inventory source before automation | Instagram-assisted importer | Add only after the catalogue schema and approval workflow are stable |

Current published limits support this initial architecture: Cloudflare Workers Free allows 100,000 requests/day, D1 includes 5 million rows read and 100,000 rows written per day with 5 GB storage, and R2 includes 10 GB-month storage ([Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)). Razorpay publishes a 2% domestic platform fee plus GST on that fee, with no setup or annual maintenance charge ([Razorpay e-commerce pricing](https://razorpay.com/solutions/e-commerce/)). Resend publishes 3,000 transactional emails/month and 100/day on its free tier ([Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing)). These terms must be rechecked before account activation.

## 3. Phase 1 — Local and test-mode milestones

### Milestone 0 — Catalogue and operating foundation

Goal: turn Instagram-based selling into a controlled launch catalogue and documented workflow.

Concrete deliverable: a spreadsheet template and first 12–20 approved rows containing SKU, product name, slug, category, description, selling price, MRP, sizes, colours, stock by variant, fabric, embroidery, care, weight, tax classification pending professional confirmation, image ownership/source, active status, and shipping dimensions. Document which operator owns catalogue, packing, customer messages, refunds, and daily reconciliation.

Acceptance criteria: every launch product has a unique SKU, owned images, price, at least one sellable variant, known stock, and operator approval; no product is inferred automatically from Instagram.

Effort: 16–24 owner/operator hours, plus photography time.

Likely failure: Instagram posts omit stock, variants, weights, or current prices. The launch catalogue must be capped rather than importing uncertain products.

### Milestone 1 — Data model, media and protected admin

Goal: replace the hardcoded catalogue with a reliable local data layer.

Status on 14 August 2026: catalogue foundation complete in source. Products, variants, images, import audits and inventory movements have a generated D1 migration; CSV validation/import, database storefront mode, safe demo fallback and fail-closed catalogue admin are implemented and tested. Owner-controlled D1/R2 resources, exact operator emails and verified product assets are still required. Cart, order, payment, webhook and broader order-admin tables remain in the later part of this milestone and must not be represented as complete.

Concrete deliverable: Drizzle migrations for products, variants, inventory movements, carts, orders, order items, payment attempts, webhook events and admin audit entries; local D1/R2 bindings; CSV import validation; protected admin screens for product, stock and order status.

Acceptance criteria: a clean database can be created from migrations; the same CSV imports twice without duplicates; invalid prices/SKUs fail with clear messages; only the two approved operator emails can reach admin; inventory edits create audit entries.

Effort: 24–34 hours.

Likely failure: treating stock as a single product number despite size/colour variants, or exposing admin routes without server-side authorization.

### Milestone 2 — Complete the shopping journey

Goal: make the existing storefront capable of producing an order intent.

Concrete deliverable: database-backed listing/search/filter/sort, product-detail routes, selectable size/colour, stock checks, persistent browser cart, address/contact form, delivery summary and server-calculated totals.

Acceptance criteria: products and variants come from the database; unavailable variants cannot be ordered; refreshing retains the cart; changing client-side values cannot change server totals; mobile and desktop flows have no horizontal overflow.

Effort: 24–32 hours.

Likely failure: trusting browser prices or allowing two buyers to oversell the last unit. Inventory reservation rules must be explicit.

### Milestone 3 — Razorpay test checkout and order lifecycle

Goal: complete secure test-mode payment and create an auditable order.

Concrete deliverable: server-created Razorpay orders, Standard Checkout, signature verification, webhook verification, idempotent payment handling, order states, failed-payment retry, refund recording and reconciliation view.

Acceptance criteria: test success creates one paid order; repeated webhooks do not duplicate orders or stock deductions; invalid signatures are rejected; failed/cancelled payments do not mark orders paid; the admin shows payment/order history.

Effort: 26–36 hours.

Likely failure: marking orders paid from the browser callback, mishandling webhook retries, or decrementing inventory more than once.

### Milestone 4 — Policies, communication and manual fulfilment

Goal: make a paid order operable by two people.

Concrete deliverable: owner-approved contact, privacy, terms, shipping, cancellation/refund and exchange pages; transactional order emails; printable packing information; manual courier/tracking fields; WhatsApp support link; daily reconciliation checklist.

Acceptance criteria: all mandatory business/contact details are real; every order can move from paid to packed, shipped, delivered, cancelled or refunded; customers receive confirmation and tracking updates; policies agree with actual operations.

Effort: 14–22 hours, excluding professional review.

Likely failure: copying generic policies that conflict with actual return/shipping practice. Razorpay requires a live website and core policy pages before live API access ([Razorpay website requirements](https://razorpay.com/docs/payments/dashboard/account-settings/business-website-details/)). Indian e-commerce rules require clear return/refund, shipment, payment, grievance and total-price information; obtain professional advice before publishing ([Department of Consumer Affairs rules](https://consumeraffairs.nic.in/sites/default/files/E%20commerce%20rules_0.pdf)).

### Milestone 5 — Test suite and launch rehearsal

Goal: prove the system works when normal and abnormal events occur.

Concrete deliverable: unit tests for money/state transitions, integration tests for checkout/webhooks/inventory, browser tests for critical mobile/desktop paths, accessibility review, security checklist and two complete rehearsal orders.

Acceptance criteria: build, lint and automated tests pass; no secrets appear in client bundles or Git; webhook replay and price tampering tests pass; two operators independently process a test order and refund; backup restore is demonstrated.

Effort: 20–30 hours.

Likely failure: spending the remaining schedule on features and treating rehearsal as optional.

Phase 1 total: 124–178 hours plus catalogue photography, legal/tax advice and external onboarding. This is why one month has no contingency.

## 4. Phase 1 → Phase 2 gate

Production work starts only when every item is green:

- 12–20 launch products have owned photos, unique SKUs, variants, stock, weights and approved prices.
- The legal seller name, postal address, support email, WhatsApp number and grievance contact are approved.
- A CA or qualified adviser has confirmed GST registration/invoicing and applicable product tax treatment, especially for PAN-India/inter-state sales. Government FAQs state that own-site sales do not require TCS on the seller's own products, but GST liability and registration depend on the actual supply facts ([CBIC sectoral FAQ](https://cbic-gst.gov.in/sectoral-faq.html)).
- Razorpay KYC is submitted and the account is eligible for the intended business category.
- A domain is purchased and controlled by the owner.
- The local courier confirms PAN-India coverage, prices, prohibited items, pickup, tracking, COD position and returns process; otherwise a replacement courier is selected.
- Policies match the confirmed fulfilment and refund workflow.
- Database migrations work from empty state.
- Test payment success, failure, retry, webhook replay and refund paths pass.
- Inventory cannot go negative and price calculations occur on the server.
- Admin is restricted to the two approved emails.
- Backup and restore have been tested, not merely documented.
- Two rehearsal orders are fulfilled end-to-end on mobile and desktop.
- A rollback procedure and named decision-maker exist.

## 5. Phase 2 — Production milestones

### Milestone 6 — Production infrastructure and domain

Goal: create isolated staging and production environments.

Deliverable: Cloudflare project/account ownership, production D1/R2 resources, secrets, domain/DNS/TLS, staging hostname, deployment checks and rollback instructions.

Acceptance criteria: staging and production do not share databases or secrets; TLS is valid; a failed release can be rolled back; production admin is Access-protected.

Effort: 10–16 hours.

Likely failure: reusing test secrets/data in production or assuming the existing `.openai/hosting.json` is the final commercial deployment configuration.

### Milestone 7 — Live Razorpay activation

Goal: safely accept real payments.

Deliverable: live credentials stored as secrets, production webhook endpoint/secret, live-mode reconciliation and a controlled low-value real transaction/refund.

Acceptance criteria: Razorpay Dashboard, database and bank settlement records agree; webhook signatures are verified; secrets never reach the browser or repository; the real refund is confirmed.

Effort: 8–14 hours plus Razorpay review time.

Likely failure: onboarding is delayed because business/contact/policy information is incomplete. Razorpay currently supports unregistered individual onboarding using PAN and CKYC/video KYC, subject to its review ([Razorpay setup](https://razorpay.com/docs/payments/set-up/?preferred-country=IN)).

### Milestone 8 — Fulfilment, monitoring and recovery

Goal: ensure operators can detect and recover from failures.

Deliverable: manual shipping runbook, order/payment alerts, structured error logging, uptime monitoring, daily database export, restore rehearsal, incident contacts and refund/chargeback log.

Acceptance criteria: an operator detects a simulated failed webhook; a database export restores into a clean environment; an order can be manually reconciled without editing the database directly.

Effort: 12–20 hours.

Likely failure: relying on a dashboard without alerts or keeping backups that have never been restored.

### Milestone 9 — Soft launch and stabilization

Goal: launch safely at low volume before broader promotion.

Deliverable: owner/staff test cohort, then capped public traffic; daily review of errors, payment mismatches, stock, support and fulfilment times.

Acceptance criteria: ten consecutive real orders complete without payment or inventory mismatch; every support issue has an owner; fulfilment and refund timings match published policies.

Effort: 10–16 implementation/operations hours across the first week.

Likely failure: promoting heavily before operational evidence exists.

After stabilization, consider customer accounts, courier API, an Instagram-assisted draft importer, richer analytics and a product-image pipeline. Each requires a separate decision and milestone.

## 6. Cost table

All prices are planning estimates as of 14 August 2026 and must be confirmed at purchase. Variable commerce costs are not covered by the ₹2,000 setup budget.

| Item | Initial | Monthly | Annual | Upgrade trigger |
|---|---:|---:|---:|---|
| `.in` or comparable domain | ₹800–₹1,500 | ₹0 | ₹800–₹1,500 renewal estimate | Registrar/TLD renewal price changes |
| Cloudflare Workers/D1/R2 | ₹0 | ₹0 initially | ₹0 initially | Free request/database/storage limits or support requirements are exceeded |
| Cloudflare Access for 2 operators | ₹0 | ₹0 | ₹0 | Team grows beyond free-plan allowance or needs paid support/log retention |
| Resend transactional email | ₹0 | ₹0 | ₹0 | More than 100 emails/day or 3,000/month |
| Razorpay | ₹0 setup | 2% + GST on fee per successful domestic payment | Variable | Negotiated pricing or different payment instruments |
| Uptime/error monitoring | ₹0 | ₹0 initially | ₹0 initially | Free retention/alert quotas are insufficient |
| Courier/shipping | Unknown | Per shipment | Variable | Courier confirmation required before launch |
| Legal/tax consultation | Not funded | Unknown | Unknown | Required before PAN-India live sales; obtain quote |
| Product photography/packaging | Not funded | Variable | Variable | Catalogue quality and order volume |
| Fixed-cost total | ₹800–₹1,500 | approximately ₹0 | ₹800–₹1,500 | Excludes transaction, shipping, professional and operational costs |

The ₹2,000 initial budget fits only if the domain stays in range and every technical service remains on a free tier. Keep at least ₹500 unallocated. The business needs a separate operating balance for shipping, refunds and packaging before accepting orders.

## 7. Risk register

| Rank | Risk | Likelihood | Blast radius | Mitigation |
|---:|---|---|---|---|
| 1 | Catalogue data is incomplete or stale | High | Wrong product/stock reaches customers | Cap launch set; require spreadsheet validation and operator approval |
| 2 | One-month schedule has no contingency | High | Unsafe launch or missed date | Enforce feature cuts and gate date; move launch rather than skip security/testing |
| 3 | Razorpay onboarding/live keys are delayed or rejected | Medium–High | No live online payments | Submit KYC/policies immediately; retain WhatsApp/manual-payment fallback only if legally and operationally approved |
| 4 | GST/invoicing position is wrong | Medium | Tax liability, blocked operations, customer disputes | Obtain CA advice before live mode; encode tax only after written decision |
| 5 | Courier cannot support PAN-India workflow | High until confirmed | Orders cannot be fulfilled/tracked | Confirm courier in week one; evaluate Shiprocket/alternative if requirements fail |
| 6 | Inventory oversells | Medium | Refunds and brand damage | Variant-level stock, atomic reservation, webhook idempotency, daily reconciliation |
| 7 | Payment/webhook implementation is insecure | Medium | Lost money or false paid orders | Server-created totals, verified signatures, replay tests, no browser-authoritative payment state |
| 8 | Two operators lack a clear handoff | Medium | Missed messages/shipments/refunds | Written daily checklist, status owner, audit log and escalation rule |
| 9 | Product imagery is unowned or too slow | High | Legal/brand/performance problems | Use only brand-owned compressed files stored in R2 before launch |
| 10 | Scope expands into accounts/social automation | High | Core checkout misses deadline | Defer both until ten stable real orders and a separately approved milestone |

## 8. What should not be built now

Do not build customer accounts, social login, loyalty points, coupons, reviews, recommendations, multi-vendor support, automated returns, a mobile app, international sales, advanced analytics, AI customer support, or an autonomous social-media catalogue agent before launch.

The later Instagram feature should read content only from an authorized brand account and create draft catalogue records. It must never publish, price, activate, or change inventory without human approval. A spreadsheet remains the source of truth.

Shopify would beat this custom build if the deadline becomes immovable, development availability drops, or the owner wants reliable standard commerce more than code ownership. WooCommerce would win if low-cost commodity hosting and a WordPress operator are already available. Medusa would win only when a development team needs a headless commerce domain model and can operate its infrastructure. For the stated design-control preference, continuing the existing application is reasonable, but it is not the fastest or lowest-risk route to taking money.

## 9. Definition of done

The project is done for initial production only when a customer in India can browse accurate owned catalogue content, select an in-stock variant, submit an address, pay through live Razorpay, receive confirmation, and later receive tracking; both operators can securely manage stock and progress the order; payment and webhook events are verified and idempotent; totals cannot be changed from the browser; policies and seller information are approved and visible; tax/invoicing treatment is confirmed; monitoring alerts reach an operator; backups restore successfully; rollback is documented and tested; ten real soft-launch orders reconcile without inventory/payment mismatch; and no demo claim, image, price or contact detail remains.

## WHAT I'D PUSH BACK ON

The one-month date is the main problem. It combines unfinished catalogue work, no domain, unknown courier, unstarted payment onboarding, unresolved tax status and a custom backend. Those are not cosmetic tasks. I would publicly promise a launch only after the Phase 1 gate is green and would privately plan for six to eight weeks.

I would also push back on “all Instagram products” as the launch catalogue. Posts are marketing content, not inventory records. Launch 12–20 products that can be photographed, described, stocked, packed and refunded correctly; expand only after the operating loop works.

Finally, ₹2,000 is not a complete commerce budget. It may cover the domain while free infrastructure handles early traffic, but it does not cover professional advice, packaging, shipping float, returns or photography. Accepting payments without a separate operating reserve is unsafe even when the software costs ₹0.
