"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "../../lib/cart";
import { indianStates } from "../../lib/commerce/validation";

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open(): void; on(event: string, callback: (response: unknown) => void): void } } }

type StartedOrder = { orderId: string; orderNumber: string; gatewayOrderId: string; amountPaise: number; currency: string; keyId: string; expiresAt: string; mockPayment?: { paymentId: string; signature: string }; totals?: { subtotalPaise: number; shippingPaise: number; totalPaise: number } };

export default function Checkout({ supportWhatsapp }: { supportWhatsapp: string }) {
  const cart = useCart();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [complete, setComplete] = useState<{ orderNumber: string; status: string } | null>(null); const [pending, setPending] = useState<StartedOrder | null>(null);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "Maharashtra", postalCode: "", country: "IN", note: "" });
  const update = (field: string, value: string) => setCustomer((current) => ({ ...current, [field]: value }));

  async function begin(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: cart.items.map((item) => ({ sku: item.sku, quantity: item.quantity })), customer }) });
      const body = await response.json() as StartedOrder & { error?: string; issues?: Array<{ field: string; message: string }> };
      if (!response.ok) throw new Error(body.issues?.map((issue) => issue.message).join(" ") || body.error || "Checkout failed.");
      setPending(body);
      if (body.mockPayment) await verify(body, { razorpay_order_id: body.gatewayOrderId, razorpay_payment_id: body.mockPayment.paymentId, razorpay_signature: body.mockPayment.signature });
      else await openRazorpay(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout failed."); } finally { setBusy(false); }
  }

  async function openRazorpay(order: StartedOrder) {
    await loadRazorpay();
    if (!window.Razorpay) throw new Error("Razorpay Checkout did not load.");
    const checkout = new window.Razorpay({ key: order.keyId, amount: order.amountPaise, currency: order.currency, name: "HOUSEOFPASHM", description: order.orderNumber, order_id: order.gatewayOrderId, prefill: { name: customer.name, email: customer.email, contact: customer.phone }, handler: (response: unknown) => verify(order, response as Record<string, string>), modal: { ondismiss: () => setError("Payment was not completed. Your stock is reserved briefly; use Retry payment.") } });
    checkout.on("payment.failed", () => setError("Payment failed. You can retry while the reservation is active."));
    checkout.open();
  }

  async function verify(order: StartedOrder, payment: Record<string, string>) {
    const response = await fetch("/api/payments/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: order.orderId, ...payment }) });
    const body = await response.json() as { error?: string; orderNumber?: string; status?: string };
    if (!response.ok) throw new Error(body.error || "Payment verification failed.");
    cart.clearCart(); setComplete({ orderNumber: body.orderNumber ?? order.orderNumber, status: body.status ?? "payment_processing" });
  }

  async function retry() {
    if (!pending) return; setBusy(true); setError("");
    try { const response = await fetch("/api/checkout/retry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: pending.orderId, email: customer.email }) }); const body = await response.json() as StartedOrder & { error?: string }; if (!response.ok) throw new Error(body.error || "Retry failed."); setPending(body); if (body.mockPayment) await verify(body, { razorpay_order_id: body.gatewayOrderId, razorpay_payment_id: body.mockPayment.paymentId, razorpay_signature: body.mockPayment.signature }); else await openRazorpay(body); } catch (cause) { setError(cause instanceof Error ? cause.message : "Retry failed."); } finally { setBusy(false); }
  }

  if (complete) return <main className="checkout-page"><section className="checkout-complete"><span>ORDER RECEIVED</span><h1>Thank you.</h1><p>Your order number is <b>{complete.orderNumber}</b>.</p><p>{complete.status === "paid" ? "The rehearsal payment is complete." : "Your payment callback is verified. Final confirmation follows the secure payment webhook."}</p><Link href="/">CONTINUE SHOPPING</Link></section></main>;
  return <main className="checkout-page"><header className="simple-header"><Link className="brand" href="/"><span className="brand-mark">H</span><span><b>HOUSEOF</b><em>PASHM</em></span></Link><span>SECURE GUEST CHECKOUT</span></header><div className="checkout-grid"><form className="checkout-form" onSubmit={begin}><span className="eyebrow">DELIVERY DETAILS</span><h1>Where should we send it?</h1><div className="form-grid"><label>Full name<input required autoComplete="name" value={customer.name} onChange={(e)=>update("name",e.target.value)}/></label><label>Email<input required type="email" autoComplete="email" value={customer.email} onChange={(e)=>update("email",e.target.value)}/></label><label>Mobile number<input required inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" value={customer.phone} onChange={(e)=>update("phone",e.target.value)}/></label><label className="wide">Address line 1<input required autoComplete="address-line1" value={customer.addressLine1} onChange={(e)=>update("addressLine1",e.target.value)}/></label><label className="wide">Address line 2 (optional)<input autoComplete="address-line2" value={customer.addressLine2} onChange={(e)=>update("addressLine2",e.target.value)}/></label><label>City<input required autoComplete="address-level2" value={customer.city} onChange={(e)=>update("city",e.target.value)}/></label><label>State<select required autoComplete="address-level1" value={customer.state} onChange={(e)=>update("state",e.target.value)}>{indianStates.map((state)=><option key={state}>{state}</option>)}</select></label><label>PIN code<input required inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{5}" value={customer.postalCode} onChange={(e)=>update("postalCode",e.target.value)}/></label><label className="wide">Order note (optional)<textarea maxLength={500} value={customer.note} onChange={(e)=>update("note",e.target.value)}/></label></div><label className="checkout-consent"><input type="checkbox" required/> I agree to the <Link href="/policies/terms">terms</Link>, <Link href="/policies/privacy">privacy policy</Link> and applicable <Link href="/policies/returns">return policy</Link>.</label>{error&&<p className="checkout-error" role="alert">{error}</p>}<button className="pay-button" disabled={busy||!cart.items.length}>{busy?"PLEASE WAIT…":"CONTINUE TO SECURE PAYMENT"}</button>{pending&&error&&<button type="button" className="retry-button" onClick={retry} disabled={busy}>RETRY PAYMENT</button>}</form><aside className="checkout-summary"><h2>Your order</h2>{cart.items.map((item)=><div className="checkout-item" key={item.sku}><img src={item.image} alt=""/><div><b>{item.name}</b><span>{item.size??item.sku} × {item.quantity}</span></div><strong>₹{(item.unitPrice*item.quantity).toLocaleString("en-IN")}</strong></div>)}<div className="summary-total"><span>Displayed subtotal</span><b>₹{cart.displaySubtotal.toLocaleString("en-IN")}</b></div><small>The server reloads current price, stock and shipping before payment.</small>{supportWhatsapp&&<a className="whatsapp-help" href={`https://wa.me/${supportWhatsapp}?text=${encodeURIComponent("Hello HOUSEOFPASHM, I need help with checkout.")}`} target="_blank" rel="noreferrer">GET HELP ON WHATSAPP</a>}</aside></div></main>;
}

function loadRazorpay() { return new Promise<void>((resolve, reject) => { if (window.Razorpay) return resolve(); const script=document.createElement("script"); script.src="https://checkout.razorpay.com/v1/checkout.js"; script.onload=()=>resolve(); script.onerror=()=>reject(new Error("Unable to load secure payment checkout.")); document.head.appendChild(script); }); }
