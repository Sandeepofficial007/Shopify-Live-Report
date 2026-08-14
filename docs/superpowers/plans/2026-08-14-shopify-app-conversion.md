# Shopify Custom App Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the CSV-upload Next.js dashboard into a Shopify custom-distribution embedded app (Remix) that live-syncs one store's analytics via ShopifyQL — zero manual CSV work, zero code changes to onboard a new store.

**Architecture:** Shopify CLI Remix template (Node + Prisma + App Bridge) hosted on Render. A dashboard route loader calls the Admin GraphQL `shopifyqlQuery` field for 4 query groups (sales/AOV, conversion/funnel, referrers, UTM campaigns), reshapes the rows into the exact JSON shape the existing `Dashboard.jsx` charts expect, and renders it. Refresh is on-demand only (page load + a manual button) — no cache, no cron.

**Tech Stack:** Remix (Vite), `@shopify/shopify-app-remix`, Prisma (SQLite dev / Postgres prod), Recharts (existing), Vitest for unit tests, Render for hosting.

**Spec:** `docs/superpowers/specs/2026-08-14-shopify-app-conversion-design.md`

## Global Constraints

- Single-tenant only: one install = one shop's own data. No cross-store aggregation anywhere in the new app.
- No hardcoded store list (`cp`/`nb`/`n4`/`cpp`/`nbp`/`n4p`) anywhere in new code — the shop comes from the authenticated session.
- Data refresh is on-demand only: fresh fetch on every dashboard page load, plus a manual "Refresh Data" button. No time-based cache, no background jobs.
- Required OAuth scope: `read_reports` only.
- All ShopifyQL field names must come from `shopify.dev` docs search (via the `shopify-shopifyql` skill) — never hand-guessed — and validated by running against a real dev store before being considered done.
- Keep the existing single-store chart/table components from `Dashboard.jsx` (`StoreOverview`, `StoreSales`, `StoreFunnel`, `StoreConversion`, `StoreAOV`, `StoreTraffic`, `StoreCampaign`) visually unchanged. Delete the multi-store comparison components (`AllOverview`, `AllConversion`, `AllFunnel`, `AllAOV`, `AllTraffic`, `AllCampaign`) and the store-switcher UI — confirmed with the user as the necessary consequence of going single-tenant.
- Distribution type: Custom Distribution (one Partner Dashboard app, one install link, no App Store review).

---

### Task 1: Scaffold the Remix app, initialize git, archive the old Next.js/CSV code

**Files:**
- Create: full Remix template tree (via Shopify CLI) at the project root
- Create: `legacy-nextjs-csv-app/` (archive directory)
- Move: `app/page.js`, `app/layout.js`, `app/api/dashboard/route.js`, `components/Dashboard.jsx`, `lib/google-drive.js`, `lib/parse-csv.js`, `package.json`, `package-lock.json`, `next.config.js`, `.env.example`, `README.md` → `legacy-nextjs-csv-app/`

**Interfaces:**
- Produces: a working Remix dev environment (`npm run dev` via Shopify CLI succeeds), `prisma/schema.prisma`, `shopify.app.toml`, `app/shopify.server.js` — all later tasks build inside this tree.

- [ ] **Step 1: Look up the correct scaffold command**

Use the `shopify-use-shopify-cli` skill to confirm the exact `shopify app init` invocation for the installed CLI version (template repo URL, whether it supports scaffolding into a non-empty directory or requires a fresh subfolder, and the Remix template's default database). Do not guess the flags — get them from the skill/docs.

- [ ] **Step 2: Archive the old Next.js app**

```bash
mkdir legacy-nextjs-csv-app
git init
mv app components lib package.json package-lock.json next.config.js .env.example README.md legacy-nextjs-csv-app/
```

- [ ] **Step 3: Scaffold the Remix template into a temp folder, then move it to project root**

```bash
shopify app init <flags-from-step-1> --path=./_scaffold_tmp
mv _scaffold_tmp/{.,}* . 2>/dev/null; rmdir _scaffold_tmp
```

(Exact move mechanics depend on what the CLI actually generates — adjust so the scaffolded `app/`, `prisma/`, `shopify.app.toml`, `package.json`, etc. end up at the project root, sitting alongside `legacy-nextjs-csv-app/`.)

- [ ] **Step 4: Verify the scaffold**

Run: `ls app/shopify.server.js prisma/schema.prisma shopify.app.toml`
Expected: all three files exist.

Run: `npm install && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Verify mandatory GDPR webhooks are present**

Run: `ls app/routes | grep webhooks`
Expected: the template's default webhook routes exist (typically covering `customers/data_request`, `customers/redact`, and `shop/redact`) — Partner Dashboard apps require these regardless of distribution type. Do not modify them; just confirm they shipped with the scaffold.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Remix app, archive legacy Next.js CSV app"
```

---

### Task 2: Configure app scopes and link to Partner Dashboard (Custom Distribution)

**Files:**
- Modify: `shopify.app.toml`

**Interfaces:**
- Produces: an app registered in Partner Dashboard with `read_reports` scope, distribution set to custom, ready for `shopify app dev`/`deploy` in later tasks.

- [ ] **Step 1: Set the scope**

In `shopify.app.toml`, under the access scopes section, set:

```toml
[access_scopes]
scopes = "read_reports"
```

- [ ] **Step 2: Link the app**

Use the `shopify-use-shopify-cli` skill to confirm the current command for linking/creating a Partner Dashboard app from this config (e.g. `shopify app config link`) and for setting distribution to Custom Distribution. Run it.

- [ ] **Step 3: Verify**

Run: `shopify app info`
Expected: output shows `read_reports` under scopes and the app name matches `shopify.app.toml`.

- [ ] **Step 4: Commit**

```bash
git add shopify.app.toml
git commit -m "chore: configure read_reports scope and link Partner Dashboard app"
```

---

### Task 3: Configure Prisma for production Postgres

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: the template's default `Session` model (shop, accessToken, scope, etc.) — unchanged.
- Produces: a schema whose `datasource db` reads `DATABASE_URL` from the environment and uses the `postgresql` provider, so Render Postgres works in production while local dev can still point at a local Postgres or SQLite as the template documents.

- [ ] **Step 1: Read the template's own guidance**

Open the scaffolded template's README/docs comment about switching database providers (Shopify's Remix template documents this explicitly). Follow its exact steps rather than guessing.

- [ ] **Step 2: Update the datasource block**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 3: Verify**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

Run: `npx prisma generate`
Expected: Prisma Client generated with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "chore: switch Prisma datasource to Postgres for production"
```

---

### Task 4: Refactor Dashboard.jsx to single-tenant

**Files:**
- Create: `app/components/Dashboard.jsx` (ported from `legacy-nextjs-csv-app/components/Dashboard.jsx`)

**Interfaces:**
- Consumes: `data = { store: {...single-store metrics...}, months: string[], lastUpdated: string, shopName: string }`, `onRefresh: () => void`, `isRefreshing: boolean` — all supplied by the loader built in Task 11.
- Produces: `export default function Dashboard({ data, onRefresh, isRefreshing })` — the sole export later tasks import.

- [ ] **Step 1: Copy the file over**

```bash
cp legacy-nextjs-csv-app/components/Dashboard.jsx app/components/Dashboard.jsx
```

- [ ] **Step 2: Delete the six multi-store comparison functions**

Delete these function blocks entirely (from their `// ═══ ALL STORES ... ═══` comment header through their closing `}`):
- `AllFunnel`
- `AllConversion`
- `AllAOV`
- `AllTraffic`
- `AllCampaign`
- `AllOverview`

- [ ] **Step 3: Replace the main `Dashboard` export**

Replace the entire `export default function Dashboard({ data }) { ... }` block with:

```jsx
export default function Dashboard({ data, onRefresh, isRefreshing }) {
  var stT=useState("overview"),tab=stT[0],setTab=stT[1];
  var ST = data.store || {};
  var MO = data.months || [];
  var maxIdx = MO.length - 1;

  var stR1s=useState(0),r1s=stR1s[0],setR1s=stR1s[1];
  var stR1e=useState(Math.min(8,maxIdx)),r1e=stR1e[0],setR1e=stR1e[1];
  var stR2s=useState(Math.min(9,maxIdx)),r2s=stR2s[0],setR2s=stR2s[1];
  var stR2e=useState(maxIdx),r2e=stR2e[0],setR2e=stR2e[1];
  var stDP=useState(false),showDP=stDP[0],setShowDP=stDP[1];

  var ac = CL.al;
  var tabs=[{id:"overview",label:"Overview"},{id:"sales",label:"Net Sales"},{id:"conversion",label:"Conversion"},{id:"aov",label:"AOV & Orders"},{id:"funnel",label:"Funnel"},{id:"traffic",label:"Traffic"},{id:"campaigns",label:"Campaigns"}];
  var sp={store:ST,ac:ac,nm:data.shopName||"Store",months:MO,r1s:r1s,r1e:r1e,r2s:r2s,r2e:r2e};

  function renderTab(){
    if(tab==="overview")return<StoreOverview {...sp}/>;
    if(tab==="sales")return<StoreSales {...sp}/>;
    if(tab==="conversion")return<StoreConversion {...sp}/>;
    if(tab==="aov")return<StoreAOV {...sp}/>;
    if(tab==="funnel")return<StoreFunnel {...sp}/>;
    if(tab==="traffic")return<StoreTraffic store={ST} ac={ac} months={MO}/>;
    if(tab==="campaigns")return<StoreCampaign store={ST} ac={ac}/>;
    return null;
  }

  var lblS={fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4};

  return(
    <div style={{minHeight:"100vh",background:CL.bg,color:CL.tx,fontFamily:"system-ui, sans-serif"}}>
      <div style={{background:CL.cd,borderBottom:"1px solid "+CL.bd,padding:"12px 16px 10px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <h1 style={{fontSize:16,fontWeight:700,margin:0}}>{data.shopName||"Store"} — Analytics</h1>
            <p style={{fontSize:9,color:CL.mt,margin:"1px 0 0"}}>{MO[0]} - {MO[MO.length-1]} {data.lastUpdated ? " · Updated: "+new Date(data.lastUpdated).toLocaleString() : ""}</p>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={function(){setShowDP(!showDP);}} style={{display:"flex",alignItems:"center",gap:5,background:showDP?CL.al+"20":CL.bg,border:"1px solid "+(showDP?CL.al:CL.bd),borderRadius:6,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",color:showDP?CL.al:CL.mt,fontSize:10,fontWeight:600}}>📅 Compare</button>
            <button onClick={onRefresh} disabled={isRefreshing} style={{display:"flex",alignItems:"center",gap:4,background:CL.bg,border:"1px solid "+CL.bd,borderRadius:6,padding:"5px 10px",cursor:isRefreshing?"default":"pointer",fontFamily:"inherit",color:CL.mt,fontSize:10,fontWeight:600,opacity:isRefreshing?0.6:1}}>🔄 {isRefreshing?"Refreshing...":"Refresh Data"}</button>
          </div>
        </div>
        {showDP&&<div style={{background:CL.bg,border:"1px solid "+CL.bd,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:1,minWidth:180}}><div style={{...lblS,color:CL.am}}>◆ Period 1</div><div style={{display:"flex",gap:6,alignItems:"center"}}><MonthPicker val={r1s} months={MO} onChange={function(v){setR1s(v);if(v>r1e)setR1e(v);}}/><span style={{fontSize:9,color:CL.dm}}>to</span><MonthPicker val={r1e} months={MO} onChange={function(v){setR1e(v);if(v<r1s)setR1s(v);}}/></div></div>
            <div style={{flex:1,minWidth:180}}><div style={{...lblS,color:CL.al}}>▸ Period 2</div><div style={{display:"flex",gap:6,alignItems:"center"}}><MonthPicker val={r2s} months={MO} onChange={function(v){setR2s(v);if(v>r2e)setR2e(v);}}/><span style={{fontSize:9,color:CL.dm}}>to</span><MonthPicker val={r2e} months={MO} onChange={function(v){setR2e(v);if(v<r2s)setR2s(v);}}/></div></div>
          </div>
          <div style={{display:"flex",gap:16,marginTop:8,fontSize:9}}><span style={{color:CL.am}}>◆ P1: {pLabel(MO,r1s,r1e)}</span><span style={{color:CL.al}}>▸ P2: {pLabel(MO,r2s,r2e)}</span></div>
        </div>}
      </div>
      <div style={{display:"flex",gap:2,padding:"6px 16px",borderBottom:"1px solid "+CL.bd,background:CL.cd,overflowX:"auto",position:"sticky",top:showDP?195:85,zIndex:19}}>
        {tabs.map(function(t){return<button key={t.id} onClick={function(){setTab(t.id);}} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab===t.id?ac:"transparent",color:tab===t.id?"#fff":CL.mt,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{t.label}</button>;})}
      </div>
      <div style={{padding:"10px 16px 40px",maxWidth:1200,margin:"0 auto"}}>{renderTab()}</div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it builds**

Run: `npm run build`
Expected: no errors, no references to `DS`, `proj`, `projects`, or any `All*` component remain (grep to confirm: `grep -n "AllFunnel\|AllConversion\|AllAOV\|AllTraffic\|AllCampaign\|AllOverview\|DS\.\|setProj" app/components/Dashboard.jsx` returns nothing).

- [ ] **Step 5: Commit**

```bash
git add app/components/Dashboard.jsx
git commit -m "refactor: convert Dashboard.jsx to single-tenant, drop multi-store comparison views"
```

---

### Task 5: ShopifyQL query runner core

**Files:**
- Create: `app/lib/shopifyql-fetch.js`
- Test: `app/lib/shopifyql-fetch.test.js`

**Interfaces:**
- Produces: `runShopifyQL(admin, shopifyqlBody: string): Promise<Array<Object>>` — rows as plain objects keyed by column name. `ShopifyQLError` (extends `Error`, has `.parseErrors: string[]`) — thrown when the query returns parse errors.
- Consumes: `admin.graphql(query, { variables })` from `@shopify/shopify-app-remix`'s `authenticate.admin(request)` — returns a `Response`-like object whose `.json()` resolves to `{ data, errors? }`.

- [ ] **Step 1: Add Vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

```js
// app/lib/shopifyql-fetch.test.js
import { describe, it, expect, vi } from "vitest";
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
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run app/lib/shopifyql-fetch.test.js`
Expected: FAIL — `Cannot find module './shopifyql-fetch'`

- [ ] **Step 4: Implement**

```js
// app/lib/shopifyql-fetch.js
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

    if (!result || (result.parseErrors && result.parseErrors.length > 0)) {
      throw new ShopifyQLError((result && result.parseErrors) || ["Unknown ShopifyQL error"]);
    }

    return rowsToObjects(result.tableData);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run app/lib/shopifyql-fetch.test.js`
Expected: PASS (2/2)

- [ ] **Step 6: Commit**

```bash
git add app/lib/shopifyql-fetch.js app/lib/shopifyql-fetch.test.js package.json
git commit -m "feat: add ShopifyQL query runner with retry and parse-error handling"
```

---

### Task 6: Net sales + AOV fetcher

**Files:**
- Create: `app/lib/analytics/sales.js`
- Test: `app/lib/analytics/sales.test.js`

**Interfaces:**
- Consumes: `runShopifyQL(admin, query)` from Task 5.
- Produces: `fetchSalesAndAOV(admin): Promise<{ s: number[], sp: number[], av: number[], ap: number[], or: number[] }>` — 12 months current (`s`,`av`,`or`), 12 months same window one year prior (`sp`,`ap`).

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/analytics/sales.test.js`
Expected: FAIL — `fetchSalesAndAOV is not a function`

- [ ] **Step 3: Implement**

```js
// app/lib/analytics/sales.js
import { runShopifyQL } from "../shopifyql-fetch";

function salesQuery(since, until) {
  return `FROM sales SHOW net_sales, orders TIMESERIES month SINCE ${since} UNTIL ${until} ORDER BY month ASC`;
}

export async function fetchSalesAndAOV(admin) {
  const current = await runShopifyQL(admin, salesQuery("-12m", "today"));
  const prior = await runShopifyQL(admin, salesQuery("-24m", "-12m"));

  return {
    s: current.map((r) => r.net_sales || 0),
    or: current.map((r) => r.orders || 0),
    av: current.map((r) => (r.orders > 0 ? r.net_sales / r.orders : 0)),
    sp: prior.map((r) => r.net_sales || 0),
    ap: prior.map((r) => (r.orders > 0 ? r.net_sales / r.orders : 0)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/analytics/sales.test.js`
Expected: PASS

- [ ] **Step 5: Validate the query against a real dev store**

Use the `shopify-shopifyql` skill's process: search `shopify.dev` for the `sales` schema to reconfirm `net_sales`/`orders` are current (non-deprecated) field names for the installed API version, then run both query variants (current window and `-24m UNTIL -12m`) via `shopify store execute` against a connected dev store. Confirm `parseErrors` is empty and the returned columns are numeric. If field names differ, update `salesQuery` and re-run this step before moving on.

- [ ] **Step 6: Commit**

```bash
git add app/lib/analytics/sales.js app/lib/analytics/sales.test.js
git commit -m "feat: fetch net sales and AOV via ShopifyQL"
```

---

### Task 7: Conversion rate + funnel fetcher

**Files:**
- Create: `app/lib/analytics/conversion.js`
- Test: `app/lib/analytics/conversion.test.js`

**Interfaces:**
- Consumes: `runShopifyQL(admin, query)` from Task 5.
- Produces: `fetchConversionAndFunnel(admin): Promise<{ se, ca, rc, ck, cv, acr, ccr, c2c, sep, cap, rcp, ckp, cvp, acrp, ccrp, c2cp }>` (all `number[]`).

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/analytics/conversion.test.js`
Expected: FAIL — `fetchConversionAndFunnel is not a function`

- [ ] **Step 3: Implement**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/analytics/conversion.test.js`
Expected: PASS

- [ ] **Step 5: Validate against a real dev store**

Via the `shopify-shopifyql` skill: reconfirm the `sessions` schema field names (`sessions`, `sessions_with_cart_additions`, `sessions_that_reached_checkout`, `sessions_that_completed_checkout`, `conversion_rate`, `human_or_bot_session`) are current, then run both query windows with `shopify store execute` against a dev store. **Specifically check whether `conversion_rate` is returned as a fraction (e.g. `0.05`) or already a percent (e.g. `5`)** — if it's already a percent, remove the `* 100` in `toRates`. Confirm `parseErrors` is empty before moving on.

- [ ] **Step 6: Commit**

```bash
git add app/lib/analytics/conversion.js app/lib/analytics/conversion.test.js
git commit -m "feat: fetch conversion rate and funnel metrics via ShopifyQL"
```

---

### Task 8: Sessions-by-referrer fetcher

**Files:**
- Create: `app/lib/analytics/referrers.js`
- Test: `app/lib/analytics/referrers.test.js`

**Interfaces:**
- Consumes: `runShopifyQL(admin, query)` from Task 5.
- Produces: `fetchReferrers(admin): Promise<Array<{ n: string, s: number, r: number }>>` — top 10 referrers by sessions.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/analytics/referrers.test.js`
Expected: FAIL — `fetchReferrers is not a function`

- [ ] **Step 3: Implement**

```js
// app/lib/analytics/referrers.js
import { runShopifyQL } from "../shopifyql-fetch";

function referrersQuery() {
  return `FROM sessions SHOW sessions, conversion_rate WHERE human_or_bot_session = 'human' GROUP BY referrer_source SINCE -12m UNTIL today ORDER BY sessions DESC LIMIT 10`;
}

export async function fetchReferrers(admin) {
  const rows = await runShopifyQL(admin, referrersQuery());
  return rows.map((r) => ({
    n: r.referrer_source || "Unknown",
    s: r.sessions || 0,
    r: parseFloat(((r.conversion_rate || 0) * 100).toFixed(2)),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/analytics/referrers.test.js`
Expected: PASS

- [ ] **Step 5: Validate against a real dev store**

Via the `shopify-shopifyql` skill: reconfirm `referrer_source` is a valid `GROUP BY` dimension on the `sessions` schema, then run the query with `shopify store execute`. Apply the same `conversion_rate` fraction-vs-percent check as Task 7 and adjust if needed. Confirm `parseErrors` is empty.

- [ ] **Step 6: Commit**

```bash
git add app/lib/analytics/referrers.js app/lib/analytics/referrers.test.js
git commit -m "feat: fetch sessions-by-referrer via ShopifyQL"
```

---

### Task 9: UTM campaign performance fetcher

**Files:**
- Create: `app/lib/analytics/campaigns.js`
- Test: `app/lib/analytics/campaigns.test.js`

**Interfaces:**
- Consumes: `runShopifyQL(admin, query)` from Task 5.
- Produces: `fetchCampaigns(admin): Promise<{ campaigns: Array<{nm,ch,tt,se,sa,or,cv,av,cl}>, channels: Array<{ch,se,sa,or,cl,campaigns,cv,av}> }>`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/analytics/campaigns.test.js`
Expected: FAIL — `fetchCampaigns is not a function`

- [ ] **Step 3: Implement**

```js
// app/lib/analytics/campaigns.js
import { runShopifyQL } from "../shopifyql-fetch";

function campaignSessionsQuery() {
  return `FROM campaign_sessions SHOW campaign_sessions, campaign_conversion_rate GROUP BY utm_campaign, referring_channel, traffic_type SINCE -12m UNTIL today ORDER BY campaign_sessions DESC LIMIT 30`;
}

function campaignSalesQuery() {
  return `FROM campaign_sales SHOW campaign_last_non_direct_click_order_count, campaign_last_non_direct_click_total_sales, campaign_last_non_direct_click_total_average_order_value GROUP BY utm_campaign SINCE -12m UNTIL today ORDER BY campaign_last_non_direct_click_total_sales DESC LIMIT 30`;
}

const CHANNEL_COLORS = {
  Email: "#818CF8", Social: "#EC4899", Search: "#F59E0B",
  Direct: "#34D399", Referral: "#06B6D4", Paid: "#3B82F6", Other: "#6B7280",
};

function colorFor(channel) {
  const key = (channel || "Other").toLowerCase();
  for (const [k, v] of Object.entries(CHANNEL_COLORS)) {
    if (key.includes(k.toLowerCase())) return v;
  }
  return "#6B7280";
}

export async function fetchCampaigns(admin) {
  const [sessionRows, salesRows] = await Promise.all([
    runShopifyQL(admin, campaignSessionsQuery()),
    runShopifyQL(admin, campaignSalesQuery()),
  ]);

  const salesByCampaign = {};
  salesRows.forEach((r) => {
    salesByCampaign[r.utm_campaign] = {
      sa: r.campaign_last_non_direct_click_total_sales || 0,
      or: r.campaign_last_non_direct_click_order_count || 0,
      av: r.campaign_last_non_direct_click_total_average_order_value || 0,
    };
  });

  const campaigns = sessionRows
    .map((r) => {
      const sales = salesByCampaign[r.utm_campaign] || { sa: 0, or: 0, av: 0 };
      const channel = r.referring_channel || r.traffic_type || "Direct";
      return {
        nm: r.utm_campaign || "(no name)",
        ch: channel,
        tt: r.traffic_type || "",
        se: r.campaign_sessions || 0,
        sa: sales.sa,
        or: sales.or,
        cv: parseFloat(((r.campaign_conversion_rate || 0) * 100).toFixed(2)),
        av: sales.av,
        cl: colorFor(channel),
      };
    })
    .sort((a, b) => b.sa - a.sa);

  const channelMap = {};
  campaigns.forEach((c) => {
    const key = c.ch || "Other";
    if (!channelMap[key]) channelMap[key] = { ch: key, se: 0, sa: 0, or: 0, cl: c.cl, campaigns: 0 };
    channelMap[key].se += c.se;
    channelMap[key].sa += c.sa;
    channelMap[key].or += c.or;
    channelMap[key].campaigns += 1;
  });
  const channels = Object.values(channelMap)
    .map((ch) => {
      ch.cv = ch.se > 0 ? parseFloat((ch.or / ch.se * 100).toFixed(1)) : 0;
      ch.av = ch.or > 0 ? parseFloat((ch.sa / ch.or).toFixed(2)) : 0;
      return ch;
    })
    .sort((a, b) => b.sa - a.sa);

  return { campaigns, channels };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/analytics/campaigns.test.js`
Expected: PASS

- [ ] **Step 5: Validate against a real dev store**

Via the `shopify-shopifyql` skill: reconfirm `campaign_sessions` (fields `campaign_sessions`, `campaign_conversion_rate`, `utm_campaign`, `referring_channel`, `traffic_type`) and `campaign_sales` (fields `campaign_last_non_direct_click_order_count`, `campaign_last_non_direct_click_total_sales`, `campaign_last_non_direct_click_total_average_order_value`) are current, non-deprecated field names for the installed API version — the `_total_sales`/`_total_average_order_value` naming replaced older deprecated `_sales`/`_average_order_value` fields as of the 2026-07 API version, so re-check this hasn't shifted again. Run both queries with `shopify store execute` against a dev store with UTM-tagged traffic and confirm `parseErrors` is empty and campaign names join correctly between the two result sets.

- [ ] **Step 6: Commit**

```bash
git add app/lib/analytics/campaigns.js app/lib/analytics/campaigns.test.js
git commit -m "feat: fetch UTM campaign performance via ShopifyQL"
```

---

### Task 10: Combine all fetchers into the Dashboard-ready shape

**Files:**
- Create: `app/lib/transform-analytics.js`
- Test: `app/lib/transform-analytics.test.js`

**Interfaces:**
- Consumes: `fetchSalesAndAOV`, `fetchConversionAndFunnel` (Task 6, 7), `fetchReferrers` (Task 8), `fetchCampaigns` (Task 9).
- Produces: `fetchStoreAnalytics(admin): Promise<{ store: Object, months: string[], lastUpdated: string }>` — this is the exact shape Task 11's loader passes to `Dashboard.jsx` (as `data.store`, `data.months`, `data.lastUpdated`).

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/transform-analytics.test.js`
Expected: FAIL — `fetchStoreAnalytics is not a function`

- [ ] **Step 3: Implement**

```js
// app/lib/transform-analytics.js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/transform-analytics.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/lib/transform-analytics.js app/lib/transform-analytics.test.js
git commit -m "feat: combine ShopifyQL fetchers into the dashboard data shape"
```

---

### Task 11: Dashboard route — loader, error/empty states, Refresh Data button

**Files:**
- Create: `app/routes/app.dashboard.jsx`
- Modify: `app/routes/app._index.jsx` (redirect to `/app/dashboard`)

**Interfaces:**
- Consumes: `fetchStoreAnalytics(admin)` (Task 10), `ShopifyQLError` (Task 5), `authenticate.admin(request)` (from the scaffolded `app/shopify.server.js`), `Dashboard` (Task 4).
- Produces: the `/app/dashboard` route, embedded in Shopify Admin, which is what merchants see on install.

- [ ] **Step 1: Write the route**

```jsx
// app/routes/app.dashboard.jsx
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { fetchStoreAnalytics } from "../lib/transform-analytics";
import { ShopifyQLError } from "../lib/shopifyql-fetch";
import Dashboard from "../components/Dashboard";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  try {
    const data = await fetchStoreAnalytics(admin);
    return json({ ...data, shopName: session.shop, error: null });
  } catch (err) {
    if (err instanceof ShopifyQLError) {
      return json({ error: err.message, shopName: session.shop, store: null, months: [], lastUpdated: null });
    }
    throw err;
  }
}

export default function DashboardRoute() {
  const data = useLoaderData();
  const revalidator = useRevalidator();

  if (data.error) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#EF4444", marginBottom: 12 }}>{data.error}</p>
        <button onClick={() => revalidator.revalidate()}>Retry</button>
      </div>
    );
  }

  const totalSales = (data.store.s || []).reduce((sum, v) => sum + v, 0);

  if (totalSales === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif", color: "#94A3B8" }}>
        <p>No orders found for this store yet in the last 12 months.</p>
      </div>
    );
  }

  return (
    <Dashboard
      data={data}
      onRefresh={() => revalidator.revalidate()}
      isRefreshing={revalidator.state === "loading"}
    />
  );
}
```

- [ ] **Step 2: Point the index route at the dashboard**

Check `app/routes/app._index.jsx` (template default) — replace its body with a redirect:

```jsx
// app/routes/app._index.jsx
import { redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/app/dashboard");
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/routes/app.dashboard.jsx app/routes/app._index.jsx
git commit -m "feat: add dashboard route with on-demand refresh and error/empty states"
```

---

### Task 12: Final cleanup and README

**Files:**
- Create: `README.md` (new, replacing the old one archived in Task 1)
- Modify: `.gitignore`

**Interfaces:** None — this task produces no new code interfaces, only documentation and repo hygiene.

- [ ] **Step 1: Confirm no dead references remain**

Run: `grep -rn "google-drive\|parse-csv\|papaparse\|DRIVE_FOLDER" app/ prisma/ shopify.app.toml`
Expected: no matches (the old CSV/Drive code only exists under `legacy-nextjs-csv-app/`, which this grep does not need to touch).

- [ ] **Step 2: Exclude the legacy folder from the deployed app**

Add to `.gitignore` (or `.dockerignore`, whichever the scaffolded template uses for build exclusion) — actually since it needs to stay in git for reference, add it only to `.dockerignore`:

```
legacy-nextjs-csv-app/
```

- [ ] **Step 3: Write the new README**

Document: what the app does now (live ShopifyQL sync, single-tenant, on-demand refresh), how to run `shopify app dev` locally, how to deploy (link forward to Task 13's deployment steps), and how to add a new store (share the Custom Distribution install link — no code changes).

- [ ] **Step 4: Commit**

```bash
git add README.md .dockerignore
git commit -m "docs: rewrite README for the Shopify app, exclude legacy CSV app from builds"
```

---

### Task 13: Deployment — Render + Postgres + Partner Dashboard URLs

**Files:**
- Create: `Dockerfile` (if the scaffolded template didn't already include one usable for Render)
- Modify: `shopify.app.toml` (application_url, redirect URLs)

**Interfaces:** None — infrastructure/config only.

- [ ] **Step 1: Confirm or add a Dockerfile**

Check if the scaffolded Remix template already ships a `Dockerfile`. If yes, verify it runs `npm run build` then `npm run start`. If not, add one:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

- [ ] **Step 2: Create the Render services**

1. Create a Render **Postgres** instance, copy its internal `DATABASE_URL`.
2. Create a Render **Web Service** from this repo (Docker runtime).
3. Set environment variables: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` (from Partner Dashboard), `SCOPES=read_reports`, `DATABASE_URL` (from step 1), `SHOPIFY_APP_URL` (Render's assigned `https://<service>.onrender.com`).

- [ ] **Step 3: Run the production DB migration**

Use Render's shell (or a Render one-off job) to run:

```bash
npx prisma migrate deploy
```

Expected: migration applies with no errors, `Session` table exists in the Postgres instance.

- [ ] **Step 4: Update Partner Dashboard URLs**

In `shopify.app.toml`, set `application_url` and the OAuth redirect URL to the Render domain from Step 2. Run:

```bash
shopify app deploy
```

Expected: deploy succeeds, Partner Dashboard reflects the new URLs.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile shopify.app.toml
git commit -m "chore: add Render deployment config and production database migration"
```

---

### Task 14: End-to-end QA on a real dev store

**Files:** None — manual verification task.

**Interfaces:** None.

- [ ] **Step 1: Install on a dev store**

Run: `shopify app dev` (per the `shopify-use-shopify-cli` skill's guidance for the current CLI version), install the app on a connected development store when prompted.

- [ ] **Step 2: Verify the dashboard loads**

Open the app in Shopify Admin. Confirm:
- The dashboard loads with the dev store's own data (or the "No orders found" empty state if the dev store has no orders).
- All 7 tabs (Overview, Net Sales, Conversion, AOV & Orders, Funnel, Traffic, Campaigns) render without errors.
- No "All Stores" comparison view or store-switcher is visible anywhere.

- [ ] **Step 3: Verify the Refresh Data button**

Click "Refresh Data". Confirm the button shows "Refreshing..." while `revalidator.state === "loading"`, then returns to showing fresh data without a full page reload.

- [ ] **Step 4: Verify error handling**

Temporarily break one query (e.g. misspell a field in `sales.js`), confirm the dashboard shows the readable error card with a working "Retry" button instead of crashing, then revert the change.

- [ ] **Step 5: Compare visually against the old app**

Run the old CSV-based app from `legacy-nextjs-csv-app/` side by side (or from git history) and confirm chart types, colors, and layout for the single-store views match what shipped before.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: complete end-to-end QA for Shopify app conversion" --allow-empty
```
