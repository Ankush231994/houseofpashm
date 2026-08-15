import { headers } from "next/headers";
import Link from "next/link";
import { getAdminAccess } from "../../../lib/admin-auth";
import { listOrdersForAdmin } from "../../../lib/commerce/orders";
import OrdersDashboard from "./orders-dashboard";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const access = await getAdminAccess(await headers());
  if (!access.allowed) return <main className="admin-shell"><div className="admin-panel admin-denied"><span>HOUSEOFPASHM ADMIN</span><h1>Order access unavailable</h1><p>{access.reason}</p><Link href="/">RETURN TO STOREFRONT</Link></div></main>;
  if (process.env.CATALOG_SOURCE !== "database") return <main className="admin-shell"><div className="admin-panel admin-denied"><span>HOUSEOFPASHM ADMIN</span><h1>Order database unavailable</h1><p>Configure D1 and enable database catalogue mode before managing orders.</p><Link href="/admin">RETURN TO ADMIN</Link></div></main>;
  const result = await listOrdersForAdmin()
    .then((records) => ({ records, error: null }))
    .catch((error: unknown) => ({ records: null, error }));
  if (!result.records) return <main className="admin-shell"><div className="admin-panel admin-denied"><h1>Orders could not be loaded</h1><p>{result.error instanceof Error ? result.error.message : "Database unavailable."}</p><Link href="/admin">RETURN TO ADMIN</Link></div></main>;
  const serialized = result.records.map((order) => ({ ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(), reservationExpiresAt: order.reservationExpiresAt.toISOString(), paidAt: order.paidAt?.toISOString() ?? null, shippedAt: order.shippedAt?.toISOString() ?? null, deliveredAt: order.deliveredAt?.toISOString() ?? null, cancelledAt: order.cancelledAt?.toISOString() ?? null, items: order.items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })) }));
  return <main className="admin-shell"><header className="admin-header"><div><span>HOUSEOFPASHM ADMIN</span><h1>Order operations</h1><p>Signed in as {access.email}</p></div><Link href="/admin">CATALOGUE ADMIN</Link></header><OrdersDashboard initialOrders={serialized}/></main>;
}
