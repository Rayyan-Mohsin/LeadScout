# Leadscout

Leadscout finds local businesses that don't have a website listed on their Google Maps profile, so you can reach out and offer to build one.

Enter a city name or US zip code — Leadscout scans Google Maps across 10 common business categories, visits each listing to check for a website, and surfaces only the ones without one. Results appear on an interactive map alongside a lead list, so you can browse and click through to the businesses worth contacting.

## Features

- **City or zip code search** — enter "Austin, TX" or "78701", both work
- **10 categories scanned** — restaurants, cafes, bars, hair salons, barber shops, beauty salons, auto repair, dentists, gyms, clothing stores
- **Up to 40 leads per search**
- **Interactive map** — click any lead to fly to its pin
- **Dark mode** — persists across sessions
- **No API keys required** — map tiles from OpenStreetMap, data directly from Google Maps

## Stack

- **Frontend** — React 19, Vite, Tailwind CSS v4, React-Leaflet
- **Backend** — Node.js, Express 5, Puppeteer

## Getting started

You need Node.js 18 or later. Run the backend and frontend in two separate terminals.

### Backend

```bash
cd backend
npm install
npm run dev
```

The API listens on `http://localhost:4000`. Set `PORT` in a `.env` file to use a different port.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend automatically.

Open `http://localhost:5173` in your browser, type a city or zip code, and hit Search.

## Deployment (Render.com)

Deploy the backend as a **Web Service** with these settings:

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |

Deploy the frontend as a **Static Site** with:

| Field | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

## How it works

1. The zip code or city name is resolved to a human-readable location via [Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap's geocoding API).
2. Puppeteer launches a headless Chromium instance and searches Google Maps for each business category in that location.
3. All of Chromium's network traffic is intercepted and fulfilled by Node's `fetch`, so the scraper works through corporate/container proxies without Chromium-level TLS issues.
4. Each listing page is visited to check for the `a[data-item-id="authority"]` element — Google Maps adds this when a business has a website. Listings without it are kept as leads.
5. Name, category, address, phone, and coordinates are extracted and returned to the frontend.

A search typically takes 35–60 seconds depending on how many listings are found.

## Project structure

```
backend/    Express API + Puppeteer scraper
frontend/   React + Vite + Tailwind UI
```

## Notes

- Google Maps' markup changes occasionally. If results stop coming back, the CSS selectors in `backend/src/services/scraper.js` may need updating.
- The scraper respects concurrency limits (4 category tabs, 6 detail tabs at once) to avoid overloading the browser.
- Images, fonts, and media are blocked during scraping; JS/CSS bundles are cached across tabs to keep memory usage low.
