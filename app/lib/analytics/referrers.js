// app/lib/analytics/referrers.js
import { runShopifyQL } from "../shopifyql-fetch";

function referrersQuery() {
  return `FROM sessions SHOW sessions, conversion_rate WHERE human_or_bot_session = 'human' GROUP BY referrer_source SINCE -12m UNTIL today ORDER BY sessions DESC LIMIT 10`;
}

export async function fetchReferrers(admin) {
  const rows = await runShopifyQL(admin, referrersQuery());
  return rows.map((r) => ({
    n: r.referrer_source || "Unknown",
    s: r.sessions || 0,
    r: parseFloat(((r.conversion_rate || 0) * 100).toFixed(2)),
  }));
}
