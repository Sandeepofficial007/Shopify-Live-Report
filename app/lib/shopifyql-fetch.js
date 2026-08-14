const MAX_RETRIES = 3;

export class ShopifyQLError extends Error {
  constructor(parseErrors) {
    super("ShopifyQL query failed: " + parseErrors.join("; "));
    this.name = "ShopifyQLError";
    this.parseErrors = parseErrors;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rowsToObjects(tableData) {
  const columnNames = tableData.columns.map((c) => c.name);
  return tableData.rows.map((row) => {
    const obj = {};
    columnNames.forEach((name, i) => {
      obj[name] = row[i];
    });
    return obj;
  });
}

export async function runShopifyQL(admin, shopifyqlBody) {
  let attempt = 0;

  for (;;) {
    const response = await admin.graphql(
      `#graphql
      query RunShopifyQL($query: String!) {
        shopifyqlQuery(query: $query) {
          tableData {
            columns { name dataType }
            rows
          }
          parseErrors
        }
      }`,
      { variables: { query: shopifyqlBody } }
    );

    if (response.status === 429 && attempt < MAX_RETRIES) {
      attempt += 1;
      await sleep(500 * 2 ** attempt);
      continue;
    }

    const body = await response.json();
    const result = body.data && body.data.shopifyqlQuery;

    if (result && result.parseErrors && result.parseErrors.length > 0) {
      throw new ShopifyQLError(result.parseErrors);
    }

    if (!result) {
      if (body.errors && body.errors.length > 0) {
        const errorMessages = body.errors.map((e) => e.message || String(e));
        throw new ShopifyQLError(errorMessages);
      }
      throw new ShopifyQLError(["Unknown ShopifyQL error"]);
    }

    return rowsToObjects(result.tableData);
  }
}
