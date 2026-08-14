import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const createdAt = () => integer("created_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);

const updatedAt = () => integer("updated_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status", { enum: ["draft", "active", "inactive"] })
      .notNull()
      .default("draft"),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    description: text("description").notNull().default(""),
    fabric: text("fabric"),
    embroidery: text("embroidery"),
    careInstructions: text("care_instructions"),
    taxClassification: text("tax_classification"),
    taxRateBasisPoints: integer("tax_rate_basis_points"),
    operatorVerified: integer("operator_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    sourceCatalogUrl: text("source_catalog_url"),
    sourceInstagramUrl: text("source_instagram_url"),
    sourcePostUrl: text("source_post_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("products_status_category_idx").on(table.status, table.category),
    check(
      "products_tax_rate_valid",
      sql`${table.taxRateBasisPoints} is null or (${table.taxRateBasisPoints} >= 0 and ${table.taxRateBasisPoints} <= 10000)`,
    ),
  ],
);

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    colour: text("colour"),
    size: text("size"),
    pricePaise: integer("price_paise").notNull(),
    mrpPaise: integer("mrp_paise").notNull(),
    currency: text("currency").notNull().default("INR"),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
    weightGrams: integer("weight_grams"),
    lengthMm: integer("length_mm"),
    widthMm: integer("width_mm"),
    heightMm: integer("height_mm"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("product_variants_product_idx").on(table.productId),
    check("product_variants_price_valid", sql`${table.pricePaise} >= 0`),
    check(
      "product_variants_mrp_valid",
      sql`${table.mrpPaise} >= ${table.pricePaise}`,
    ),
    check(
      "product_variants_stock_valid",
      sql`${table.stockQuantity} >= 0 and ${table.lowStockThreshold} >= 0`,
    ),
  ],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    sortOrder: integer("sort_order").notNull().default(1),
    filename: text("filename"),
    altText: text("alt_text").notNull(),
    sourcePageUrl: text("source_page_url"),
    sourceAssetUrl: text("source_asset_url"),
    storageKey: text("storage_key"),
    ownershipConfirmed: integer("ownership_confirmed", { mode: "boolean" })
      .notNull()
      .default(false),
    operatorVerified: integer("operator_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("product_images_product_order_idx").on(
      table.productId,
      table.sortOrder,
    ),
    check("product_images_order_valid", sql`${table.sortOrder} > 0`),
    check(
      "product_images_location_present",
      sql`${table.sourceAssetUrl} is not null or ${table.storageKey} is not null`,
    ),
  ],
);

export const catalogImports = sqliteTable("catalog_imports", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["started", "completed", "failed"] })
    .notNull()
    .default("started"),
  createdBy: text("created_by").notNull(),
  productRowCount: integer("product_row_count").notNull().default(0),
  imageRowCount: integer("image_row_count").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: createdAt(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const inventoryMovements = sqliteTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    resultingQuantity: integer("resulting_quantity").notNull(),
    reason: text("reason", { enum: ["catalog_import", "manual", "sale", "return", "correction"] })
      .notNull(),
    importId: text("import_id").references(() => catalogImports.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [
    index("inventory_movements_variant_created_idx").on(
      table.variantId,
      table.createdAt,
    ),
    check(
      "inventory_movements_quantity_valid",
      sql`${table.resultingQuantity} >= 0`,
    ),
  ],
);
