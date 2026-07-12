import pLimit from "p-limit";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DDG_HTML_URL = "https://html.duckduckgo.com/html/";
const USER_AGENT = "LeadScout/1.0 (github.com/Rayyan-Mohsin/LeadScout)";
const MAX_LEADS = 40;
const OSM_CANDIDATE_LIMIT = 100;
const SEARCH_CONCURRENCY = 6;
const SEARCH_TIMEOUT_MS = 6000;

const AMENITY_TYPES = [
  "restaurant", "cafe", "bar", "fast_food", "pub",
  "dentist", "doctors", "pharmacy",
  "hairdresser", "beauty",
  "gym", "fitness_centre",
];
const SHOP_TYPES = [
  "hairdresser", "beauty", "car_repair", "clothes",
  "electronics", "hardware", "bakery", "butcher",
];

// Sites that aggregate or list businesses — appearing here does NOT mean
// the business has its own website
const DIRECTORY_HOSTS = new Set([
  "yelp.com", "tripadvisor.com", "yellowpages.com", "whitepages.com",
  "superpages.com", "dexknows.com", "manta.com", "chamberofcommerce.com",
  "bbb.org", "angieslist.com", "angi.com", "homeadvisor.com", "thumbtack.com",
  "houzz.com", "nextdoor.com",
  "facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com",
  "linkedin.com", "pinterest.com",
  "google.com", "maps.google.com", "bing.com", "yahoo.com",
  "apple.com", "maps.apple.com",
  "foursquare.com", "mapquest.com", "waze.com",
  "doordash.com", "ubereats.com", "grubhub.com", "seamless.com",
  "postmates.com", "caviar.com",
  "opentable.com", "resy.com", "zomato.com", "allmenus.com", "menupages.com",
  "menuswithprice.com", "sirved.com", "locu.com",
  "healthgrades.com", "zocdoc.com", "vitals.com", "webmd.com", "ratemds.com",
  "groupon.com", "livingsocial.com",
  "alignable.com", "merchantcircle.com", "citysearch.com",
  "mystore411.com", "storelocatorplus.com", "findglocal.com",
  "local.com", "n49.com", "cylex.us", "hotfrog.com",
  "mapquest.com", "brownbook.net", "showmelocal.com",
  "ezlocal.com", "tupalo.com", "place.tips",
]);

function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { "User-Agent": USER_AGENT, ...options.headers },
  });
}

async function geocode(location) {
  const isUsZip = /^\d{5}$/.test(location.trim());
  const query = isUsZip ? `${location}, USA` : location;
  const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const resp = await apiFetch(url);
  if (!resp.ok) throw new Error(`Nominatim error: ${resp.status}`);
  const results = await resp.json();

  const place =
    results.find(
      (r) => r.boundingbox && (r.class === "boundary" || r.class === "place" || r.type === "administrative"),
    ) || results[0];

  if (!place) throw new Error(`Location not found: ${location}`);

  const [minLat, maxLat, minLon, maxLon] = place.boundingbox.map(Number);
  return { minLat, maxLat, minLon, maxLon };
}

function buildOverpassQuery(bbox) {
  const { minLat, maxLat, minLon, maxLon } = bbox;
  const b = `${minLat},${minLon},${maxLat},${maxLon}`;
  const amenityFilter = AMENITY_TYPES.join("|");
  const shopFilter = SHOP_TYPES.join("|");

  // Exclude anything that already signals a web presence in OSM
  return `
[out:json][timeout:45];
(
  node["amenity"~"^(${amenityFilter})$"]["name"][!"website"][!"contact:website"][!"url"][!"brand"](${b});
  way["amenity"~"^(${amenityFilter})$"]["name"][!"website"][!"contact:website"][!"url"][!"brand"](${b});
  node["shop"~"^(${shopFilter})$"]["name"][!"website"][!"contact:website"][!"url"][!"brand"](${b});
  way["shop"~"^(${shopFilter})$"]["name"][!"website"][!"contact:website"][!"url"][!"brand"](${b});
  node["leisure"="fitness_centre"]["name"][!"website"][!"contact:website"][!"url"][!"brand"](${b});
);
out center ${OSM_CANDIDATE_LIMIT};
`.trim();
}

function formatAddress(tags) {
  const parts = [
    tags["addr:housenumber"] && tags["addr:street"]
      ? `${tags["addr:housenumber"]} ${tags["addr:street"]}`
      : tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.join(", ") || null;
}

function mapCategory(tags) {
  const raw = tags.amenity || tags.shop || tags.leisure || "";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || null;
}

// Search DuckDuckGo for "{name} {location}" and check whether any of the
// top results is an official business website (not a directory listing).
async function hasOfficialWebsite(name, location) {
  const q = `"${name}" ${location}`;
  try {
    const resp = await fetch(DDG_HTML_URL, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml",
      },
      body: `q=${encodeURIComponent(q)}&kl=us-en`,
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });

    if (!resp.ok) return false;

    const html = await resp.text();

    // DuckDuckGo HTML result links: <a class="result__url" href="https://...">
    const pattern = /<a[^>]+class="result__url"[^>]+href="([^"]+)"/g;
    let match;
    let checked = 0;

    while ((match = pattern.exec(html)) !== null && checked < 5) {
      checked++;
      try {
        const host = new URL(match[1]).hostname.toLowerCase().replace(/^www\./, "");
        if (host && !DIRECTORY_HOSTS.has(host)) return true;
      } catch {
        // skip malformed URLs
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function findBusinessesWithoutWebsite(location) {
  const bbox = await geocode(location);

  const query = buildOverpassQuery(bbox);
  const resp = await apiFetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Overpass error ${resp.status}: ${text.substring(0, 200)}`);
  }

  const data = await resp.json();

  const candidates = (data.elements || []).filter(
    (el) => el.tags?.name && (el.lat != null || el.center),
  );

  const limit = pLimit(SEARCH_CONCURRENCY);

  const checked = await Promise.all(
    candidates.map((el) =>
      limit(async () => {
        const hasWebsite = await hasOfficialWebsite(el.tags.name, location);
        return hasWebsite ? null : el;
      }),
    ),
  );

  return checked
    .filter(Boolean)
    .slice(0, MAX_LEADS)
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      return {
        id: `${el.type}/${el.id}`,
        name: el.tags.name,
        category: mapCategory(el.tags),
        phone: el.tags.phone || el.tags["contact:phone"] || null,
        address: formatAddress(el.tags),
        lat,
        lng: lon,
      };
    });
}
