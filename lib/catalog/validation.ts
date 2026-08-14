import { CsvParseError, parseCsv } from "./csv.ts";

const productHeaders = [
  "sku", "product_name", "slug", "status", "category", "subcategory",
  "description", "selling_price_inr", "mrp_inr", "currency", "fabric",
  "embroidery", "care_instructions", "colour", "size", "stock_quantity",
  "low_stock_threshold", "weight_grams", "length_cm", "width_cm", "height_cm",
  "tax_classification", "tax_rate_percent", "source_catalog_url",
  "source_instagram_url", "source_post_url", "operator_verified", "notes",
] as const;

const imageHeaders = [
  "sku", "image_order", "image_filename", "alt_text", "source_page_url",
  "source_asset_url", "ownership_confirmed", "download_status",
  "operator_verified", "notes",
] as const;

export type CatalogIssue = {
  file: "products.csv" | "product-images.csv";
  row: number;
  field?: string;
  message: string;
};

export type ProductImportRow = {
  row: number;
  sku: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "inactive";
  category: string;
  subcategory: string | null;
  description: string;
  pricePaise: number;
  mrpPaise: number;
  currency: "INR";
  fabric: string | null;
  embroidery: string | null;
  careInstructions: string | null;
  colour: string | null;
  size: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  taxClassification: string | null;
  taxRateBasisPoints: number | null;
  sourceCatalogUrl: string | null;
  sourceInstagramUrl: string | null;
  sourcePostUrl: string | null;
  operatorVerified: boolean;
};

export type ImageImportRow = {
  row: number;
  id: string;
  sku: string;
  sortOrder: number;
  filename: string | null;
  altText: string;
  sourcePageUrl: string | null;
  sourceAssetUrl: string | null;
  ownershipConfirmed: boolean;
  operatorVerified: boolean;
};

export type CatalogImportPlan = {
  products: ProductImportRow[];
  images: ImageImportRow[];
  issues: CatalogIssue[];
};

export function validateCatalogCsvs(
  productsCsv: string,
  imagesCsv: string,
): CatalogImportPlan {
  const issues: CatalogIssue[] = [];
  const productRecords = parseDocument(
    "products.csv",
    productsCsv,
    productHeaders,
    issues,
  );
  const imageRecords = parseDocument(
    "product-images.csv",
    imagesCsv,
    imageHeaders,
    issues,
  );
  const products = productRecords.flatMap((record, index) =>
    normalizeProduct(record, index + 2, issues),
  );
  const images = imageRecords.flatMap((record, index) =>
    normalizeImage(record, index + 2, issues),
  );

  validateRelationships(products, images, issues);
  return { products, images, issues };
}

function parseDocument(
  file: CatalogIssue["file"],
  input: string,
  requiredHeaders: readonly string[],
  issues: CatalogIssue[],
) {
  try {
    const document = parseCsv(input);
    for (const header of requiredHeaders) {
      if (!document.headers.includes(header)) {
        issues.push({ file, row: 1, field: header, message: "Required column is missing." });
      }
    }
    const unexpected = document.headers.filter(
      (header) => !requiredHeaders.includes(header),
    );
    for (const header of unexpected) {
      issues.push({ file, row: 1, field: header, message: "Unexpected column." });
    }
    return issues.some((issue) => issue.file === file && issue.row === 1)
      ? []
      : document.rows;
  } catch (error) {
    issues.push({
      file,
      row: error instanceof CsvParseError ? error.row : 1,
      message: error instanceof Error ? error.message : "CSV could not be parsed.",
    });
    return [];
  }
}

function normalizeProduct(
  record: Record<string, string>,
  row: number,
  issues: CatalogIssue[],
): ProductImportRow[] {
  const file = "products.csv" as const;
  const sku = required(record, "sku", file, row, issues).toUpperCase();
  const name = required(record, "product_name", file, row, issues);
  const slug = required(record, "slug", file, row, issues).toLowerCase();
  const category = required(record, "category", file, row, issues);
  const statusValue = required(record, "status", file, row, issues).toLowerCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(sku)) {
    issue(issues, file, row, "sku", "Use 3–64 uppercase letters, numbers or hyphens.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issue(issues, file, row, "slug", "Use a lowercase hyphenated slug.");
  }
  if (!isStatus(statusValue)) {
    issue(issues, file, row, "status", "Use draft, active or inactive.");
  }

  const pricePaise = money(record.selling_price_inr, file, row, "selling_price_inr", issues);
  const mrpPaise = money(record.mrp_inr, file, row, "mrp_inr", issues);
  if (pricePaise !== null && mrpPaise !== null && mrpPaise < pricePaise) {
    issue(issues, file, row, "mrp_inr", "MRP must be at least the selling price.");
  }
  const currency = record.currency.toUpperCase();
  if (currency !== "INR") {
    issue(issues, file, row, "currency", "Only INR is supported for the India launch.");
  }
  const stock = integerValue(record.stock_quantity, file, row, "stock_quantity", issues, true) ?? 0;
  const threshold = integerValue(record.low_stock_threshold, file, row, "low_stock_threshold", issues, true) ?? 2;
  const operatorVerified = yesNo(record.operator_verified, file, row, "operator_verified", issues);
  const status = isStatus(statusValue) ? statusValue : "draft";
  if (status === "active") {
    if (!record.stock_quantity) issue(issues, file, row, "stock_quantity", "Active variants require stock.");
    if (!operatorVerified) issue(issues, file, row, "operator_verified", "Active products require operator verification.");
  }

  if (!sku || !name || !slug || !category || pricePaise === null || mrpPaise === null) return [];
  return [{
    row,
    sku,
    name,
    slug,
    status,
    category,
    subcategory: optional(record.subcategory),
    description: record.description,
    pricePaise,
    mrpPaise,
    currency: "INR",
    fabric: optional(record.fabric),
    embroidery: optional(record.embroidery),
    careInstructions: optional(record.care_instructions),
    colour: optional(record.colour),
    size: optional(record.size),
    stockQuantity: stock,
    lowStockThreshold: threshold,
    weightGrams: integerValue(record.weight_grams, file, row, "weight_grams", issues, true),
    lengthMm: centimetersToMillimeters(record.length_cm, file, row, "length_cm", issues),
    widthMm: centimetersToMillimeters(record.width_cm, file, row, "width_cm", issues),
    heightMm: centimetersToMillimeters(record.height_cm, file, row, "height_cm", issues),
    taxClassification: optional(record.tax_classification),
    taxRateBasisPoints: percentageToBasisPoints(record.tax_rate_percent, file, row, issues),
    sourceCatalogUrl: httpsUrl(record.source_catalog_url, file, row, "source_catalog_url", issues),
    sourceInstagramUrl: httpsUrl(record.source_instagram_url, file, row, "source_instagram_url", issues),
    sourcePostUrl: httpsUrl(record.source_post_url, file, row, "source_post_url", issues),
    operatorVerified,
  }];
}

function normalizeImage(
  record: Record<string, string>,
  row: number,
  issues: CatalogIssue[],
): ImageImportRow[] {
  const file = "product-images.csv" as const;
  const sku = required(record, "sku", file, row, issues).toUpperCase();
  const order = integerValue(record.image_order, file, row, "image_order", issues, false);
  if (order !== null && order < 1) {
    issue(issues, file, row, "image_order", "Image order must be at least 1.");
  }
  const altText = required(record, "alt_text", file, row, issues);
  const filename = optional(record.image_filename);
  if (filename && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:avif|jpe?g|png|webp)$/i.test(filename)) {
    issue(issues, file, row, "image_filename", "Use a safe AVIF, JPEG, PNG or WebP filename without folders.");
  }
  const sourceAssetUrl = httpsUrl(record.source_asset_url, file, row, "source_asset_url", issues);
  if (!filename && !sourceAssetUrl) {
    issue(issues, file, row, "source_asset_url", "Provide an image filename or HTTPS asset URL.");
  }
  const ownershipConfirmed = yesNo(record.ownership_confirmed, file, row, "ownership_confirmed", issues);
  const operatorVerified = yesNo(record.operator_verified, file, row, "operator_verified", issues);
  if (!sku || order === null || !altText || (!filename && !sourceAssetUrl)) return [];
  return [{
    row,
    id: `${sku}:${order}`,
    sku,
    sortOrder: order,
    filename,
    altText,
    sourcePageUrl: httpsUrl(record.source_page_url, file, row, "source_page_url", issues),
    sourceAssetUrl,
    ownershipConfirmed,
    operatorVerified,
  }];
}

function validateRelationships(
  products: ProductImportRow[],
  images: ImageImportRow[],
  issues: CatalogIssue[],
) {
  const bySku = new Map<string, ProductImportRow>();
  const bySlug = new Map<string, ProductImportRow>();
  for (const product of products) {
    if (bySku.has(product.sku)) {
      issue(issues, "products.csv", product.row, "sku", "SKU must be unique.");
    } else {
      bySku.set(product.sku, product);
    }
    const existing = bySlug.get(product.slug);
    if (existing && (
      existing.name !== product.name ||
      existing.category !== product.category ||
      existing.status !== product.status
    )) {
      issue(issues, "products.csv", product.row, "slug", "Rows sharing a slug must share product name, category and status.");
    } else if (!existing) {
      bySlug.set(product.slug, product);
    }
  }

  const imageIds = new Set<string>();
  for (const image of images) {
    if (!bySku.has(image.sku)) {
      issue(issues, "product-images.csv", image.row, "sku", "Image SKU does not exist in products.csv.");
    }
    if (imageIds.has(image.id)) {
      issue(issues, "product-images.csv", image.row, "image_order", "Image order must be unique within a SKU.");
    }
    imageIds.add(image.id);
  }

  for (const product of products.filter((row) => row.status === "active")) {
    const approvedImage = images.some(
      (image) => image.sku === product.sku && image.ownershipConfirmed && image.operatorVerified,
    );
    if (!approvedImage) {
      issue(issues, "products.csv", product.row, "status", "Active products require at least one owned and operator-verified image.");
    }
  }
}

function required(
  record: Record<string, string>, field: string, file: CatalogIssue["file"],
  row: number, issues: CatalogIssue[],
) {
  const value = record[field]?.trim() ?? "";
  if (!value) issue(issues, file, row, field, "Value is required.");
  return value;
}

function optional(value: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function issue(
  issues: CatalogIssue[], file: CatalogIssue["file"], row: number,
  field: string, message: string,
) {
  issues.push({ file, row, field, message });
}

function money(
  value: string, file: CatalogIssue["file"], row: number, field: string,
  issues: CatalogIssue[],
) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    issue(issues, file, row, field, "Use a non-negative rupee amount with at most 2 decimals.");
    return null;
  }
  return Math.round(Number(value) * 100);
}

function integerValue(
  value: string, file: CatalogIssue["file"], row: number, field: string,
  issues: CatalogIssue[], allowEmpty: boolean,
) {
  if (!value && allowEmpty) return null;
  if (!/^\d+$/.test(value)) {
    issue(issues, file, row, field, "Use a non-negative whole number.");
    return null;
  }
  return Number(value);
}

function centimetersToMillimeters(
  value: string, file: CatalogIssue["file"], row: number, field: string,
  issues: CatalogIssue[],
) {
  if (!value) return null;
  if (!/^\d+(?:\.\d)?$/.test(value)) {
    issue(issues, file, row, field, "Use non-negative centimetres with at most 1 decimal.");
    return null;
  }
  return Math.round(Number(value) * 10);
}

function percentageToBasisPoints(
  value: string, file: CatalogIssue["file"], row: number,
  issues: CatalogIssue[],
) {
  if (!value) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > 100) {
    issue(issues, file, row, "tax_rate_percent", "Use a percentage from 0 to 100.");
    return null;
  }
  return Math.round(Number(value) * 100);
}

function yesNo(
  value: string, file: CatalogIssue["file"], row: number, field: string,
  issues: CatalogIssue[],
) {
  const normalized = value.toLowerCase();
  if (normalized !== "yes" && normalized !== "no") {
    issue(issues, file, row, field, "Use yes or no.");
  }
  return normalized === "yes";
}

function httpsUrl(
  value: string, file: CatalogIssue["file"], row: number, field: string,
  issues: CatalogIssue[],
) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("not https");
    return url.toString();
  } catch {
    issue(issues, file, row, field, "Use a valid HTTPS URL.");
    return null;
  }
}

function isStatus(value: string): value is ProductImportRow["status"] {
  return value === "draft" || value === "active" || value === "inactive";
}
