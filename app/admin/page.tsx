import { headers } from "next/headers";
import Link from "next/link";
import { getAdminAccess } from "../../lib/admin-auth";
import CatalogImporter from "./catalog-importer";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = getAdminAccess(await headers());
  if (!access.allowed) {
    return (
      <main className="admin-shell">
        <div className="admin-panel admin-denied">
          <span>HOUSEOFPASHM ADMIN</span>
          <h1>Catalogue access unavailable</h1>
          <p>{access.reason}</p>
          <p>
            Configure the two operator emails and an approved authentication mode
            before using this page.
          </p>
          <Link href="/">RETURN TO STOREFRONT</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span>HOUSEOFPASHM ADMIN</span>
          <h1>Catalogue import</h1>
          <p>Signed in as {access.email}</p>
        </div>
        <Link href="/">VIEW STOREFRONT</Link>
      </header>
      <CatalogImporter databaseEnabled={process.env.CATALOG_SOURCE === "database"} />
    </main>
  );
}
