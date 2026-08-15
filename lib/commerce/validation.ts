import type { CheckoutIssue, CheckoutRequest } from "./types";

const INDIAN_STATES = new Set([
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
]);

export const indianStates = [...INDIAN_STATES];

export function parseCheckoutRequest(value: unknown): { request: CheckoutRequest | null; issues: CheckoutIssue[] } {
  const issues: CheckoutIssue[] = [];
  if (!value || typeof value !== "object") return { request: null, issues: [{ field: "request", message: "Checkout details are required." }] };
  const input = value as { items?: unknown; customer?: unknown };
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 25) issues.push({ field: "items", message: "Add between 1 and 25 variants." });
  const items = Array.isArray(input.items) ? input.items.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") { issues.push({ field: `items.${index}`, message: "Invalid cart line." }); return []; }
    const line = entry as { sku?: unknown; quantity?: unknown };
    const sku = typeof line.sku === "string" ? line.sku.trim().toUpperCase() : "";
    const quantity = Number(line.quantity);
    if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(sku)) issues.push({ field: `items.${index}.sku`, message: "Invalid SKU." });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) issues.push({ field: `items.${index}.quantity`, message: "Quantity must be from 1 to 10." });
    return sku && Number.isInteger(quantity) ? [{ sku, quantity }] : [];
  }) : [];
  if (new Set(items.map((item) => item.sku)).size !== items.length) issues.push({ field: "items", message: "Combine duplicate SKU lines before checkout." });

  if (!input.customer || typeof input.customer !== "object") return { request: null, issues: [...issues, { field: "customer", message: "Delivery details are required." }] };
  const customer = input.customer as Record<string, unknown>;
  const text = (field: string, max: number) => {
    const result = typeof customer[field] === "string" ? customer[field].trim().replace(/\s+/g, " ") : "";
    if (!result || result.length > max) issues.push({ field: `customer.${field}`, message: `Enter ${field} using at most ${max} characters.` });
    return result;
  };
  const name = text("name", 100); const addressLine1 = text("addressLine1", 160); const city = text("city", 80); const state = text("state", 80);
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.replace(/\D/g, "") : "";
  const postalCode = typeof customer.postalCode === "string" ? customer.postalCode.trim() : "";
  const addressLine2 = typeof customer.addressLine2 === "string" ? customer.addressLine2.trim().slice(0, 160) : "";
  const note = typeof customer.note === "string" ? customer.note.trim().slice(0, 500) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) issues.push({ field: "customer.email", message: "Enter a valid email address." });
  if (!/^[6-9]\d{9}$/.test(phone)) issues.push({ field: "customer.phone", message: "Enter a valid 10-digit Indian mobile number." });
  if (!/^[1-9][0-9]{5}$/.test(postalCode)) issues.push({ field: "customer.postalCode", message: "Enter a valid 6-digit Indian PIN code." });
  if (!INDIAN_STATES.has(state)) issues.push({ field: "customer.state", message: "Select a valid Indian state or union territory." });
  if (customer.country !== "IN") issues.push({ field: "customer.country", message: "Only Indian delivery addresses are supported." });
  if (issues.length) return { request: null, issues };
  return { request: { items, customer: { name, email, phone, addressLine1, addressLine2: addressLine2 || undefined, city, state, postalCode, country: "IN", note: note || undefined } }, issues };
}
