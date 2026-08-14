// app/lib/analytics/conversion.test.js
import { describe, it, expect, vi } from "vitest";
import * as fetchModule from "../shopifyql-fetch";
import { fetchConversionAndFunnel } from "./conversion";

describe("fetchConversionAndFunnel", () => {
  it("computes funnel pass-through rates from raw session counts", async () => {
    vi.spyOn(fetchModule, "runShopifyQL")
      .mockResolvedValueOnce([{
        sessions: 1000, sessions_with_cart_additions: 200,
        sessions_that_reached_checkout: 100, sessions_that_completed_checkout: 50,
        conversion_rate: 0.05,
      }])
      .mockResolvedValueOnce([{
        sessions: 800, sessions_with_cart_additions: 160,
        sessions_that_reached_checkout: 80, sessions_that_completed_checkout: 40,
        conversion_rate: 0.05,
      }]);

    const result = await fetchConversionAndFunnel({});

    expect(result.se).toEqual([1000]);
    expect(result.cv).toEqual([5]);
    expect(result.acr).toEqual([20]);
    expect(result.ccr).toEqual([10]);
    expect(result.c2c).toEqual([50]);
    expect(result.sep).toEqual([800]);
    expect(result.cvp).toEqual([5]);
  });
});
