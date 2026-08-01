import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Exact city lookup v7: reverse geocode Popper's live coordinates on hover.

const fallback: Record<string, [number, number, string, string]> = {
  london: [-0.1276, 51.5072, "Europe/London", "London, United Kingdom"],
  "new york": [-74.006, 40.7128, "America/New_York", "New York, United States"],
  tokyo: [139.6917, 35.6895, "Asia/Tokyo", "Tokyo, Japan"],
  sydney: [151.2093, -33.8688, "Australia/Sydney", "Sydney, Australia"],
  reykjavik: [-21.9426, 64.1466, "Atlantic/Reykjavik", "Reykjavík, Iceland"],
};

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function reverseCity(latitude: number, longitude: number, token: string) {
  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&types=place&language=en&access_token=${token}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) return json({ error: "The city lookup is temporarily unavailable." }, 502);
  const feature = (await response.json()).features?.[0];
  if (!feature) return json({ error: "Popper is currently between named cities." }, 404);
  const properties = feature.properties ?? {};
  const city = properties.name_preferred || properties.name || properties.full_address;
  const country = properties.context?.country?.name_preferred || properties.context?.country?.name || "";
  if (!city) return json({ error: "Popper is currently between named cities." }, 404);
  return json({ city, country });
}

export async function GET(request: NextRequest) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  const latitudeValue = request.nextUrl.searchParams.get("lat");
  const longitudeValue = request.nextUrl.searchParams.get("lng");

  if (latitudeValue !== null || longitudeValue !== null) {
    const latitude = Number(latitudeValue); const longitude = Number(longitudeValue);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return json({ error: "Invalid map coordinates." }, 400);
    if (!token) return json({ error: "Add MAPBOX_ACCESS_TOKEN to enable live city names." }, 503);
    return reverseCity(latitude, longitude, token);
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return json({ error: "Enter an address to search." }, 400);
  if (!token) {
    const match = Object.entries(fallback).find(([key]) => q.toLowerCase().includes(key));
    if (!match) return json({ error: "Add MAPBOX_ACCESS_TOKEN to enable worldwide address search. Try London, New York, Tokyo, Sydney, or Reykjavik in demo mode." }, 503);
    const [, [longitude, latitude, timezone, name]] = match;
    return json({ name, longitude, latitude, timezone });
  }

  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&limit=1&access_token=${token}`, { headers: { Accept: "application/json" } });
  if (!response.ok) return json({ error: "The map service is temporarily unavailable." }, 502);
  const feature = (await response.json()).features?.[0];
  if (!feature) return json({ error: "No matching address was found." }, 404);
  const [longitude, latitude] = feature.geometry.coordinates; let timezone = "UTC";
  if (process.env.TIMEZONE_API_KEY) {
    const timezoneResponse = await fetch(`https://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.TIMEZONE_API_KEY}&format=json&by=position&lat=${latitude}&lng=${longitude}`);
    if (timezoneResponse.ok) timezone = (await timezoneResponse.json()).zoneName || "UTC";
  } else {
    const timezoneResponse = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&types=place&access_token=${token}`);
    if (timezoneResponse.ok) timezone = (await timezoneResponse.json()).features?.[0]?.properties?.context?.timezone?.name || "UTC";
  }
  return json({ name: feature.properties?.full_address || feature.properties?.name || q, longitude, latitude, timezone });
}
