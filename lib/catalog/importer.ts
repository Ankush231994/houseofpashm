import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  catalogImports,
  inventoryMovements,
  productImages,
  products,
  productVariants,
} from "../../db/schema";
import type { CatalogImportPlan, ProductImportRow } from "./validation";

export async function importCatalog(
  plan: CatalogImportPlan,
  createdBy: string,
) {
  if (plan.issues.length) {
    throw new Error("Catalogue import cannot run while validation issues exist.");
  }
  if (!plan.products.length) throw new Error("Catalogue import contains no products.");

  const db = await getDb();
  const importId = crypto.randomUUID();
  const now = new Date();
  await db.insert(catalogImports).values({
    id: importId,
    createdBy,
    status: "started",
    productRowCount: plan.products.length,
    imageRowCount: plan.images.length,
  });

  try {
    const productBySlug = uniqueProductsBySlug(plan.products);
    for (const product of productBySlug.values()) {
      await db
        .insert(products)
        .values({
          id: product.slug,
          name: product.name,
          status: product.status,
          category: product.category,
          subcategory: product.subcategory,
          description: product.description,
          fabric: product.fabric,
          embroidery: product.embroidery,
          careInstructions: product.careInstructions,
          taxClassification: product.taxClassification,
          taxRateBasisPoints: product.taxRateBasisPoints,
          operatorVerified: product.operatorVerified,
          sourceCatalogUrl: product.sourceCatalogUrl,
          sourceInstagramUrl: product.sourceInstagramUrl,
          sourcePostUrl: product.sourcePostUrl,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: products.id,
          set: {
            name: product.name,
            status: product.status,
            category: product.category,
            subcategory: product.subcategory,
            description: product.description,
            fabric: product.fabric,
            embroidery: product.embroidery,
            careInstructions: product.careInstructions,
            taxClassification: product.taxClassification,
            taxRateBasisPoints: product.taxRateBasisPoints,
            operatorVerified: product.operatorVerified,
            sourceCatalogUrl: product.sourceCatalogUrl,
            sourceInstagramUrl: product.sourceInstagramUrl,
            sourcePostUrl: product.sourcePostUrl,
            updatedAt: now,
          },
        });
    }

    const existingRows = await db
      .select({ id: productVariants.id, stock: productVariants.stockQuantity })
      .from(productVariants)
      .where(inArray(productVariants.id, plan.products.map((row) => row.sku)));
    const existingStock = new Map(existingRows.map((row) => [row.id, row.stock]));

    for (const variant of plan.products) {
      await db
        .insert(productVariants)
        .values({
          id: variant.sku,
          productId: variant.slug,
          colour: variant.colour,
          size: variant.size,
          pricePaise: variant.pricePaise,
          mrpPaise: variant.mrpPaise,
          currency: variant.currency,
          stockQuantity: variant.stockQuantity,
          lowStockThreshold: variant.lowStockThreshold,
          weightGrams: variant.weightGrams,
          lengthMm: variant.lengthMm,
          widthMm: variant.widthMm,
          heightMm: variant.heightMm,
          active: variant.status !== "inactive",
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: productVariants.id,
          set: {
            productId: variant.slug,
            colour: variant.colour,
            size: variant.size,
            pricePaise: variant.pricePaise,
            mrpPaise: variant.mrpPaise,
            currency: variant.currency,
            stockQuantity: variant.stockQuantity,
            lowStockThreshold: variant.lowStockThreshold,
            weightGrams: variant.weightGrams,
            lengthMm: variant.lengthMm,
            widthMm: variant.widthMm,
            heightMm: variant.heightMm,
            active: variant.status !== "inactive",
            updatedAt: now,
          },
        });

      const previousStock = existingStock.get(variant.sku) ?? 0;
      const delta = variant.stockQuantity - previousStock;
      if (delta !== 0) {
        await db.insert(inventoryMovements).values({
          id: crypto.randomUUID(),
          variantId: variant.sku,
          delta,
          resultingQuantity: variant.stockQuantity,
          reason: "catalog_import",
          importId,
          createdBy,
          note: existingStock.has(variant.sku)
            ? "Stock updated by validated catalogue import."
            : "Initial stock created by validated catalogue import.",
        });
      }
    }

    const productSlugBySku = new Map(
      plan.products.map((row) => [row.sku, row.slug]),
    );
    for (const image of plan.images) {
      const productId = productSlugBySku.get(image.sku);
      if (!productId) throw new Error(`Image references unknown SKU ${image.sku}.`);
      const storageKey = image.filename ? `products/${image.filename}` : null;
      await db
        .insert(productImages)
        .values({
          id: image.id,
          productId,
          variantId: image.sku,
          sortOrder: image.sortOrder,
          filename: image.filename,
          altText: image.altText,
          sourcePageUrl: image.sourcePageUrl,
          sourceAssetUrl: image.sourceAssetUrl,
          storageKey,
          ownershipConfirmed: image.ownershipConfirmed,
          operatorVerified: image.operatorVerified,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: productImages.id,
          set: {
            productId,
            variantId: image.sku,
            sortOrder: image.sortOrder,
            filename: image.filename,
            altText: image.altText,
            sourcePageUrl: image.sourcePageUrl,
            sourceAssetUrl: image.sourceAssetUrl,
            storageKey,
            ownershipConfirmed: image.ownershipConfirmed,
            operatorVerified: image.operatorVerified,
            updatedAt: now,
          },
        });
    }

    await db
      .update(catalogImports)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(catalogImports.id, importId));
    return { importId, products: productBySlug.size, variants: plan.products.length, images: plan.images.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import failure";
    await db
      .update(catalogImports)
      .set({ status: "failed", errorMessage: message, completedAt: new Date() })
      .where(eq(catalogImports.id, importId));
    throw error;
  }
}

function uniqueProductsBySlug(rows: ProductImportRow[]) {
  const productsBySlug = new Map<string, ProductImportRow>();
  for (const row of rows) {
    if (!productsBySlug.has(row.slug)) productsBySlug.set(row.slug, row);
  }
  return productsBySlug;
}
