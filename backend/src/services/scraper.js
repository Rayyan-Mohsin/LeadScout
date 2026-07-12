import puppeteer from "puppeteer";
import pLimit from "p-limit";
import {
  extractCoordsFromHref,
  extractPlaceId,
  cleanLabel,
} from "../utils/parseListing.js";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_UA = "LeadScout/1.0 (github.com/Rayyan-Mohsin/LeadScout)";
const MAPS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MAX_LEADS = 40;
const RESULTS_PER_CATEGORY = 5;
const DETAIL_CONCURRENCY = 12;
const CATEGORY_CONCURRENCY = 6;

const CATEGORY_QUERIES = [
  "restaurants",
  "cafes",
  "bars",
  "hair salons",
  "barber shops",
  "beauty salons",
  "auto repair shops",
  "dentists",
  "gyms",
  "clothing stores",
];

// Types we never need — aborting them saves bandwidth and time.
const ABORT_TYPES = new Set(["image", "font", "media"]);

// Cacheable resource types (JS bundles, CSS) are fetched once and reused.
// Dynamic API calls (XHR/fetch) and documents are always live.
const CACHE_TYPES = new Set(["script", "stylesheet"]);

async function resolveLocation(location) {
  const isUsZip = /^\d{5}$/.test(location.trim());
  const query = isUsZip ? `${location}, USA` : location;
  try {
    const resp = await fetch(
      `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": NOMINATIM_UA } },
    );
    if (!resp.ok) return location;
    const [result] = await resp.json();
    if (!result) return location;
    const a = result.address || {};
    const city = a.city || a.town || a.village || a.county || "";
    const region = a.state || a.country || "";
    return city && region ? `${city}, ${region}` : location;
  } catch {
    return location;
  }
}

function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-extensions",
      "--no-first-run",
    ],
  });
}

// Route Chromium's requests through Node fetch (works through HTTPS_PROXY).
// Images/fonts are aborted (not needed for DOM scraping).
// Scripts/stylesheets are cached — Google Maps bundles are shared across pages.
function enableInterception(page, cache) {
  const inFlight = new Map(); // URL → pending Promise for dedup

  page.setRequestInterception(true);
  page.on("request", async (req) => {
    const url = req.url();
    if (!url.startsWith("http")) {
      await req.continue().catch(() => {});
      return;
    }
    if (ABORT_TYPES.has(req.resourceType())) {
      await req.abort().catch(() => {});
      return;
    }

    const cacheKey = CACHE_TYPES.has(req.resourceType()) ? url : null;

    // Return cached response immediately
    if (cacheKey && cache.has(cacheKey)) {
      await req.respond(cache.get(cacheKey)).catch(() => {});
      return;
    }

    // Deduplicate concurrent in-flight fetches for the same URL
    if (cacheKey && inFlight.has(cacheKey)) {
      const cached = await inFlight.get(cacheKey).catch(() => null);
      if (cached) { await req.respond(cached).catch(() => {}); return; }
    }

    const fetchPromise = (async () => {
      try {
        const init = {
          method: req.method(),
          headers: { ...req.headers(), "User-Agent": MAPS_UA },
          redirect: "follow",
        };
        const body = req.postData();
        if (body) init.body = body;

        const resp = await fetch(url, init);
        const buffer = await resp.arrayBuffer();
        const headers = {};
        resp.headers.forEach((v, k) => {
          if (k !== "content-encoding") headers[k] = v;
        });
        const entry = { status: resp.status, headers, body: Buffer.from(buffer) };
        if (cacheKey) cache.set(cacheKey, entry);
        await req.respond(entry).catch(() => {});
        return entry;
      } catch {
        await req.abort("failed").catch(() => {});
        return null;
      }
    })();

    if (cacheKey) inFlight.set(cacheKey, fetchPromise);
    await fetchPromise;
    if (cacheKey) inFlight.delete(cacheKey);
  });
}

async function collectListings(browser, cache, resolvedLocation, category) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(MAPS_UA);
    await page.setViewport({ width: 1366, height: 900 });
    enableInterception(page, cache);

    const query = `${category} in ${resolvedLocation}`;
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}/?hl=en`,
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );

    await page.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => null);

    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollTop = feed.scrollHeight;
      });
      await new Promise((r) => setTimeout(r, 500));
    }

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[role="feed"] a.hfpxzc')).map((a) => ({
        href: a.getAttribute("href") || "",
        label: a.getAttribute("aria-label") || "",
      })),
    );

    return links.filter((l) => l.href).slice(0, RESULTS_PER_CATEGORY);
  } catch {
    return [];
  } finally {
    await page.close().catch(() => null);
  }
}

async function scrapeListing(browser, cache, listing) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(MAPS_UA);
    enableInterception(page, cache);

    await page.goto(listing.href, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector("h1", { timeout: 10000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 400));

    const coords = extractCoordsFromHref(page.url());
    if (!coords) return null;

    const detail = await page.evaluate(() => {
      if (document.querySelector('a[data-item-id="authority"]')) return null;

      const name = document.querySelector("h1")?.textContent?.trim();
      if (!name) return null;

      const categoryEl =
        document.querySelector('button[jsaction*="pane.rating.category"]') ||
        document.querySelector("button.DkEaL");
      const addressEl = document.querySelector('button[data-item-id="address"]');
      const phoneEl = document.querySelector('button[data-item-id^="phone"]');

      return {
        name,
        category: categoryEl?.textContent?.trim() || null,
        address: addressEl?.getAttribute("aria-label") || null,
        phone: phoneEl?.getAttribute("aria-label") || null,
      };
    });

    if (!detail) return null;

    return {
      name: detail.name,
      category: cleanLabel(detail.category),
      address: cleanLabel(detail.address),
      phone: cleanLabel(detail.phone),
      lat: coords.lat,
      lng: coords.lng,
    };
  } catch {
    return null;
  } finally {
    await page.close().catch(() => null);
  }
}

export async function findBusinessesWithoutWebsite(location) {
  const resolvedLocation = await resolveLocation(location);
  const cache = new Map(); // shared script/stylesheet cache across all pages
  let browser;
  try {
    browser = await launchBrowser();

    const catLimit = pLimit(CATEGORY_CONCURRENCY);
    const batches = await Promise.all(
      CATEGORY_QUERIES.map((category) =>
        catLimit(() => collectListings(browser, cache, resolvedLocation, category)),
      ),
    );

    const seenIds = new Set();
    const allListings = [];
    for (const batch of batches) {
      for (const listing of batch) {
        const id = extractPlaceId(listing.href);
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        allListings.push({ ...listing, id });
      }
    }

    const detailLimit = pLimit(DETAIL_CONCURRENCY);
    const leads = [];

    await Promise.all(
      allListings.map((listing) =>
        detailLimit(async () => {
          if (leads.length >= MAX_LEADS) return;
          const result = await scrapeListing(browser, cache, listing);
          if (result && leads.length < MAX_LEADS) {
            leads.push({ id: listing.id, ...result });
          }
        }),
      ),
    );

    return leads;
  } finally {
    if (browser) await browser.close().catch(() => null);
  }
}
