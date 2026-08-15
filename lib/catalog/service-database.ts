import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { productImages, products, productVariants } from "../../db/schema";
import type { StorefrontCatalog, StorefrontProduct } from "./types";

export async function getDatabaseCatalog(): Promise<StorefrontCatalog> {
  const db = await getDb();
  const rows = await db
    .select({
      productId: products.id,
      name: products.name,
      category: products.category,
      description: products.description,
      fabric: products.fabric,
      embroidery: products.embroidery,
      variantId: productVariants.id,
      colour: productVariants.colour,
      size: productVariants.size,
      pricePaise: productVariants.pricePaise,
      mrpPaise: productVariants.mrpPaise,
      stockQuantity: productVariants.stockQuantity,
      lowStockThreshold: productVariants.lowStockThreshold,
      storageKey: productImages.storageKey,
      sourceImageUrl: productImages.sourceAssetUrl,
    })
    .from(products)
    .innerJoin(
      productVariants,
      and(
        eq(productVariants.productId, products.id),
        eq(productVariants.active, true),
      ),
    )
    .leftJoin(
      productImages,
      and(
        eq(productImages.variantId, productVariants.id),
        eq(productImages.sortOrder, 1),
      ),
    )
    .where(eq(products.status, "active"))
    .orderBy(asc(products.name), asc(productVariants.id));

  const byProduct = new Map<string, StorefrontProduct>();
  for (const row of rows) {
    const image = resolveImageUrl(row.storageKey, row.sourceImageUrl);
    if (!image) continue;
    const variant = {
      sku: row.variantId,
      colour: row.colour ?? undefined,
      size: row.size ?? undefined,
      price: row.pricePaise / 100,
      mrp: row.mrpPaise / 100,
      available: row.stockQuantity > 0,
    };
    const existing = byProduct.get(row.productId);
    if (existing) {
      existing.variants = [...(existing.variants ?? []), variant];
      existing.available ||= variant.available;
      continue;
    }
    const subtitle = [row.fabric, row.embroidery, row.description]
      .filter(Boolean)
      .slice(0, 2)
      .join(" • ");
    byProduct.set(row.productId, {
      id: row.productId,
      sku: row.variantId,
      slug: row.productId,
      name: row.name,
      category: row.category,
      subtitle,
      price: row.pricePaise / 100,
      mrp: row.mrpPaise / 100,
      badge:
        row.stockQuantity > 0 && row.stockQuantity <= row.lowStockThreshold
          ? "Only a few left"
          : undefined,
      image,
      colour: row.colour ?? undefined,
      size: row.size ?? undefined,
      available: row.stockQuantity > 0,
      variants: [variant],
    });
  }

  const catalogProducts = [...byProduct.values()];
  const categories = [...new Set(catalogProducts.map((product) => product.category))]
    .map((name) => ({
      name,
      image:
        catalogProducts.find((product) => product.category === name)?.image ?? "",
    }))
    .filter((category) => category.image);

  return { source: "database", products: catalogProducts, categories };
}

function resolveImageUrl(storageKey: string | null, sourceUrl: string | null) {
  if (storageKey) {
    const baseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl) {
      throw new Error(
        "R2_PUBLIC_BASE_URL is required when catalogue images use storage keys.",
      );
    }
    return `${baseUrl}/${storageKey.replace(/^\//, "")}`;
  }
  return sourceUrl;
}
