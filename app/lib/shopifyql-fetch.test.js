import { describe, it, expect, vi } from "vitest";
import { GraphqlQueryError } from "@shopify/shopify-api";
import { runShopifyQL, ShopifyQLError } from "./shopifyql-fetch";

function mockAdmin(jsonResponse, status = 200) {
  return {
    graphql: vi.fn().mockResolvedValue({
      status,
      json: async () => jsonResponse,
    }),
  };
}

describe("runShopifyQL", () => {
  it("converts tableData rows into objects keyed by column name", async () => {
    const admin = mockAdmin({
      data: {
        shopifyqlQuery: {
          parseErrors: [],
          tableData: {
            columns: [{ name: "month" }, { name: "net_sales" }],
            rows: [["Jan 26", 1000], ["Feb 26", 1200]],
          },
        },
      },
    });

    const rows = await runShopifyQL(admin, "FROM sales SHOW net_sales TIMESERIES month");

    expect(rows).toEqual([
      { month: "Jan 26", net_sales: 1000 },
      { month: "Feb 26", net_sales: 1200 },
    ]);
  });

  it("throws ShopifyQLError when parseErrors is non-empty", async () => {
    const admin = mockAdmin({
      data: {
        shopifyqlQuery: {
          parseErrors: ["Unknown field 'bogus_field'"],
          tableData: { columns: [], rows: [] },
        },
      },
    });

    await expect(runShopifyQL(admin, "FROM sales SHOW bogus_field")).rejects.toThrow(ShopifyQLError);
  });

  it("throws ShopifyQLError with GraphQL error messages when top-level errors are present", async () => {
    const admin = mockAdmin({
      data: null,
      errors: [
        { message: "Missing required scope: read_reports" },
        { message: "Invalid query syntax" },
      ],
    });

    const error = await runShopifyQL(admin, "INVALID QUERY").catch((e) => e);

    expect(error).toBeInstanceOf(ShopifyQLError);
    expect(error.parseErrors).toEqual([
      "Missing required scope: read_reports",
      "Invalid query syntax",
    ]);
  });

  it("retries on cost-based GraphQL throttling (thrown GraphqlQueryError, not a 429 response) and succeeds", async () => {
    const throttleError = new GraphqlQueryError({
      message: "Rate limited. Please retry later.",
    });
    const admin = {
      graphql: vi
        .fn()
        .mockRejectedValueOnce(throttleError)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              shopifyqlQuery: {
                parseErrors: [],
                tableData: {
                  columns: [{ name: "referrer_source" }, { name: "sessions" }],
                  rows: [["direct", 9]],
                },
              },
            },
          }),
        }),
    };

    const rows = await runShopifyQL(admin, "FROM sessions SHOW sessions GROUP BY referrer_source");

    expect(rows).toEqual([{ referrer_source: "direct", sessions: 9 }]);
    expect(admin.graphql).toHaveBeenCalledTimes(2);
  });

  it("wraps a persistent GraphqlQueryError as ShopifyQLError once retries are exhausted", async () => {
    const throttleError = new GraphqlQueryError({
      message: "Rate limited. Please retry later.",
    });
    const admin = {
      graphql: vi.fn().mockRejectedValue(throttleError),
    };

    const error = await runShopifyQL(admin, "FROM sales SHOW net_sales").catch((e) => e);

    expect(error).toBeInstanceOf(ShopifyQLError);
    expect(error.parseErrors).toEqual(["Rate limited. Please retry later."]);
  }, 15000);
});
