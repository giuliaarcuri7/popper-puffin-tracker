import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function describeWeather(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorms";
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`, { next: { revalidate: 900 } });
  if (!response.ok) return NextResponse.json({ error: "Weather is temporarily unavailable." }, { status: 502 });
  const data = await response.json();
  return NextResponse.json({ timezone: data.timezone || "UTC", temperature: data.current?.temperature_2m ?? 0, summary: describeWeather(data.current?.weather_code ?? 0) }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
}
