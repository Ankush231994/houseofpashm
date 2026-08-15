import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getAdminAccess } from "../lib/admin-auth.ts";
import { parseCsv } from "../lib/catalog/csv.ts";
import { validateCatalogCsvs } from "../lib/catalog/validation.ts";

const productsPath = new URL("../catalog/products.csv", import.meta.url);
const imagesPath = new URL("../catalog/product-images.csv", import.meta.url);

async function currentCatalog() {
  const [productsCsv, imagesCsv] = await Promise.all([
    readFile(productsPath, "utf8"),
    readFile(imagesPath, "utf8"),
  ]);
  return { productsCsv, imagesCsv };
}

test("the checked-in catalogue validates and keeps all ten demo SKUs", async () => {
  const { productsCsv, imagesCsv } = await currentCatalog();
  const plan = validateCatalogCsvs(productsCsv, imagesCsv);

  assert.deepEqual(plan.issues, []);
  assert.equal(plan.products.length, 10);
  assert.equal(plan.images.length, 10);
  assert.equal(new Set(plan.products.map((row) => row.sku)).size, 10);
});

test("CSV parsing supports quoted commas, escaped quotes and line breaks", () => {
  const parsed = parseCsv('sku,description\r\nABC-1,"A, ”""special""” item\nwith two lines"');

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].sku, "ABC-1");
  assert.match(parsed.rows[0].description, /two lines/);
});

test("an active SKU cannot pass without an owned and verified image", async () => {
  const { productsCsv, imagesCsv } = await currentCatalog();
  const activeProducts = productsCsv
    .replace('"draft","Suit Sets"', '"active","Suit Sets"')
    .replace('"no","Demo placeholder product', '"yes","Demo placeholder product');
  const plan = validateCatalogCsvs(activeProducts, imagesCsv);

  assert.ok(plan.issues.some((entry) => entry.message.includes("owned and operator-verified image")));
});

test("duplicate SKU values are rejected", async () => {
  const { productsCsv, imagesCsv } = await currentCatalog();
  const lines = productsCsv.trimEnd().split(/\r?\n/);
  const duplicate = `${productsCsv.trimEnd()}\n${lines[1]}\n`;
  const plan = validateCatalogCsvs(duplicate, imagesCsv);

  assert.ok(plan.issues.some((entry) => entry.field === "sku" && entry.message === "SKU must be unique."));
});

test("invalid prices and non-HTTPS source URLs are rejected", async () => {
  const { productsCsv, imagesCsv } = await currentCatalog();
  const malformed = productsCsv.replace('"2499","3999"', '"-1","3999"');
  const insecureImages = imagesCsv
    .replace('"https://houseofkari.in/', '"http://houseofkari.in/')
    .replace('"1",""', '"1","../evil.jpg"');
  const plan = validateCatalogCsvs(malformed, insecureImages);

  assert.ok(plan.issues.some((entry) => entry.field === "selling_price_inr"));
  assert.ok(plan.issues.some((entry) => entry.field === "source_page_url"));
  assert.ok(plan.issues.some((entry) => entry.field === "image_filename"));
});

test("admin access fails closed without an operator allowlist", async () => {
  const previousEmails = process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS;
  try {
    const access = await getAdminAccess(new Headers());
    assert.equal(access.allowed, false);
    assert.equal(access.configured, false);
  } finally {
    if (previousEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousEmails;
  }
});

test("local admin mode accepts only an allowed email outside production", async () => {
  const previousEmails = process.env.ADMIN_EMAILS;
  const previousMode = process.env.ADMIN_AUTH_MODE;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAppEnv = process.env.APP_ENV;
  process.env.ADMIN_EMAILS = "owner@example.com,operator@example.com";
  process.env.ADMIN_AUTH_MODE = "local";
  Reflect.set(process.env, "NODE_ENV", "test");
  process.env.APP_ENV = "local";
  try {
    const allowed = await getAdminAccess(new Headers({
      "x-houseofpashm-admin-email": "operator@example.com",
    }));
    const denied = await getAdminAccess(new Headers({
      "x-houseofpashm-admin-email": "stranger@example.com",
    }));
    assert.equal(allowed.allowed, true);
    assert.equal(denied.allowed, false);
  } finally {
    if (previousEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousEmails;
    if (previousMode === undefined) delete process.env.ADMIN_AUTH_MODE;
    else process.env.ADMIN_AUTH_MODE = previousMode;
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    if (previousAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = previousAppEnv;
  }
});

test("Cloudflare admin mode rejects spoofed identity headers without a valid JWT", async () => {
  const previous = { emails: process.env.ADMIN_EMAILS, mode: process.env.ADMIN_AUTH_MODE, team: process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN, audience: process.env.CLOUDFLARE_ACCESS_AUD };
  process.env.ADMIN_EMAILS = "owner@example.com"; process.env.ADMIN_AUTH_MODE = "cloudflare-access"; process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN = "https://example.cloudflareaccess.com"; process.env.CLOUDFLARE_ACCESS_AUD = "expected-audience";
  try {
    const access = await getAdminAccess(new Headers({ "cf-access-authenticated-user-email": "owner@example.com", "cf-access-jwt-assertion": "not-a-valid-jwt" }));
    assert.equal(access.allowed, false);
  } finally {
    restoreEnv("ADMIN_EMAILS", previous.emails); restoreEnv("ADMIN_AUTH_MODE", previous.mode); restoreEnv("CLOUDFLARE_ACCESS_TEAM_DOMAIN", previous.team); restoreEnv("CLOUDFLARE_ACCESS_AUD", previous.audience);
  }
});

function restoreEnv(name: string, value: string | undefined) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
