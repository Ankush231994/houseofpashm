import Checkout from "./checkout";

export default function CheckoutPage() {
  const whatsapp = (process.env.SUPPORT_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  return <Checkout supportWhatsapp={whatsapp} />;
}
