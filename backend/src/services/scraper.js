import pLimit from "p-limit";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "LeadScout/1.0 (github.com/Rayyan-Mohsin/LeadScout)";
const MAX_LEADS = 40;

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

  const place = results.find(
    (r) => r.boundingbox && (r.class === "boundary" || r.class === "place" || r.type === "administrative"),
  ) || results[0];

  if (!place) throw new Error(`Location not found: ${location}`);

  const [minLat, maxLat, minLon, maxLon] = place.boundingbox.map(Number);
  return { minLat, maxLat, minLon, maxLon, displayName: place.display_name };
}

function buildOverpassQuery(bbox) {
  const { minLat, maxLat, minLon, maxLon } = bbox;
  const b = `${minLat},${minLon},${maxLat},${maxLon}`;
  const amenityFilter = AMENITY_TYPES.join("|");
  const shopFilter = SHOP_TYPES.join("|");

  return `
[out:json][timeout:45];
(
  node["amenity"~"^(${amenityFilter})$"]["name"][!"website"][!"brand"](${b});
  way["amenity"~"^(${amenityFilter})$"]["name"][!"website"][!"brand"](${b});
  node["shop"~"^(${shopFilter})$"]["name"][!"website"][!"brand"](${b});
  way["shop"~"^(${shopFilter})$"]["name"][!"website"][!"brand"](${b});
  node["leisure"="fitness_centre"]["name"][!"website"][!"brand"](${b});
);
out center ${MAX_LEADS};
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

  return (data.elements || [])
    .filter((el) => el.tags?.name && (el.lat != null || el.center))
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
