# Popper Puffin Tracker

A responsive fictional Christmas Eve tracker built with Next.js App Router, React, TypeScript, Tailwind CSS, and Mapbox GL JS. It includes a live globe simulation, route animation, coordinate and altitude instruments, a letter counter, deterministic local ETA estimates, and an accessible messaging interaction.

## Quick start

1. Install Node.js 22 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and add Mapbox credentials.
3. Run `npm run dev`, then open the local address shown.

The app has a no-key visual fallback and demo geocoding for London, New York, Tokyo, Sydney, and Reykjavik. Worldwide search and the interactive Mapbox globe require keys.

## Artwork

Map the supplied assets as follows:

- `IMG_5045.PNG` → `public/popper-portrait.png`
- `IMG_5046.PNG` → `public/popper-marker.png`
- `00e0db34-665b-4e23-85c6-cecab290a1eb.jpeg` → `public/concept-reference.jpeg` (reference only)

The supplied Popper artwork is included as both the framed portrait and the live map marker. A friendly fallback remains available if either file cannot load.

## Deterministic ETA behavior

ETA is always between 12:00 AM and 3:00 AM in the searched location. It is derived from a stable hash of the place name and its local calendar date, so one location keeps the same time throughout its local day. The UI labels every result as fictional.

## Environment variables

- `NEXT_PUBLIC_MAPBOX_TOKEN`: public browser token for the globe. Restrict it to your production domains.
- `MAPBOX_ACCESS_TOKEN`: server-side token for geocoding.
- `TIMEZONE_API_KEY`: optional TimeZoneDB key; Mapbox timezone context is used when omitted.

Never commit `.env.local` or a secret token.

## Verification

Run `npm test` for the tests and `npm run build` for a production build.

## Deploy to Vercel

1. Push this folder to a Git provider and import it in Vercel.
2. Keep the detected framework preset as **Next.js**.
3. Add the environment variables in Project Settings → Environment Variables for Production and Preview.
4. Deploy, then add the deployed domain to the public token’s allowed URLs in Mapbox.

The geocoding route runs at the edge and keeps its token server-side. Messages are simulated locally and are not stored or transmitted.
