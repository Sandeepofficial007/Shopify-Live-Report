// app/lib/transform-analytics.test.js
import { describe, it, expect, vi } from "vitest";
import * as salesModule from "./analytics/sales";
import * as convModule from "./analytics/conversion";
import * as refModule from "./analytics/referrers";
import * as campModule from "./analytics/campaigns";
import { fetchStoreAnalytics } from "./transform-analytics";

describe("fetchStoreAnalytics", () => {
  it("merges all four fetchers into one store object plus months/lastUpdated", async () => {
    vi.spyOn(salesModule, "fetchSalesAndAOV").mockResolvedValue({ s: [1], sp: [1], av: [1], ap: [1], or: [1] });
    vi.spyOn(convModule, "fetchConversionAndFunnel").mockResolvedValue({ se: [1], ca: [1], rc: [1], ck: [1], cv: [1], acr: [1], ccr: [1], c2c: [1], sep: [1], cap: [1], rcp: [1], ckp: [1], cvp: [1], acrp: [1], ccrp: [1], c2cp: [1] });
    vi.spyOn(refModule, "fetchReferrers").mockResolvedValue([{ n: "google.com", s: 10, r: 5 }]);
    vi.spyOn(campModule, "fetchCampaigns").mockResolvedValue({ campaigns: [{ nm: "x" }], channels: [{ ch: "Email" }] });

    const result = await fetchStoreAnalytics({});

    expect(result.store.s).toEqual([1]);
    expect(result.store.rf).toEqual([{ n: "google.com", s: 10, r: 5 }]);
    expect(result.store.ut).toEqual([{ nm: "x" }]);
    expect(result.store.uc).toEqual([{ ch: "Email" }]);
    expect(result.months).toHaveLength(12);
    expect(typeof result.lastUpdated).toBe("string");
  });
});
