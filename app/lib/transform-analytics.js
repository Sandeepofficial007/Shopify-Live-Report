import { fetchSalesAndAOV } from "./analytics/sales";
import { fetchConversionAndFunnel } from "./analytics/conversion";
import { fetchReferrers } from "./analytics/referrers";
import { fetchCampaigns } from "./analytics/campaigns";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabels() {
  const labels = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(MONTH_NAMES[d.getMonth()] + " " + String(d.getFullYear()).slice(2));
  }
  return labels;
}

export async function fetchStoreAnalytics(admin) {
  // Fetched sequentially, not via Promise.all: firing all four fetchers'
  // ShopifyQL queries at once (5 simultaneous requests, since fetchCampaigns
  // itself runs 2 in parallel) reliably triggered Shopify's cost-based
  // GraphQL throttling in production. Sequencing them keeps concurrent
  // request count low enough to avoid it, at the cost of a slightly slower
  // dashboard load.
  const sales = await fetchSalesAndAOV(admin);
  const conv = await fetchConversionAndFunnel(admin);
  const referrers = await fetchReferrers(admin);
  const campaigns = await fetchCampaigns(admin);

  return {
    store: {
      ...sales,
      ...conv,
      rf: referrers,
      ut: campaigns.campaigns,
      uc: campaigns.channels,
    },
    months: monthLabels(),
    lastUpdated: new Date().toISOString(),
  };
}
