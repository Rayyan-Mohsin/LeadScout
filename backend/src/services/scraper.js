const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby";
const USER_AGENT = "LeadScout/1.0 (github.com/Rayyan-Mohsin/LeadScout)";
const MAX_LEADS = 40;

// Types accepted by the Google Places API (New)
const PLACE_TYPES = [
  "restaurant", "cafe", "bar", "fast_food_restaurant", "pub",
  "dentist", "doctor", "pharmacy",
  "hair_salon", "beauty_salon",
  "gym",
  "car_repair",
  "clothing_store", "electronics_store", "hardware_store",
  "bakery",
];

// Fields to request — websiteUri is the key one for filtering
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.primaryTypeDisplayName",
].join(",");

async function geocode(location) {
  const isUsZip = /^\d{5}$/.test(location.trim());
  const query = isUsZip ? `${location}, USA` : location;
  const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!resp.ok) throw new Error(`Nominatim error: ${resp.status}`);
  const results = await resp.json();

  const place =
    results.find(
      (r) => r.boundingbox && (r.class === "boundary" || r.class === "place" || r.type === "administrative"),
    ) || results[0];

  if (!place) throw new Error(`Location not found: ${location}`);

  const [minLat, maxLat, minLon, maxLon] = place.boundingbox.map(Number);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLon + maxLon) / 2;

  // Approximate bounding-box half-diagonal as search radius (capped at 50 km — Places API limit)
  const R = 6371000;
  const dLat = ((maxLat - minLat) * Math.PI) / 180;
  const dLon = ((maxLon - minLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((minLat * Math.PI) / 180) *
      Math.cos((maxLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const halfDiagonal = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const radius = Math.min(halfDiagonal, 50000);

  return { centerLat, centerLng, radius };
}

async function searchNearby(apiKey, centerLat, centerLng, radius, includedTypes) {
  const resp = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: centerLat, longitude: centerLng },
          radius,
        },
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Google Places API error ${resp.status}: ${text.substring(0, 300)}`);
  }

  const data = await resp.json();
  return data.places || [];
}

export async function findBusinessesWithoutWebsite(location) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY is not set. " +
        "Create a key at https://console.cloud.google.com and enable the Places API (New).",
    );
  }

  const { centerLat, centerLng, radius } = await geocode(location);

  // Two batches so each request's maxResultCount is spread across fewer types,
  // giving more results per category
  const mid = Math.ceil(PLACE_TYPES.length / 2);
  const batches = [PLACE_TYPES.slice(0, mid), PLACE_TYPES.slice(mid)];

  const seen = new Set();
  const all = [];

  await Promise.all(
    batches.map(async (types) => {
      const places = await searchNearby(apiKey, centerLat, centerLng, radius, types);
      for (const p of places) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        all.push(p);
      }
    }),
  );

  return all
    .filter((p) => !p.websiteUri)
    .slice(0, MAX_LEADS)
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text || "",
      category: p.primaryTypeDisplayName?.text || null,
      phone: p.nationalPhoneNumber || null,
      address: p.formattedAddress || null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
    }));
}
