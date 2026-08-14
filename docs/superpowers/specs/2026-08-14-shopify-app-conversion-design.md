# Shopify Custom App Conversion — Design Spec

**Date:** 2026-08-14
**Status:** Approved by user, pending final spec review

## Problem

The current project is a standalone Next.js app that reads Shopify CSV report
exports from Google Drive (manually uploaded), parses them, and renders a
multi-store analytics dashboard. Adding or updating data requires manual CSV
export + upload. Adding a new store requires editing three files
(`lib/google-drive.js`, `lib/parse-csv.js`, `components/Dashboard.jsx`) and
redeploying.

## Goal

Convert this into a Shopify custom-distribution app that:
- Any Shopify store can install via a single install link, with zero code
  changes per store.
- On open, shows that store's own live analytics (no cross-store portfolio
  view) — replacing 100% of manual CSV work with live queries.
- Preserves the current dashboard UI/layout (`components/Dashboard.jsx`)
  unchanged — same charts, same visual design.
- Refreshes data on every page load, plus a manual "Refresh Data" button —
  no background jobs, no time-based cache.

## Confirmed decisions

| Decision | Choice |
|---|---|
| Data scope per install | Single-tenant — each install shows only its own store's data |
| Framework | Shopify CLI Remix template (`shopify app init`) — Node + Remix + Prisma + App Bridge |
| Hosting | Render (Web Service + Postgres) |
| "Pro" store variants (cpp/nbp/n4p) | Independent Shopify stores — no special handling needed; single-tenant model covers them naturally, hardcoded store list is removed entirely |
| Refresh strategy | On-demand only: fetch fresh on every dashboard load, plus a manual "Refresh Data" button — no cache layer, no cron |
| UI | Keep `Dashboard.jsx` as-is (charts, dark theme, layout) — embedded inside Shopify Admin via App Bridge, no Polaris redesign |
| Distribution type | Custom Distribution (Partner Dashboard) — one app, one install link, installable on any store without App Store review |
| Toolkit usage | All implementation work goes through the installed Shopify AI Toolkit skills — `shopify-use-shopify-cli` (scaffold, config validation, store execution), `shopify-shopifyql` (query authoring — search docs → build only from confirmed fields → validate by running), `shopify-admin` (any other Admin GraphQL needs), `shopify-custom-data` (only if metafields/metaobjects become necessary) |
| "All Stores" comparison UI (`AllFunnel`, `AllConversion`, `AllAOV`, cross-store heatmap tables) | **Dropped.** These components are hardcoded to compare all 6 legacy stores (`DS.cp`/`DS.nb`/`DS.n4`/`DS.cpp`/`DS.nbp`/`DS.n4p`) side-by-side, which cannot function in a single-tenant install where only one store's data exists. Only the single-store views (`StoreOverview`, `StoreSales`, `StoreFunnel`, `StoreConversion`) carry over — confirmed with user after flagging the conflict with the single-tenant decision. |

## Architecture

```
Shopify Partner Dashboard (Custom Distribution app)
        │  OAuth install (per store)
        ▼
Remix App (Node server, hosted on Render) ── Prisma (Postgres)
   │                                              │
   │  embedded in Shopify Admin iframe            └─ Session model: shop, accessToken, scope
   │  (App Bridge)
   ▼
app/routes/app.dashboard.jsx
   │  loader: on every page load, fetches fresh data
   │  "Refresh Data" button: re-runs the same loader on demand
   ▼
Admin GraphQL API → shopifyqlQuery(query: "FROM ... SHOW ...")
   ▼
lib/shopifyql-fetch.js   (replaces lib/google-drive.js)
   ▼
lib/transform-analytics.js   (replaces the CSV-parsing part of lib/parse-csv.js)
   │  reshapes ShopifyQL tableData.rows into the exact same JSON keys
   │  Dashboard.jsx already reads (e.g. `s`, `rf`, `ut`)
   ▼
components/Dashboard.jsx   (UNCHANGED — same charts, heatmaps, funnels, layout)
```

The single-tenant model removes the hardcoded 6-store list (`cp`, `nb`, `n4`,
`cpp`, `nbp`, `n4p`) entirely — whichever shop the app is installed on is the
shop whose data is fetched, keyed by the session's shop domain.

## Data mapping: CSV reports → ShopifyQL

| Old CSV report | New source | ShopifyQL schema/fields |
|---|---|---|
| Net sales over time | `shopifyqlQuery` | `sales` schema — `net_sales`, `TIMESERIES` |
| Average order value over time | `shopifyqlQuery` | `sales` schema — `net_sales`, `orders`; AOV computed as `net_sales / orders` in `transform-analytics.js` |
| Conversion rate over time | `shopifyqlQuery` | `sessions` schema — `sessions`, `conversion_rate`, filtered `human_or_bot_session = 'human'` |
| Sessions by referrer | `shopifyqlQuery` | `sessions` schema — `sessions`, `conversion_rate` grouped by `referrer_source` |
| Performance by UTM campaign | `shopifyqlQuery` | `campaign_sessions` schema — `campaign_sessions`, `campaign_conversion_rate` grouped by `utm_campaign` (paired with `campaign_sales` if per-campaign revenue is needed) |

Field names above are confirmed to exist in the relevant ShopifyQL schemas via
`shopify.dev` docs search. Exact query syntax (timeseries grain, group-by
combinations, ordering) will be finalized and validated against a live store
during implementation, per the `shopify-shopifyql` skill's mandatory
search-then-validate process — no field name will be hand-guessed into the
final code.

## Required scopes

`read_reports` only. No customer PII scope needed — all queries are
store-level aggregates, not individual customer records.

Server-side calls only (Remix backend loader, using the session's access
token) — no `embedded_app_direct_api_access` toml flag needed, since that
flag is only required for browser-side ShopifyQL calls via analytics web
components, which this design does not use.

## Install / auth flow

1. Store owner opens the Custom Distribution install link → Shopify OAuth
   consent (`read_reports`) → approve.
2. Remix template's `auth.$.jsx` handles token exchange → `Session` (shop +
   access token) saved to Postgres via Prisma.
3. Redirect to `/app/dashboard` — embedded in Shopify Admin via App Bridge.
4. Mandatory GDPR webhooks (`customers/data_request`, `customers/redact`,
   `shop/redact`) included via the Remix template default, as required by
   Partner Dashboard apps regardless of distribution type.

## Error handling

- ShopifyQL `parseErrors` non-empty → readable error card in the UI with a
  retry action; the rest of the dashboard does not crash.
- Expired/revoked access token (e.g. app was uninstalled and reinstalled) →
  Remix template's built-in re-auth redirect.
- New store with no orders/sessions yet → empty-state charts (zero data),
  no crash.
- Admin API rate limiting → retry-with-backoff in `lib/shopifyql-fetch.js`.

## Testing

- `shopify app dev` for local install + live testing on a dev store via
  Shopify CLI tunnel.
- Every ShopifyQL query validated with `shopify store execute` before being
  wired into the loader (shopify-shopifyql skill's mandatory step).
- Unit tests for `transform-analytics.js`: given sample ShopifyQL table
  rows, output JSON keys must match what `Dashboard.jsx` currently expects
  from `parse-csv.js`.
- Manual QA: install on a real dev store, visually compare charts/heatmaps/
  funnels against the current CSV-based version.

## Deployment

1. `shopify app deploy` — pushes app config (scopes, webhooks) to Partner
   Dashboard.
2. Push code to Git → connect as a Render Web Service (Node).
3. Render env vars: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`,
   `SCOPES=read_reports`, `SHOPIFY_APP_URL`, `DATABASE_URL`.
4. Add Render Postgres (replacing Prisma's default SQLite, which won't
   persist on Render's ephemeral disk) → `npx prisma migrate deploy` on
   first deploy.
5. Update app URL + redirect URLs in Partner Dashboard to the Render domain.

## Adding a new store (post-conversion)

1. Share the Custom Distribution install link with the new store owner.
2. They approve the `read_reports` scope.
3. Done — dashboard is live immediately. Zero code changes, zero redeploy.

## Out of scope

- Cross-store/portfolio view (explicitly rejected by user in favor of
  single-tenant per-store view).
- Background/cron-based data pre-fetching (explicitly rejected in favor of
  on-demand refresh only).
- Polaris/native-look UI redesign (explicitly rejected in favor of keeping
  the current custom layout as-is).
- Metafields/metaobjects (not needed for this design; `shopify-custom-data`
  skill is reserved for if this changes later).
