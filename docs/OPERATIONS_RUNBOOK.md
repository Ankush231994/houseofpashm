# HOUSEOFPASHM operations, backup and recovery runbook

## Daily operator checklist

1. Review paid/payment-failed orders and Razorpay Dashboard totals.
2. Confirm stock alerts and investigate any negative/mismatched quantity immediately.
3. Move paid orders to packing, print/copy delivery details, and perform a second-person SKU/size check.
4. Book the courier manually, then record provider, tracking number and HTTPS link before marking shipped.
5. Review WhatsApp/email requests, failed deliveries, cancellations, refunds and disputes.
6. Reconcile paid/refunded order totals with Razorpay before ending the day.

Never edit order/payment/inventory tables manually. Use the admin transitions; they create status/audit records.

## Before every deployment or migration

1. Confirm `git status --short` is clean and identify the exact commit.
2. Run type-check, lint, unit/integration tests, production build and Playwright tests.
3. Export D1 using a timestamped filename outside the repository:

```powershell
npx.cmd wrangler d1 export houseofpashm-production --remote --output="C:\HOUSEOFPASHM-BACKUPS\before-deploy-YYYYMMDD-HHMM.sql"
```

4. Record the current D1 Time Travel bookmark:

```powershell
npx.cmd wrangler d1 time-travel info houseofpashm-production
```

5. List and review migrations before applying:

```powershell
npx.cmd wrangler d1 migrations list houseofpashm-production --remote
npx.cmd wrangler d1 migrations apply houseofpashm-production --remote
```

6. Deploy staging first, run both checkout paths, then promote the exact tested commit.

## Database restore rehearsal

Perform rehearsals on a separate recovery database, never by overwriting production.

1. Create `houseofpashm-recovery-test`.
2. Export production after removing or securely controlling customer data access.
3. Import the SQL export into the recovery database using Wrangler `d1 execute --file`.
4. Point a private recovery Worker at the recovery database.
5. Verify product, stock, order, payment, webhook and audit counts.
6. Delete recovery customer data through the approved Cloudflare process after the rehearsal evidence is recorded.

## Emergency D1 recovery

D1 Time Travel can restore a production-backend database to a timestamp or bookmark. This overwrites the database and is destructive. Before executing it, stop checkout traffic, export the current damaged state, record the incident timestamp/bookmark, obtain owner approval, and confirm the exact database name.

```powershell
npx.cmd wrangler d1 time-travel info houseofpashm-production --timestamp="YYYY-MM-DDTHH:MM:SS+05:30"
npx.cmd wrangler d1 time-travel restore houseofpashm-production --bookmark=EXACT_BOOKMARK
```

After restore: run integrity/count checks, replay only verified gateway events that are missing, reconcile every affected payment manually, and reopen checkout only after two operators agree.

## Worker rollback

If code is broken but the database schema remains compatible, identify the previous known-good Worker version and use the Cloudflare deployment dashboard or:

```powershell
npx.cmd wrangler rollback EXACT_VERSION_ID --message "Rollback after verified incident"
```

A Worker rollback does not roll back D1/R2 data or migrations. Never deploy old code against an incompatible newer schema.

## Product-media recovery

Keep the owner’s original images in a separate backed-up folder as well as R2. R2 is serving storage, not the only archive. Maintain a manifest mapping SKU, filename, checksum, upload date and operator approval. Never overwrite an object silently; upload a versioned filename and update the approved catalogue.

## Payment incident rules

- Do not fulfil from the browser callback alone; real fulfilment begins at verified `payment.captured`.
- Treat duplicate webhooks as normal and verify that only one event/order transition was recorded.
- If Razorpay shows captured but the site does not, stop fulfilment changes, record gateway/order IDs, verify the webhook signature/event and reconcile manually.
- A refund is complete only when Razorpay and the order record both show refunded.
- Never paste API keys, webhook bodies containing customer information or KYC documents into issues or chat.

## Shipping and support incident rules

- Do not mark shipped without a courier and tracking number.
- Verify a tracking link uses HTTPS and belongs to the confirmed courier.
- Record return/refund decisions in the operator note and audit trail.
- Escalate damaged, lost, chargeback or legal complaints to the owner immediately.
