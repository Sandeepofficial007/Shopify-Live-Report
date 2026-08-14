// lib/parse-csv.js
// Parses Shopify-exported CSVs into the data structure the dashboard expects
//
// Expected CSV filenames in each store folder:
//   Net_sales_over_time_*.csv
//   Conversion_rate_over_time_*.csv
//   Average_order_value_over_time_*.csv
//   Sessions_by_Referrer_*.csv
//   Performance_by_UTM_campaign_*.csv

import Papa from "papaparse";

function parseCSV(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  return result.data;
}

// Find a CSV by partial filename match (handles both underscores and spaces)
function findCSV(files, pattern) {
  const normalizedPattern = pattern.toLowerCase().replace(/[_ ]+/g, " ");
  const key = Object.keys(files).find((name) => {
    const normalizedName = name.toLowerCase().replace(/[_ ]+/g, " ");
    return normalizedName.includes(normalizedPattern);
  });
  if (!key) {
    console.log(`[CSV] No file matched pattern "${pattern}" among: ${Object.keys(files).join(', ')}`);
  } else {
    console.log(`[CSV] Matched "${pattern}" → "${key}"`);
  }
  return key ? parseCSV(files[key]) : [];
}

// Parse net sales CSV
function parseSales(rows) {
  const sales = [];
  const salesPrior = [];

  rows.forEach((row) => {
    const s = row["Net sales"] || row["net_sales"] || 0;
    const sp =
      row["Net sales (previous_period)"] ||
      row["net_sales_previous_period"] ||
      0;
    sales.push(
      typeof s === "number" ? s : parseFloat(String(s).replace(/[$,]/g, "")) || 0
    );
    salesPrior.push(
      typeof sp === "number" ? sp : parseFloat(String(sp).replace(/[$,]/g, "")) || 0
    );
  });

  return { sales, salesPrior };
}

// Parse conversion rate CSV — includes funnel stages + computed traffic metrics
// Available CSV columns: Month, Sessions, Sessions with cart additions,
// Sessions that reached checkout, Sessions that completed checkout, Conversion rate
// + (previous_period) variants of the above
function parseConversion(rows) {
  const conv = [], sessions = [], cartAdds = [], reachedCheckout = [], completedCheckout = [];
  // Computed traffic metrics
  const addToCartRate = [], checkoutConvRate = [], cartToCheckoutRate = [];
  // Previous period
  const sessionsPrev = [], completedCheckoutPrev = [], convPrev = [];
  const cartAddsPrev = [], reachedCheckoutPrev = [];
  const addToCartRatePrev = [], checkoutConvRatePrev = [], cartToCheckoutRatePrev = [];

  rows.forEach((row) => {
    const cr = row["Conversion rate"] || row["conversion_rate"] || 0;
    const crVal = typeof cr === "number" ? cr : parseFloat(cr) || 0;
    conv.push(parseFloat((crVal * 100).toFixed(2)));

    const se = row["Sessions"] || 0;
    const ca = row["Sessions with cart additions"] || 0;
    const rc = row["Sessions that reached checkout"] || 0;
    const ck = row["Sessions that completed checkout"] || 0;
    sessions.push(se);
    cartAdds.push(ca);
    reachedCheckout.push(rc);
    completedCheckout.push(ck);

    // Compute rates from raw funnel data
    addToCartRate.push(se > 0 ? parseFloat((ca / se * 100).toFixed(2)) : 0);
    checkoutConvRate.push(se > 0 ? parseFloat((rc / se * 100).toFixed(2)) : 0);
    cartToCheckoutRate.push(ca > 0 ? parseFloat((rc / ca * 100).toFixed(2)) : 0);

    // Previous period
    const sep = row["Sessions (previous_period)"] || 0;
    const cap = row["Sessions with cart additions (previous_period)"] || 0;
    const rcp = row["Sessions that reached checkout (previous_period)"] || 0;
    const ckp = row["Sessions that completed checkout (previous_period)"] || 0;
    sessionsPrev.push(sep);
    cartAddsPrev.push(cap);
    reachedCheckoutPrev.push(rcp);
    completedCheckoutPrev.push(ckp);

    const crp = row["Conversion rate (previous_period)"] || 0;
    const crpVal = typeof crp === "number" ? crp : parseFloat(crp) || 0;
    convPrev.push(parseFloat((crpVal * 100).toFixed(2)));

    addToCartRatePrev.push(sep > 0 ? parseFloat((cap / sep * 100).toFixed(2)) : 0);
    checkoutConvRatePrev.push(sep > 0 ? parseFloat((rcp / sep * 100).toFixed(2)) : 0);
    cartToCheckoutRatePrev.push(cap > 0 ? parseFloat((rcp / cap * 100).toFixed(2)) : 0);
  });

  return {
    conv, sessions, cartAdds, reachedCheckout, completedCheckout,
    addToCartRate, checkoutConvRate, cartToCheckoutRate,
    sessionsPrev, completedCheckoutPrev, convPrev,
    cartAddsPrev, reachedCheckoutPrev,
    addToCartRatePrev, checkoutConvRatePrev, cartToCheckoutRatePrev
  };
}

// Parse AOV CSV
function parseAOV(rows) {
  const aov = [];
  const aovPrior = [];
  const orders = [];

  rows.forEach((row) => {
    const a = row["Average order value"] || row["average_order_value"] || 0;
    const ap =
      row["Average order value (previous_period)"] ||
      row["average_order_value_previous_period"] ||
      0;
    const o = row["Orders"] || row["orders"] || 0;

    aov.push(
      typeof a === "number" ? a : parseFloat(String(a).replace(/[$,]/g, "")) || 0
    );
    aovPrior.push(
      typeof ap === "number" ? ap : parseFloat(String(ap).replace(/[$,]/g, "")) || 0
    );
    orders.push(typeof o === "number" ? o : parseInt(o) || 0);
  });

  return { aov, aovPrior, orders };
}

// Parse Sessions by Referrer CSV
function parseReferrers(rows) {
  return rows
    .filter((row) => row["Referrer"] || row["Referrer name"] || row["referrer"])
    .map((row) => {
      const name =
        row["Referrer"] || row["Referrer name"] || row["referrer"] || "Unknown";
      const s = row["Sessions"] || row["sessions"] || 0;
      const convRate =
        row["Conversion rate"] || row["conversion_rate"] || 0;
      const cr = typeof convRate === "number" ? convRate : parseFloat(convRate) || 0;
      return {
        n: name,
        s: typeof s === "number" ? s : parseInt(s) || 0,
        r: parseFloat((cr * 100).toFixed(2)),
      };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 10);
}

// Parse UTM Campaign CSV
// Columns: UTM campaign name, Referring channel, Traffic type, Sessions,
// Total sales (last non-direct click), Orders (last non-direct click),
// Conversion rate (last non-direct click), Average order value (last non-direct click)
function parseCampaigns(rows) {
  if (rows.length > 0) {
    console.log("[CSV-DEBUG] Campaign CSV columns:", JSON.stringify(Object.keys(rows[0])));
  }

  const channelColors = {
    "Email": "#818CF8",
    "Social": "#EC4899",
    "Search": "#F59E0B",
    "Direct": "#34D399",
    "Referral": "#06B6D4",
    "Paid": "#3B82F6",
    "Other": "#6B7280",
  };

  // Return individual campaign rows with all metrics
  const campaigns = [];

  rows.forEach((row) => {
    const name = row["UTM campaign name"] || row["UTM campaign source"] || row["utm_campaign_source"] || "";
    const channel = row["Referring channel"] || row["UTM campaign medium"] || row["utm_campaign_medium"] || "";
    const trafficType = row["Traffic type"] || "";

    if (!name && !channel) return;

    const se = row["Sessions"] || 0;
    const sa = row["Total sales (last non-direct click)"] || row["Net sales"] || row["net_sales"] || 0;
    const or2 = row["Orders (last non-direct click)"] || row["Orders"] || row["orders"] || 0;
    const crRaw = row["Conversion rate (last non-direct click)"] || row["Conversion rate"] || 0;
    const cr = typeof crRaw === "number" ? parseFloat((crRaw * 100).toFixed(2)) : parseFloat(crRaw) || 0;
    const aovRaw = row["Average order value (last non-direct click)"] || row["Average order value"] || 0;
    const aov = typeof aovRaw === "number" ? aovRaw : parseFloat(String(aovRaw).replace(/[$,]/g, "")) || 0;

    // Assign color based on channel or traffic type
    let colorKey = channel || trafficType || "Other";
    let cl = "#6B7280";
    for (const [k, v] of Object.entries(channelColors)) {
      if (colorKey.toLowerCase().includes(k.toLowerCase())) { cl = v; break; }
    }

    campaigns.push({
      nm: name || "(no name)",
      ch: channel || trafficType || "Direct",
      tt: trafficType,
      se: typeof se === "number" ? se : parseInt(se) || 0,
      sa: typeof sa === "number" ? sa : parseFloat(String(sa).replace(/[$,]/g, "")) || 0,
      or: typeof or2 === "number" ? or2 : parseInt(or2) || 0,
      cv: cr,
      av: aov,
      cl: cl,
    });
  });

  // Sort by sales descending
  campaigns.sort((a, b) => b.sa - a.sa);

  // Also build channel summary (grouped by Referring channel)
  const channelMap = {};
  campaigns.forEach((c) => {
    const key = c.ch || "Other";
    if (!channelMap[key]) {
      channelMap[key] = { ch: key, se: 0, sa: 0, or: 0, cl: c.cl, campaigns: 0 };
    }
    channelMap[key].se += c.se;
    channelMap[key].sa += c.sa;
    channelMap[key].or += c.or;
    channelMap[key].campaigns += 1;
  });
  const channels = Object.values(channelMap)
    .map((ch) => {
      ch.cv = ch.se > 0 ? parseFloat(((ch.or / ch.se) * 100).toFixed(1)) : 0;
      ch.av = ch.or > 0 ? parseFloat((ch.sa / ch.or).toFixed(2)) : 0;
      return ch;
    })
    .sort((a, b) => b.sa - a.sa);

  return { campaigns, channels };
}

// Main: Transform all CSVs from a store folder into the dashboard data structure
function transformStoreData(files) {
  const salesCSV = findCSV(files, "net_sales_over_time");
  const convCSV = findCSV(files, "conversion_rate_over_time");
  const aovCSV = findCSV(files, "average_order_value");
  const refCSV = findCSV(files, "sessions_by_referrer");
  const utmCSV = findCSV(files, "performance_by_utm");

  const salesData = parseSales(salesCSV);
  const convData = parseConversion(convCSV);
  const aovData = parseAOV(aovCSV);
  const refData = parseReferrers(refCSV);
  const utmData = parseCampaigns(utmCSV);

  return {
    s: salesData.sales,
    sp: salesData.salesPrior,
    cv: convData.conv,
    se: convData.sessions,
    ca: convData.cartAdds,
    rc: convData.reachedCheckout,
    ck: convData.completedCheckout,
    av: aovData.aov,
    ap: aovData.aovPrior,
    or: aovData.orders,
    rf: refData,
    ut: utmData.campaigns || utmData,
    uc: utmData.channels || [],
    // Computed traffic metrics (from funnel data)
    acr: convData.addToCartRate,        // Add to Cart Rate (cart adds / sessions)
    ccr: convData.checkoutConvRate,     // Checkout Rate (reached checkout / sessions)
    c2c: convData.cartToCheckoutRate,   // Cart to Checkout Rate (reached checkout / cart adds)
    // Previous period
    sep: convData.sessionsPrev,
    cap: convData.cartAddsPrev,
    rcp: convData.reachedCheckoutPrev,
    ckp: convData.completedCheckoutPrev,
    cvp: convData.convPrev,
    acrp: convData.addToCartRatePrev,
    ccrp: convData.checkoutConvRatePrev,
    c2cp: convData.cartToCheckoutRatePrev,
  };
}

// Transform all 6 stores
export function transformAllStores(rawData) {
  const result = {};
  const storeKeys = ["cp", "nb", "n4", "cpp", "nbp", "n4p"];

  storeKeys.forEach((key) => {
    if (rawData[key]) {
      result[key] = transformStoreData(rawData[key]);
    }
  });

  // Build month labels from the first store's sales CSV
  const firstStore = rawData[storeKeys[0]];
  if (firstStore) {
    const salesKey = Object.keys(firstStore).find((name) =>
      name.toLowerCase().replace(/[_ ]+/g, " ").includes("net sales over time")
    );
    if (salesKey) {
      const rows = parseCSV(firstStore[salesKey]);
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      result.months = rows.map((row) => {
        const d = new Date(row["Month"] || row["month"] || "");
        if (isNaN(d.getTime())) return "???";
        return months[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
      });
    }
  }

  result.lastUpdated = new Date().toISOString();
  return result;
}
