// app/lib/analytics/conversion.js
import { runShopifyQL } from "../shopifyql-fetch";

function sessionsQuery(since, until) {
  return `FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout, conversion_rate TIMESERIES month WHERE human_or_bot_session = 'human' SINCE ${since} UNTIL ${until} ORDER BY month ASC`;
}

function toRates(rows) {
  return rows.map((r) => {
    const se = r.sessions || 0;
    const ca = r.sessions_with_cart_additions || 0;
    const rc = r.sessions_that_reached_checkout || 0;
    const ck = r.sessions_that_completed_checkout || 0;
    return {
      se, ca, rc, ck,
      cv: parseFloat(((r.conversion_rate || 0) * 100).toFixed(2)),
      acr: se > 0 ? parseFloat((ca / se * 100).toFixed(2)) : 0,
      ccr: se > 0 ? parseFloat((rc / se * 100).toFixed(2)) : 0,
      c2c: ca > 0 ? parseFloat((rc / ca * 100).toFixed(2)) : 0,
    };
  });
}

export async function fetchConversionAndFunnel(admin) {
  const current = await runShopifyQL(admin, sessionsQuery("-12m", "today"));
  const prior = await runShopifyQL(admin, sessionsQuery("-24m", "-12m"));

  const cur = toRates(current);
  const pri = toRates(prior);

  return {
    se: cur.map((r) => r.se), ca: cur.map((r) => r.ca), rc: cur.map((r) => r.rc), ck: cur.map((r) => r.ck),
    cv: cur.map((r) => r.cv), acr: cur.map((r) => r.acr), ccr: cur.map((r) => r.ccr), c2c: cur.map((r) => r.c2c),
    sep: pri.map((r) => r.se), cap: pri.map((r) => r.ca), rcp: pri.map((r) => r.rc), ckp: pri.map((r) => r.ck),
    cvp: pri.map((r) => r.cv), acrp: pri.map((r) => r.acr), ccrp: pri.map((r) => r.ccr), c2cp: pri.map((r) => r.c2c),
  };
}
