import { demoCatalog } from "./demo";
import type { StorefrontCatalog } from "./types";

export async function getStorefrontCatalog(): Promise<StorefrontCatalog> {
  if (process.env.CATALOG_SOURCE !== "database") return demoCatalog;
  const { getDatabaseCatalog } = await import("./service-database");
  return getDatabaseCatalog();
}
