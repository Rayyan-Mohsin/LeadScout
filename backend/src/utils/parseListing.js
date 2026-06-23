const COORD_PATTERN = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
const PLACE_ID_PATTERN = /!1s([^!]+)/;

export function extractCoordsFromHref(href) {
  const match = href.match(COORD_PATTERN);
  if (!match) return null;
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}

export function extractPlaceId(href) {
  const match = href.match(PLACE_ID_PATTERN);
  return match ? match[1] : href;
}

export function cleanLabel(label) {
  if (!label) return "";
  return label.replace(/^[A-Za-z\s]+:\s*/, "").trim();
}
