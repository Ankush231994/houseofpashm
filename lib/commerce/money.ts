import type { CheckoutTotals, PricedLine } from "./types";

export function calculateTotals(lines: PricedLine[], flatShippingPaise: number, freeShippingThresholdPaise: number): CheckoutTotals {
  if (!Number.isInteger(flatShippingPaise) || flatShippingPaise < 0) throw new Error("Shipping rate is invalid.");
  if (!Number.isInteger(freeShippingThresholdPaise) || freeShippingThresholdPaise < 0) throw new Error("Free-shipping threshold is invalid.");
  const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  const shippingPaise = subtotalPaise >= freeShippingThresholdPaise ? 0 : flatShippingPaise;
  const taxPaise = 0;
  return { subtotalPaise, shippingPaise, taxPaise, totalPaise: subtotalPaise + shippingPaise + taxPaise, currency: "INR" };
}

export function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}
