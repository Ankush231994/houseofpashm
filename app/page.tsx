import { getStorefrontCatalog } from "../lib/catalog/service";
import Storefront from "./storefront";

export default async function Home() {
  const catalog = await getStorefrontCatalog();
  return <Storefront {...catalog} />;
}
