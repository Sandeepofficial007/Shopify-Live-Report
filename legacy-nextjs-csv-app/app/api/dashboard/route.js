// app/api/dashboard/route.js
// API endpoint that fetches CSVs from Google Drive and returns parsed dashboard data
// Caches results server-side for CACHE_TTL seconds (default 1 hour)

import { fetchAllStoresData } from "../../../lib/google-drive";
import { transformAllStores } from "../../../lib/parse-csv";

let cache = null;
let cacheTime = 0;

export async function GET() {
  const ttl = parseInt(process.env.CACHE_TTL || "3600") * 1000;

  // Return cached data if still fresh
  if (cache && Date.now() - cacheTime < ttl) {
    return Response.json(cache, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    // Check for required env vars
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY
    ) {
      return Response.json(
        {
          error: "Missing Google credentials",
          hint: "Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in environment variables",
        },
        { status: 500 }
      );
    }

    const folderIds = {
      cp: process.env.DRIVE_FOLDER_COLORPROOF,
      nb: process.env.DRIVE_FOLDER_NEUMABEAUTY,
      n4: process.env.DRIVE_FOLDER_NUMBER4,
      cpp: process.env.DRIVE_FOLDER_COLORPROOF_PRO,
      nbp: process.env.DRIVE_FOLDER_NEUMA_PRO,
      n4p: process.env.DRIVE_FOLDER_NUMBER4_PRO,
    };

    const missing = Object.entries(folderIds)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    if (missing.length > 0) {
      return Response.json(
        {
          error: "Missing folder IDs for: " + missing.join(", "),
          hint: "Set DRIVE_FOLDER_COLORPROOF, DRIVE_FOLDER_NEUMABEAUTY, DRIVE_FOLDER_NUMBER4, DRIVE_FOLDER_COLORPROOF_PRO, DRIVE_FOLDER_NEUMA_PRO, DRIVE_FOLDER_NUMBER4_PRO",
        },
        { status: 500 }
      );
    }

    console.log("[Dashboard API] Fetching data from Google Drive...");
    const rawData = await fetchAllStoresData();

    console.log("[Dashboard API] Parsing CSVs...");
    const dashboardData = transformAllStores(rawData);

    // Count data points for verification
    const stats = {};
    ["cp", "nb", "n4", "cpp", "nbp", "n4p"].forEach((key) => {
      if (dashboardData[key]) {
        stats[key] = {
          months: (dashboardData[key].s || []).length,
          referrers: (dashboardData[key].rf || []).length,
          campaigns: (dashboardData[key].ut || []).length,
        };
      }
    });

    dashboardData._meta = {
      fetchedAt: new Date().toISOString(),
      stats,
    };

    // Cache the result
    cache = dashboardData;
    cacheTime = Date.now();

    console.log("[Dashboard API] Data ready:", JSON.stringify(stats));

    return Response.json(dashboardData, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    console.error("[Dashboard API] Error:", err);
    return Response.json(
      {
        error: "Failed to fetch dashboard data",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Force refresh endpoint — POST /api/dashboard clears cache
export async function POST() {
  cache = null;
  cacheTime = 0;
  return GET();
}
