import { getStorefrontCatalog } from "../lib/catalog/service";
import Storefront from "./storefront";

export default async function Home() {
  const catalog = await getStorefrontCatalog();
  const supportWhatsapp = (process.env.SUPPORT_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  return <Storefront {...catalog} supportWhatsapp={supportWhatsapp} />;
}
