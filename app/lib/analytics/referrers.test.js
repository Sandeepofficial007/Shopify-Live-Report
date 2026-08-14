// app/lib/analytics/referrers.test.js
import { describe, it, expect, vi } from "vitest";
import * as fetchModule from "../shopifyql-fetch";
import { fetchReferrers } from "./referrers";

describe("fetchReferrers", () => {
  it("maps referrer_source rows to {n, s, r}", async () => {
    vi.spyOn(fetchModule, "runShopifyQL").mockResolvedValueOnce([
      { referrer_source: "google.com", sessions: 500, conversion_rate: 0.03 },
      { referrer_source: "direct", sessions: 300, conversion_rate: 0.05 },
    ]);

    const result = await fetchReferrers({});

    expect(result).toEqual([
      { n: "google.com", s: 500, r: 3 },
      { n: "direct", s: 300, r: 5 },
    ]);
  });
});
