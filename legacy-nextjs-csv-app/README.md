# Shopify Portfolio Dashboard

Next.js dashboard that reads Shopify CSV exports from Google Drive and renders multi-store analytics (ColorProof, NeumaBeauty, Number 4 Hair).

```
Google Drive (CSVs) → Next.js API Route → React Dashboard
     ↑                    ↑                     ↑
 You drop files     Service account       Recharts + heatmaps
 in 3 folders       reads them live        period comparison
```

## Architecture

```
app/
  layout.js              — Root layout (dark theme)
  page.js                — Client component, fetches /api/dashboard
  api/dashboard/route.js — Server route: Drive → CSV parse → JSON (1hr cache)
components/
  Dashboard.jsx          — Full dashboard UI (charts, heatmaps, funnels)
lib/
  google-drive.js        — Google Drive API via service account
  parse-csv.js           — Transforms Shopify CSVs into dashboard data
```

## Setup (One-Time, ~15 min)

### 1. Google Cloud Service Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable **Google Drive API**: APIs & Services → Library → search "Google Drive API" → Enable
4. Create a Service Account: IAM & Admin → Service Accounts → Create
5. Create a key: click the service account → Keys → Add Key → JSON
6. Save the downloaded JSON — you need `client_email` and `private_key`

### 2. Google Drive Folders

1. Create 3 folders in Google Drive:
   - `ColorProof/`
   - `NeumaBeauty/`
   - `Number4Hair/`
2. Share each folder with your service account email (from the JSON key file) as **Viewer**
3. Copy each folder's ID from the URL: `drive.google.com/drive/folders/THIS_PART`

### 3. Drop CSVs

Export these reports from each Shopify store and drop them in the matching folder:

| CSV Filename Pattern | Shopify Report |
|---|---|
| `Net_sales_over_time_*.csv` | Analytics → Reports → Net sales over time |
| `Conversion_rate_over_time_*.csv` | Analytics → Reports → Online store conversion over time |
| `Average_order_value_over_time_*.csv` | Analytics → Reports → Average order value over time |
| `Sessions_by_Referrer_*.csv` | Analytics → Reports → Sessions by referrer |
| `Performance_by_UTM_campaign_*.csv` | Analytics → Reports → Sessions by UTM campaign |

The parser matches filenames loosely, so exact names don't matter — just include the key phrase (e.g., "net_sales_over_time").

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DRIVE_FOLDER_COLORPROOF=1abc...
DRIVE_FOLDER_NEUMABEAUTY=1def...
DRIVE_FOLDER_NUMBER4=1ghi...
```

**Important:** The `GOOGLE_PRIVATE_KEY` must be wrapped in quotes and use `\n` for newlines.

### 5. Run Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to Vercel

1. Push to GitHub:
   ```bash
   git init && git add . && git commit -m "Shopify dashboard"
   git remote add origin https://github.com/YOUR_USER/shopify-dashboard.git
   git branch -M main && git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) → Import repo
3. Add Environment Variables (same 5 from `.env.local`)
4. Deploy — done

## Updating Data

1. Export new CSVs from Shopify
2. Drop them in the Google Drive folders (replace old files or add new ones)
3. Visit the dashboard — data auto-refreshes (cached for 1 hour)
4. Force refresh: click the Refresh button, or POST to `/api/dashboard`

## Adding a New Store

1. Create a new Drive folder, share with service account
2. Add `DRIVE_FOLDER_NEWSTORE` env var
3. Update `lib/google-drive.js` → add key to `folders` object
4. Update `lib/parse-csv.js` → add to `storeKeys` array
5. Update `components/Dashboard.jsx` → add to `projects` array
6. Redeploy

## Tech Stack

- **Next.js 14** (App Router)
- **Google Drive API** via googleapis
- **PapaParse** for CSV parsing
- **Recharts** for charts
- Server-side caching (configurable TTL)
