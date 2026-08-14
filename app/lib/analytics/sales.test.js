// app/lib/analytics/sales.test.js
import { describe, it, expect, vi } from "vitest";
import * as fetchModule from "../shopifyql-fetch";
import { fetchSalesAndAOV } from "./sales";

describe("fetchSalesAndAOV", () => {
  it("computes AOV and pairs current/prior windows", async () => {
    vi.spyOn(fetchModule, "runShopifyQL")
      .mockResolvedValueOnce([{ net_sales: 1000, orders: 10 }]) // current
      .mockResolvedValueOnce([{ net_sales: 800, orders: 8 }]);  // prior year

    const result = await fetchSalesAndAOV({});

    expect(result).toEqual({
      s: [1000], sp: [800],
      av: [100], ap: [100],
      or: [10],
    });
  });
});
