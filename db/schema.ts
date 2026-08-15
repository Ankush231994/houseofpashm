import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
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
    reason: text("reason", { enum: ["catalog_import", "manual", "reserve", "release", "sale", "return", "correction"] })
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

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    status: text("status", {
      enum: [
        "pending_payment", "payment_processing", "paid", "packing", "shipped",
        "delivered", "cancelled", "refund_pending", "refunded", "payment_failed", "expired",
      ],
    }).notNull().default("pending_payment"),
    paymentStatus: text("payment_status", {
      enum: ["created", "verified", "captured", "failed", "refund_pending", "refunded"],
    }).notNull().default("created"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull().default("IN"),
    subtotalPaise: integer("subtotal_paise").notNull(),
    shippingPaise: integer("shipping_paise").notNull(),
    taxPaise: integer("tax_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    currency: text("currency").notNull().default("INR"),
    gatewayOrderId: text("gateway_order_id"),
    gatewayPaymentId: text("gateway_payment_id"),
    reservationExpiresAt: integer("reservation_expires_at", { mode: "timestamp" }).notNull(),
    trackingProvider: text("tracking_provider"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    customerNote: text("customer_note"),
    operatorNote: text("operator_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    shippedAt: integer("shipped_at", { mode: "timestamp" }),
    deliveredAt: integer("delivered_at", { mode: "timestamp" }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    uniqueIndex("orders_gateway_order_unique").on(table.gatewayOrderId),
    index("orders_status_created_idx").on(table.status, table.createdAt),
    index("orders_customer_email_idx").on(table.customerEmail),
    check(
      "orders_totals_valid",
      sql`${table.subtotalPaise} >= 0 and ${table.shippingPaise} >= 0 and ${table.taxPaise} >= 0 and ${table.totalPaise} = ${table.subtotalPaise} + ${table.shippingPaise} + ${table.taxPaise}`,
    ),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
    variantId: text("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    colour: text("colour"),
    size: text("size"),
    imageUrl: text("image_url"),
    unitPricePaise: integer("unit_price_paise").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalPaise: integer("line_total_paise").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    check("order_items_quantity_valid", sql`${table.quantity} > 0 and ${table.quantity} <= 10`),
    check("order_items_total_valid", sql`${table.unitPricePaise} >= 0 and ${table.lineTotalPaise} = ${table.unitPricePaise} * ${table.quantity}`),
  ],
);

export const inventoryReservations = sqliteTable(
  "inventory_reservations",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    variantId: text("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    status: text("status", { enum: ["active", "sold", "released"] }).notNull().default("active"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("inventory_reservations_order_variant_unique").on(table.orderId, table.variantId),
    index("inventory_reservations_status_expiry_idx").on(table.status, table.expiresAt),
    check("inventory_reservations_quantity_valid", sql`${table.quantity} > 0 and ${table.quantity} <= 10`),
  ],
);

export const paymentAttempts = sqliteTable(
  "payment_attempts",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    gatewayOrderId: text("gateway_order_id").notNull(),
    gatewayPaymentId: text("gateway_payment_id"),
    status: text("status", { enum: ["created", "verified", "captured", "failed", "refunded"] }).notNull(),
    amountPaise: integer("amount_paise").notNull(),
    signatureVerified: integer("signature_verified", { mode: "boolean" }).notNull().default(false),
    errorCode: text("error_code"),
    errorDescription: text("error_description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("payment_attempts_order_idx").on(table.orderId, table.createdAt),
    uniqueIndex("payment_attempts_gateway_payment_unique").on(table.gatewayPaymentId),
    check("payment_attempts_amount_valid", sql`${table.amountPaise} >= 0`),
  ],
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: text("status", { enum: ["received", "processed", "ignored", "failed"] }).notNull().default("received"),
    errorMessage: text("error_message"),
    createdAt: createdAt(),
    processedAt: integer("processed_at", { mode: "timestamp" }),
  },
  (table) => [index("webhook_events_status_created_idx").on(table.status, table.createdAt)],
);

export const orderStatusEvents = sqliteTable(
  "order_status_events",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actor: text("actor").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [index("order_status_events_order_idx").on(table.orderId, table.createdAt)],
);

export const adminAuditEntries = sqliteTable(
  "admin_audit_entries",
  {
    id: text("id").primaryKey(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    summary: text("summary").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("admin_audit_entity_idx").on(table.entityType, table.entityId, table.createdAt)],
);
