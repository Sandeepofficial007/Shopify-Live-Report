// app/lib/analytics/sales.js
import { runShopifyQL } from "../shopifyql-fetch";

function salesQuery(since, until) {
  return `FROM sales SHOW net_sales, orders TIMESERIES month SINCE ${since} UNTIL ${until} ORDER BY month ASC`;
}

export async function fetchSalesAndAOV(admin) {
  const current = await runShopifyQL(admin, salesQuery("-12m", "today"));
  const prior = await runShopifyQL(admin, salesQuery("-24m", "-12m"));

  return {
    s: current.map((r) => r.net_sales || 0),
    or: current.map((r) => r.orders || 0),
    av: current.map((r) => (r.orders > 0 ? r.net_sales / r.orders : 0)),
    sp: prior.map((r) => r.net_sales || 0),
    ap: prior.map((r) => (r.orders > 0 ? r.net_sales / r.orders : 0)),
  };
}
