# HOUSEOFPASHM — Demo Website Handover

## Project overview

This repository contains the complete source code for the HOUSEOFPASHM demo storefront.

The website was designed as a Myntra-inspired fashion-commerce experience while keeping HOUSEOFPASHM's own brand direction, colours, product categories and story. It is not a copy of Myntra's logo, copyrighted content or branding.

- Official social profile: pending confirmation
- Source repository: <https://github.com/Ankush231994/houseofpashm>
- Live demo: legacy URL pending HOUSEOFPASHM deployment
- Current status: interactive front-end demo
- Primary market represented: Pune and PAN India

## What has been built

### Storefront design

- Premium fashion-commerce homepage
- Sticky Myntra-style navigation header
- HOUSEOFPASHM wordmark and temporary `H` brand mark
- Promotional delivery bar
- Editorial hero section with offer messaging
- Category navigation for Kurtis, Suit Sets, Co-ord Sets, Kaftans, Stoles and Bags
- Trust and service-benefit strip
- Responsive product catalogue
- Brand-story and craftsmanship section
- Newsletter sign-up section
- E-commerce footer with shop, help, location and payment information
- Fully responsive layouts for desktop, tablet and mobile

### Working interactions

- Real-time catalogue search
- Category filters
- Sorting by recommended, rating and price
- Wishlist save/remove interaction and wishlist-only view
- Add-to-bag interaction
- Shopping-bag drawer with item removal and running total
- Empty search, empty wishlist and empty bag states
- Smooth navigation between storefront sections
- Mobile navigation drawer
- External GitHub repository link
- Keyboard-friendly native controls and accessible labels on primary actions
- Reduced-motion support for users who request it through their device settings

## Technology stack

- Next.js-compatible application structure
- React 19
- TypeScript
- Vinext and Vite
- Tailwind CSS 4 import with custom CSS design system
- Cloudflare Worker-compatible production output
- Node.js 22.13 or newer
- npm with a committed lockfile for repeatable installation

No paid UI library, commercial template or paid API is required for the current demo.

## Important files

```text
app/
  page.tsx                 Main storefront, product data and interactions
  globals.css              Complete responsive design system and styling
  layout.tsx               Page metadata, fonts and root layout
  chatgpt-auth.ts          Starter authentication helper
build/
  sites-vite-plugin.ts     Hosting/build integration
db/
  index.ts                 Database starter integration
  schema.ts                Database schema starter
public/
  favicon.svg              Browser icon
scripts/
  build-verified.sh        Verified production build
  install-ci.sh            Repeatable dependency installation
  sites-env.sh             Build environment helper
  validate-artifact.sh     Production artifact validation
tests/
  rendered-html.test.mjs   Rendered-output validation
worker/
  index.ts                 Cloudflare Worker entry point
.openai/hosting.json       Hosting project binding
package.json               Dependencies and scripts
package-lock.json          Exact dependency versions
vite.config.ts             Vite/Vinext configuration
tsconfig.json              TypeScript configuration
```

## Running the website locally

### Requirements

- Node.js 22.13 or newer
- npm

### Installation

```bash
npm ci
```

### Development mode

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Validation

```bash
npm test
```

The ZIP intentionally does not include `node_modules`, compiled output, runtime caches or Git history. These are large, machine-generated folders and are recreated from the included source files and `package-lock.json`. No source code or required configuration has been omitted.

## Demo catalogue

The product names, prices, discounts, ratings, review counts and availability labels are realistic demonstration content. They are currently stored in the `products` array inside `app/page.tsx`.

The demo uses externally hosted reference imagery to communicate the intended visual direction. These images do not belong to the final HOUSEOFPASHM catalogue and must be replaced with brand-owned product photographs before commercial launch.

Recommended product data for the production catalogue:

- SKU
- Product name
- Category and subcategory
- Description
- Selling price and MRP
- Available sizes
- Colour variants
- Stock by variant
- Fabric and embroidery details
- Care instructions
- Product images and videos
- Shipping weight
- Tax classification
- Active/inactive status

## Demo limitations

The following elements are intentionally visual or simulated in this version:

- Profile button has no customer authentication
- Bag contents are held only in current browser memory
- Checkout displays a demo message and does not charge the customer
- No payment gateway is connected
- No inventory or order database is connected
- Newsletter form does not store or send email addresses
- Shipping, exchange, contact and order-tracking pages are placeholders
- No product-detail route is included yet
- No admin panel or content-management system is included
- No WhatsApp ordering workflow is connected
- Product images and catalogue values are placeholders

## Production implementation plan

### Phase 1 — Final catalogue and brand assets

1. Replace the temporary logo with the official brand logo.
2. Import original product photos and videos.
3. Confirm categories, SKUs, sizes, prices, stock and descriptions.
4. Confirm shipping, exchange, privacy and terms policies.
5. Replace all demonstration claims with approved business information.

### Phase 2 — Complete shopping experience

1. Add product-detail pages.
2. Add size and colour selection.
3. Persist wishlist and cart.
4. Add address and checkout flows.
5. Add coupon and shipping calculations.
6. Add order confirmation and order tracking.

### Phase 3 — Commerce integrations

Recommended India-focused integrations:

- Payments: Razorpay or Cashfree
- Shipping: Shiprocket or direct courier integration
- Customer communication: WhatsApp Business API and transactional email
- Analytics: Google Analytics 4 and Meta Pixel
- Error monitoring: Sentry
- Product/order database: PostgreSQL or a suitable managed commerce backend
- Image storage: Cloudflare R2, Amazon S3 or an equivalent object store

### Phase 4 — Admin and operations

1. Product and inventory management
2. Order dashboard
3. Returns and exchanges
4. Discount and coupon management
5. Homepage banners and collection management
6. Customer management
7. Sales, conversion and product-performance reporting
8. Role-based access for the owner and staff

## Recommended launch checklist

- Confirm legal business name, address and GST details
- Add official support phone number, WhatsApp number and email
- Publish privacy, terms, shipping, cancellation and exchange policies
- Configure a production domain
- Add a branded email address
- Validate all pricing and tax calculations
- Test payment success, failure and refund paths
- Test shipping serviceability and tracking
- Compress final catalogue imagery
- Add SEO titles and descriptions for every product
- Add analytics and conversion tracking with consent handling
- Test across common Android, iPhone, tablet and desktop sizes
- Complete accessibility, performance and security reviews
- Run test orders before public launch

## Current design direction

- Primary fashion-commerce accent: pink (`#ff3f6c`)
- HOUSEOFPASHM brand tone: wine (`#6e1931`)
- Supporting palette: cream, white and charcoal
- Heading style: editorial serif
- Interface style: compact, high-density commerce navigation
- Brand mood: contemporary Kashmir, premium but accessible, handcrafted and PAN-India

## Ownership and next edit location

The main storefront can be updated through two files:

- `app/page.tsx` for copy, products, images and interactions
- `app/globals.css` for layout, colours, responsive rules and visual styling

This handover represents the complete demo version approved for its current visual direction. Production commerce functionality should be implemented only after the final catalogue, policies, operations flow and preferred integrations are confirmed.

## Instructions for the next coding agent

Give the ZIP and this Markdown file to the coding agent together. The ZIP is the source of truth. The agent must continue from the included codebase instead of generating a new project or visually approximating the website from this document.

Use the following instruction:

> You are taking ownership of the HOUSEOFPASHM storefront. Extract the supplied ZIP and treat the included source code as the authoritative implementation. Do not initialize a replacement project, change the framework, remove hosting configuration, substitute the design, or rebuild the page from memory. First read `HOUSEOFPASHM_DEMO_HANDOVER.md`, `package.json`, `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `vite.config.ts`, and `.openai/hosting.json`. Run `npm ci`, then run the existing application and verify the current output before making changes. Preserve the present visual design, responsive behaviour, catalogue interactions, wishlist, bag, search, category filters, sorting, brand story, mobile navigation and metadata unless a requested change explicitly requires modifying them. Make changes incrementally, keep TypeScript valid, test desktop and mobile layouts, and run `npm run build` before handing the project back. Do not claim production readiness until real catalogue data, brand-owned imagery, payments, inventory, orders, authentication, shipping, policies and analytics have been connected and tested.

### Reproduction procedure

1. Extract `houseofpashm.zip` into a new project directory.
2. Keep all hidden included files, especially `.openai/hosting.json`, `.npmrc` and `.gitignore`.
3. Use Node.js 22.13 or newer.
4. Run `npm ci` without replacing the lockfile.
5. Run `npm run dev` and open the local URL printed by the development server.
6. Verify the acceptance criteria below.
7. Run `npm run build` before deployment or handover.

### Acceptance criteria for the same output

- The page title is `HOUSEOFPASHM | Crafted in the Valley`.
- The top announcement bar, sticky navigation, logo, search box, profile, wishlist and bag controls are visible.
- The first viewport contains the cream editorial hero and navy embroidered fashion image.
- The hero contains `Crafted in the valley. Styled for everywhere.` and the `UP TO 40% OFF` badge.
- Six circular category cards are displayed.
- The product catalogue initially displays ten demo products.
- Searching for `stole` displays two products.
- Category chips filter the product list.
- Price and rating sorting change product order.
- Clicking the heart toggles its saved state and updates the wishlist count.
- Opening Wishlist displays saved products or the empty-wishlist state.
- Clicking `ADD TO BAG` opens the bag drawer and updates its count and total.
- Items can be removed from the bag.
- The craftsmanship story, newsletter and footer sections are present.
- Desktop, tablet and mobile layouts remain usable without horizontal page overflow.
- The mobile layout shows a navigation drawer and two-column product grid.
- `npm run build` completes successfully.

### Files and folders that must not be removed

- `app/`
- `build/`
- `db/`
- `drizzle/`
- `examples/`
- `public/`
- `scripts/`
- `tests/`
- `worker/`
- `.openai/hosting.json`
- `.gitignore`
- `.npmrc`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `next.config.ts`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `drizzle.config.ts`
- `tsconfig.json`
- `HOUSEOFPASHM_DEMO_HANDOVER.md`

Generated folders such as `node_modules`, `dist`, `.vinext`, `.wrangler` and `.sites-runtime` are intentionally excluded from the ZIP. They must be regenerated through the included installation and build scripts, not copied from another machine.
