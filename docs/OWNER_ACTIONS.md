# HOUSEOFPASHM owner action guide

The application-side launch journey is implemented. Follow these steps in order. Do not paste passwords, API secrets, PAN, Aadhaar, bank details or KYC documents into GitHub, source files or chat.

## Step 1 — Send the two operator identities

Provide privately:

- Owner/operator 1 email:
- Operator 2 email:
- Who confirms stock:
- Who packs and ships:
- Who handles WhatsApp and returns:

These exact emails become both the `ADMIN_EMAILS` allowlist and the Cloudflare Access policy. Admin remains locked until both controls are configured.

## Step 2 — Approve the seller and customer-contact details

Obtain and provide:

- Legal seller name
- Complete postal/return address
- Support email on the purchased domain
- WhatsApp number with country code
- Grievance/contact person and response hours
- Approved store name shown on invoices and Razorpay

The policy pages intentionally show a draft warning until `SELLER_LEGAL_NAME`, `SELLER_POSTAL_ADDRESS` and `SUPPORT_EMAIL` are configured.

## Step 3 — Finish the first 12–20 products

For every sellable variant, complete `catalog/products.csv` with verified SKU, name, category, description, price, MRP, size, colour, stock, fabric, care, weight and package dimensions. Put only owned/authorised images in `catalog/product-images.csv`; set ownership and operator verification to `yes` only after checking the original.

Send the original image files in one folder. Use safe names such as `hop-kur-001-front.webp`. Do not send screenshots downloaded from another seller.

## Step 4 — Purchase and connect the domain

1. Buy the domain in an owner-controlled registrar account with two-factor authentication.
2. Add it to the owner-controlled Cloudflare account.
3. Keep registrar, Cloudflare and recovery-email credentials in a password manager.
4. Confirm the final public URL before setting `APP_BASE_URL`.

Do not point public DNS at the store until staging tests and the launch gate are complete.

## Step 5 — Create Cloudflare data resources

From the repository root after `npx wrangler login`:

```powershell
npx.cmd wrangler d1 create houseofpashm-production
npx.cmd wrangler r2 bucket create houseofpashm-products
npx.cmd wrangler r2 bucket list
```

Record the returned D1 database ID. Configure the D1 binding exactly as `DB`, configure the R2 bucket through the approved hosting control plane, and set its public/custom media domain as `R2_PUBLIC_BASE_URL`. Do not edit `.openai/hosting.json` blindly; its project binding is protected.

After bindings are reviewed:

```powershell
npx.cmd wrangler d1 migrations list houseofpashm-production --remote
npx.cmd wrangler d1 migrations apply houseofpashm-production --remote
```

Upload approved originals under `products/`, validate both CSVs in `/admin`, import them, check stock, and only then set `CATALOG_SOURCE=database`.

In the deployed Worker, add a Cron Trigger that runs every five minutes (`*/5 * * * *`). The Worker uses this scheduled event to release expired 15-minute stock reservations. Confirm the trigger appears in Cloudflare before staging payment tests; without it, abandoned checkout stock will remain reserved until another cleanup is run.

## Step 6 — Protect operator routes with Cloudflare Access

1. Open Cloudflare Zero Trust → Access controls → Applications.
2. Create a self-hosted application covering `/admin/*` and `/api/admin/*` on the production domain.
3. Enable email one-time PIN or the chosen identity provider.
4. Create an Allow policy containing only the two exact operator emails.
5. Copy the team domain and Application Audience (AUD) tag.
6. Set `ADMIN_AUTH_MODE=cloudflare-access`, `CLOUDFLARE_ACCESS_TEAM_DOMAIN`, `CLOUDFLARE_ACCESS_AUD` and the matching `ADMIN_EMAILS`.
7. Test an allowed email and an unlisted email. The unlisted email must never reach the admin page.

The application verifies the Access JWT signature, issuer, audience, expiry and email; merely sending an email header cannot unlock admin.

## Step 7 — Configure Razorpay Test Mode

1. Create/finish the Razorpay account and KYC from the owner account.
2. Generate Test Mode API keys. Store the Key ID and Key Secret in encrypted hosting secrets.
3. Set `RAZORPAY_MODE=test`; never combine live mode with test keys.
4. Enable automatic capture in Razorpay payment capture settings.
5. Add the HTTPS webhook `https://YOUR_DOMAIN/api/payments/webhook`.
6. Create a new webhook secret of at least 32 random characters and store it as `RAZORPAY_WEBHOOK_SECRET`.
7. Subscribe at minimum to `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed` and `payment.dispute.created`.
8. Complete both rehearsal orders below before requesting live mode.

The server creates Razorpay Orders, verifies callback HMAC signatures, waits for `payment.captured` before real fulfilment, stores unique webhook events, supports payment retry and requests full refunds through Razorpay.

## Step 8 — Confirm shipping rules

Ask the courier for written answers:

- PAN-India PIN-code coverage
- Pickup days/cutoff
- Rate by weight/zone
- COD support and remittance timing
- Tracking URL format
- Return-to-origin and return charges
- Damage/loss claim process
- Prohibited goods and packaging requirements

Then approve the flat launch charge and free-shipping threshold in paise. Example only: ₹99 is `9900`; ₹1,999 is `199900`. Do not reuse the example without approval.

## Step 9 — Configure transactional email

1. Create a Resend account.
2. Add a sending subdomain such as `updates.YOUR_DOMAIN`.
3. Add the SPF/DKIM records shown by Resend and wait for verified status.
4. Create a sending-only API key and store it as `RESEND_API_KEY`.
5. Set `EMAIL_MODE=resend` and `EMAIL_FROM=HOUSEOFPASHM <orders@YOUR_DOMAIN>`.
6. Send payment, shipping, delivery and refund test messages to both operator addresses and at least one external mailbox.

## Step 10 — Approve tax, policies and fulfilment

Give a qualified adviser the actual seller structure, states supplied from, product classifications and expected turnover. Obtain written guidance on GST registration, inter-state sales, invoices and tax rates. Then have the privacy, terms, shipping, return/exchange and cancellation/refund drafts reviewed against the real courier and business process.

Do not remove the policy draft warning until this review and all seller/contact fields are complete.

## Step 11 — Run two rehearsal orders

Use Razorpay Test Mode, real staging email and two different mobile viewports.

### Rehearsal A — successful order

1. Import an owned test product with stock 3.
2. Add size/colour to the persistent cart and refresh the page.
3. Complete guest delivery details and pay in Test Mode.
4. Confirm the browser callback shows processing, then confirm `payment.captured` moves the order to paid.
5. Confirm stock fell once, even if the webhook is replayed.
6. In admin: paid → packing → shipped; enter courier/tracking; then delivered.
7. Confirm customer emails and Track Order output at each relevant step.

### Rehearsal B — failure, retry and refund

1. Start with a different variant and deliberately fail/cancel the first payment.
2. Confirm the order shows `payment_failed` and Retry Payment is available only before reservation expiry.
3. Retry successfully; confirm exactly one paid order and one stock reservation.
4. Request a full refund from admin.
5. Confirm the Razorpay refund webhook moves it to `refunded`, the email is sent and the dashboard/payment records agree.
6. Separately let an unpaid reservation expire and confirm stock is restored exactly once.

Record screenshots, order numbers, gateway IDs (not secrets), webhook event IDs, stock before/after and operator names in the launch evidence log.

## Step 12 — Live-mode gate

Switch to live keys only after both rehearsals pass, policy/seller/tax inputs are approved, the courier is confirmed, backup/restore has been rehearsed and a controlled low-value real transaction/refund is authorised. Set `APP_ENV=production`, `RAZORPAY_MODE=live`, `ALLOW_MOCK_PAYMENTS=false`, and verify that no `rzp_test_` key remains.

Use `config/production-environment.example` as the variable checklist; keep actual secrets only in encrypted provider storage.
