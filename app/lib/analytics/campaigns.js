// app/lib/analytics/campaigns.js
import { runShopifyQL } from "../shopifyql-fetch";

function campaignSessionsQuery() {
  return `FROM campaign_sessions SHOW campaign_sessions, campaign_conversion_rate GROUP BY utm_campaign, referring_channel, traffic_type SINCE -12m UNTIL today ORDER BY campaign_sessions DESC LIMIT 30`;
}

function campaignSalesQuery() {
  return `FROM campaign_sales SHOW campaign_last_non_direct_click_order_count, campaign_last_non_direct_click_total_sales, campaign_last_non_direct_click_total_average_order_value GROUP BY utm_campaign SINCE -12m UNTIL today ORDER BY campaign_last_non_direct_click_total_sales DESC LIMIT 30`;
}

const CHANNEL_COLORS = {
  Email: "#818CF8", Social: "#EC4899", Search: "#F59E0B",
  Direct: "#34D399", Referral: "#06B6D4", Paid: "#3B82F6", Other: "#6B7280",
};

function colorFor(channel) {
  const key = (channel || "Other").toLowerCase();
  for (const [k, v] of Object.entries(CHANNEL_COLORS)) {
    if (key.includes(k.toLowerCase())) return v;
  }
  return "#6B7280";
}

export async function fetchCampaigns(admin) {
  const [sessionRows, salesRows] = await Promise.all([
    runShopifyQL(admin, campaignSessionsQuery()),
    runShopifyQL(admin, campaignSalesQuery()),
  ]);

  const salesByCampaign = {};
  salesRows.forEach((r) => {
    salesByCampaign[r.utm_campaign] = {
      sa: r.campaign_last_non_direct_click_total_sales || 0,
      or: r.campaign_last_non_direct_click_order_count || 0,
      av: r.campaign_last_non_direct_click_total_average_order_value || 0,
    };
  });

  const campaigns = sessionRows
    .map((r) => {
      const sales = salesByCampaign[r.utm_campaign] || { sa: 0, or: 0, av: 0 };
      const channel = r.referring_channel || r.traffic_type || "Direct";
      // ShopifyQL numeric fields arrive as JSON strings (e.g. "sessions": "551"), not numbers.
      // Coerce se/sa/or here too so downstream consumers (chart rendering, numeric sort)
      // get real numbers rather than strings. cv/av are left alone: division already auto-coerces.
      return {
        nm: r.utm_campaign || "(no name)",
        ch: channel,
        tt: r.traffic_type || "",
        se: Number(r.campaign_sessions || 0),
        sa: Number(sales.sa || 0),
        or: Number(sales.or || 0),
        cv: parseFloat(((r.campaign_conversion_rate || 0) * 100).toFixed(2)),
        av: sales.av,
        cl: colorFor(channel),
      };
    })
    .sort((a, b) => b.sa - a.sa);

  const channelMap = {};
  campaigns.forEach((c) => {
    const key = c.ch || "Other";
    if (!channelMap[key]) channelMap[key] = { ch: key, se: 0, sa: 0, or: 0, cl: c.cl, campaigns: 0 };
    // ShopifyQL numeric fields arrive as JSON strings (e.g. "sessions": "551"), not numbers.
    // `+=` on a string does concatenation, not addition, so coerce explicitly before accumulating.
    channelMap[key].se += Number(c.se);
    channelMap[key].sa += Number(c.sa);
    channelMap[key].or += Number(c.or);
    channelMap[key].campaigns += 1;
  });
  const channels = Object.values(channelMap)
    .map((ch) => {
      ch.cv = ch.se > 0 ? parseFloat((ch.or / ch.se * 100).toFixed(1)) : 0;
      ch.av = ch.or > 0 ? parseFloat((ch.sa / ch.or).toFixed(2)) : 0;
      return ch;
    })
    .sort((a, b) => b.sa - a.sa);

  return { campaigns, channels };
}
