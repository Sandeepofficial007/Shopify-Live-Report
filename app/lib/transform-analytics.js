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
  const [sales, conv, referrers, campaigns] = await Promise.all([
    fetchSalesAndAOV(admin),
    fetchConversionAndFunnel(admin),
    fetchReferrers(admin),
    fetchCampaigns(admin),
  ]);

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
