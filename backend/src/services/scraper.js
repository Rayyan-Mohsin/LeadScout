import puppeteer from "puppeteer";
import pLimit from "p-limit";
import { extractCoordsFromHref, extractPlaceId, cleanLabel } from "../utils/parseListing.js";

const CATEGORY_QUERIES = [
  "restaurants",
  "cafes",
  "hair salons",
  "auto repair shops",
  "retail stores",
  "contractors",
  "dentists",
  "gyms",
];

const RESULTS_PER_CATEGORY = 8;
const MAX_TOTAL_LEADS = 40;
const DETAIL_CONCURRENCY = 5;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function getProxyArgs() {
  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  return proxy ? [`--proxy-server=${proxy}`] : [];
}

function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--ignore-certificate-errors",
      ...getProxyArgs(),
    ],
  });
}

async function collectListingLinks(browser, query) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent(USER_AGENT);

    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/?hl=en`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => null);

    for (let i = 0; i < 2; i += 1) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollTop = feed.scrollHeight;
      });
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[role="feed"] a.hfpxzc')).map((a) => ({
        href: a.getAttribute("href"),
        label: a.getAttribute("aria-label"),
      })),
    );

    return links.filter((link) => link.href).slice(0, RESULTS_PER_CATEGORY);
  } catch {
    return [];
  } finally {
    await page.close().catch(() => null);
  }
}

async function scrapeListingDetail(browser, listing) {
  const page = await browser.newPage();

  try {
    await page.setUserAgent(USER_AGENT);
    await page.goto(listing.href, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('button[data-item-id="address"], h1', { timeout: 8000 }).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const detail = await page.evaluate(() => {
      const name = document.querySelector("h1")?.textContent?.trim() || "";
      const category = document.querySelector('button[jsaction*="category"]')?.textContent?.trim();
      const addressEl = document.querySelector('button[data-item-id="address"]');
      const phoneEl = document.querySelector('button[data-item-id^="phone"]');
      const websiteEl = document.querySelector('a[data-item-id="authority"]');

      return {
        name,
        category: category || null,
        address: addressEl?.getAttribute("aria-label") || null,
        phone: phoneEl?.getAttribute("aria-label") || null,
        hasWebsite: !!websiteEl,
      };
    });

    return detail;
  } catch {
    return null;
  } finally {
    await page.close().catch(() => null);
  }
}

export async function findBusinessesWithoutWebsite(location) {
  let browser;
  const limit = pLimit(DETAIL_CONCURRENCY);
  const seenPlaceIds = new Set();
  const leads = [];

  try {
    browser = await launchBrowser();
    const queries = CATEGORY_QUERIES.map((category) => `${category} in ${location}`);
    const listingBatches = await Promise.all(
      queries.map((query) => collectListingLinks(browser, query)),
    );

    const uniqueListings = [];
    for (const batch of listingBatches) {
      for (const listing of batch) {
        const placeId = extractPlaceId(listing.href);
        if (seenPlaceIds.has(placeId)) continue;
        seenPlaceIds.add(placeId);
        uniqueListings.push(listing);
      }
    }

    await Promise.all(
      uniqueListings.map((listing) =>
        limit(async () => {
          try {
            if (leads.length >= MAX_TOTAL_LEADS) return;

            const coords = extractCoordsFromHref(listing.href);
            if (!coords) return;

            const detail = await scrapeListingDetail(browser, listing);
            if (!detail || detail.hasWebsite) return;

            leads.push({
              id: extractPlaceId(listing.href),
              name: detail.name || cleanLabel(listing.label),
              category: cleanLabel(detail.category),
              phone: cleanLabel(detail.phone),
              address: cleanLabel(detail.address),
              lat: coords.lat,
              lng: coords.lng,
            });
          } catch {
            // a single listing failing should not abort the whole search
          }
        }),
      ),
    );
  } finally {
    if (browser) await browser.close().catch(() => null);
  }

  return leads;
}
