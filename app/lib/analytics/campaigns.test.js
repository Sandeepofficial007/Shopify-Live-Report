// app/lib/analytics/campaigns.test.js
import { describe, it, expect, vi } from "vitest";
import * as fetchModule from "../shopifyql-fetch";
import { fetchCampaigns } from "./campaigns";

describe("fetchCampaigns", () => {
  it("joins campaign sessions with campaign sales by utm_campaign", async () => {
    vi.spyOn(fetchModule, "runShopifyQL")
      .mockResolvedValueOnce([ // campaign_sessions
        { utm_campaign: "summer_sale", referring_channel: "Email", traffic_type: "Paid", campaign_sessions: 200, campaign_conversion_rate: 0.1 },
      ])
      .mockResolvedValueOnce([ // campaign_sales
        { utm_campaign: "summer_sale", campaign_last_non_direct_click_order_count: 20, campaign_last_non_direct_click_total_sales: 2000, campaign_last_non_direct_click_total_average_order_value: 100 },
      ]);

    const result = await fetchCampaigns({});

    expect(result.campaigns).toEqual([
      { nm: "summer_sale", ch: "Email", tt: "Paid", se: 200, sa: 2000, or: 20, cv: 10, av: 100, cl: "#818CF8" },
    ]);
    expect(result.channels).toEqual([
      { ch: "Email", se: 200, sa: 2000, or: 20, cl: "#818CF8", campaigns: 1, cv: 10, av: 100 },
    ]);
  });
});
