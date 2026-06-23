# Leadscout

Leadscout finds local businesses that don't have a website listed on their
Google Maps profile, so you can reach out and offer to build one.

It scans a city or zip code across a set of common local business
categories, pulls the listing details straight from Google Maps, and keeps
only the businesses with no website on file. Results show up on an
OpenStreetMap-based map with a matching lead list, so you can browse and
click straight to the ones worth contacting.

## Stack

- **Frontend** — React (Vite), Tailwind CSS, React-Leaflet
- **Backend** — Node.js, Express, Puppeteer

No API keys or billing accounts are required for either the map or the
business data — the map runs on OpenStreetMap tiles and the backend reads
business listings directly from Google Maps' public pages.

## Project structure

```
backend/    Express API + Puppeteer scraper
frontend/   React + Vite + Tailwind UI
```

## Getting started

### Backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:4000` by default. Copy `.env.example` to
`.env` to override the port.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` requests
to the backend.

## Notes

A search typically takes 60–120 seconds since each business listing is
visited individually to confirm whether a website is present. Google Maps'
markup changes from time to time, so the scraper's selectors may need
updates if results stop coming back.
