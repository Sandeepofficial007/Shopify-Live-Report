import { useLoaderData, useRevalidator } from "react-router";
import { authenticate } from "../shopify.server";
import { fetchStoreAnalytics } from "../lib/transform-analytics";
import { ShopifyQLError } from "../lib/shopifyql-fetch";
import Dashboard from "../components/Dashboard";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  try {
    const data = await fetchStoreAnalytics(admin);
    return { ...data, shopName: session.shop, error: null };
  } catch (err) {
    if (err instanceof ShopifyQLError) {
      return { error: err.message, shopName: session.shop, store: null, months: [], lastUpdated: null };
    }
    throw err;
  }
}

export default function DashboardRoute() {
  const data = useLoaderData();
  const revalidator = useRevalidator();

  if (data.error) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#EF4444", marginBottom: 12 }}>{data.error}</p>
        <button onClick={() => revalidator.revalidate()}>Retry</button>
      </div>
    );
  }

  const totalSales = (data.store.s || []).reduce((sum, v) => sum + v, 0);

  if (totalSales === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif", color: "#94A3B8" }}>
        <p>No orders found for this store yet in the last 12 months.</p>
      </div>
    );
  }

  return (
    <Dashboard
      data={data}
      onRefresh={() => revalidator.revalidate()}
      isRefreshing={revalidator.state === "loading"}
    />
  );
}
