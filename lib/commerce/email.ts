import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { orderItems, orders } from "../../db/schema";
import { formatInr } from "./money";

export async function sendOrderEmail(orderId: string, event: "paid" | "shipped" | "delivered" | "refunded") {
  const mode = process.env.EMAIL_MODE ?? "disabled";
  if (mode === "disabled") return { sent: false, reason: "EMAIL_MODE is disabled." };
  if (mode !== "resend") throw new Error("EMAIL_MODE must be disabled or resend.");
  const apiKey = required("RESEND_API_KEY"); const from = required("EMAIL_FROM");
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found for email.");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const title = event === "paid" ? "Payment confirmed" : event === "shipped" ? "Your order has shipped" : event === "delivered" ? "Order delivered" : "Refund recorded";
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [order.customerEmail], subject: `${title} — ${order.orderNumber}`, html: `<h1>${escapeHtml(title)}</h1><p>Hi ${escapeHtml(order.customerName)},</p><p>Order <strong>${escapeHtml(order.orderNumber)}</strong> is now ${escapeHtml(event)}.</p><ul>${items.map((item) => `<li>${escapeHtml(item.productName)} × ${item.quantity} — ${escapeHtml(formatInr(item.lineTotalPaise))}</li>`).join("")}</ul><p>Total: <strong>${escapeHtml(formatInr(order.totalPaise))}</strong></p>${order.trackingNumber ? `<p>Tracking: ${escapeHtml(order.trackingProvider ?? "Courier")} — ${escapeHtml(order.trackingNumber)}</p>` : ""}<p>Need help? Contact ${escapeHtml(process.env.SUPPORT_EMAIL ?? "the store operator")}.</p>` }) });
  if (!response.ok) throw new Error(`Resend returned ${response.status}.`);
  return { sent: true };
}

function required(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is not configured.`); return value; }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }
