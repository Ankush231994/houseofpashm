import { getAdminAccess } from "../../../../../lib/admin-auth";
import { importCatalog } from "../../../../../lib/catalog/importer";
import { validateCatalogCsvs } from "../../../../../lib/catalog/validation";

const MAX_CSV_BYTES = 1_000_000;

export async function POST(request: Request) {
  const access = getAdminAccess(request.headers);
  if (!access.allowed) {
    return Response.json(
      { error: access.reason },
      { status: access.configured ? 403 : 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CSV_BYTES * 2 + 10_000) {
    return Response.json({ error: "Catalogue upload is too large." }, { status: 413 });
  }

  let payload: { productsCsv?: unknown; imagesCsv?: unknown; commit?: unknown };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof payload.productsCsv !== "string" || typeof payload.imagesCsv !== "string") {
    return Response.json(
      { error: "productsCsv and imagesCsv must be strings." },
      { status: 400 },
    );
  }
  if (
    new TextEncoder().encode(payload.productsCsv).byteLength > MAX_CSV_BYTES ||
    new TextEncoder().encode(payload.imagesCsv).byteLength > MAX_CSV_BYTES
  ) {
    return Response.json({ error: "Each CSV must be 1 MB or smaller." }, { status: 413 });
  }

  const plan = validateCatalogCsvs(payload.productsCsv, payload.imagesCsv);
  const summary = {
    productRows: plan.products.length,
    uniqueProducts: new Set(plan.products.map((row) => row.slug)).size,
    imageRows: plan.images.length,
    issues: plan.issues,
  };
  if (plan.issues.length || payload.commit !== true) {
    return Response.json(summary, { status: plan.issues.length ? 422 : 200 });
  }
  if (process.env.CATALOG_SOURCE !== "database") {
    return Response.json(
      { error: "Set CATALOG_SOURCE=database and configure D1 before committing imports." },
      { status: 409 },
    );
  }

  try {
    const result = await importCatalog(plan, access.email);
    return Response.json({ ...summary, result }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Catalogue import failed." },
      { status: 500 },
    );
  }
}
