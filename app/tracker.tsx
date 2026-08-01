"use client";

// Map loading fix v5: calculate Popper's live route before revealing Mapbox.
// Popper tooltip v6: show the nearest city on hover, focus, or tap.

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Place = { name: string; longitude: number; latitude: number; timezone: string };
type FlightWeather = { timezone: string; temperature: number; summary: string };
type Countdown = { days: number; hours: number; minutes: number; seconds: number; isChristmas: boolean };
type Destination = { name: string; lng: number; lat: number; timezone: string };
const destinations: Destination[] = [
  { name: "Auckland", lng: 174.76, lat: -36.85, timezone: "Pacific/Auckland" },
  { name: "Sydney", lng: 151.21, lat: -33.87, timezone: "Australia/Sydney" },
  { name: "Tokyo", lng: 139.69, lat: 35.68, timezone: "Asia/Tokyo" },
  { name: "Singapore", lng: 103.82, lat: 1.35, timezone: "Asia/Singapore" },
  { name: "Bangkok", lng: 100.50, lat: 13.76, timezone: "Asia/Bangkok" },
  { name: "Dhaka", lng: 90.41, lat: 23.81, timezone: "Asia/Dhaka" },
  { name: "Karachi", lng: 67.01, lat: 24.86, timezone: "Asia/Karachi" },
  { name: "Dubai", lng: 55.27, lat: 25.20, timezone: "Asia/Dubai" },
  { name: "Moscow", lng: 37.62, lat: 55.76, timezone: "Europe/Moscow" },
  { name: "Cairo", lng: 31.24, lat: 30.04, timezone: "Africa/Cairo" },
  { name: "Paris", lng: 2.35, lat: 48.86, timezone: "Europe/Paris" },
  { name: "London", lng: -0.13, lat: 51.51, timezone: "Europe/London" },
  { name: "Reykjavík", lng: -21.94, lat: 64.15, timezone: "Atlantic/Reykjavik" },
  { name: "Rio de Janeiro", lng: -43.17, lat: -22.91, timezone: "America/Sao_Paulo" },
  { name: "Halifax", lng: -63.58, lat: 44.65, timezone: "America/Halifax" },
  { name: "New York", lng: -74.01, lat: 40.71, timezone: "America/New_York" },
  { name: "Chicago", lng: -87.63, lat: 41.88, timezone: "America/Chicago" },
  { name: "Denver", lng: -104.99, lat: 39.74, timezone: "America/Denver" },
  { name: "Los Angeles", lng: -118.24, lat: 34.05, timezone: "America/Los_Angeles" },
  { name: "Anchorage", lng: -149.90, lat: 61.22, timezone: "America/Anchorage" },
  { name: "Honolulu", lng: -157.86, lat: 21.31, timezone: "Pacific/Honolulu" },
  { name: "Pago Pago", lng: -170.70, lat: -14.28, timezone: "Pacific/Pago_Pago" },
];
const worldLights: Destination[] = [...destinations,
  { name: "Seoul", lng: 126.98, lat: 37.57, timezone: "Asia/Seoul" },
  { name: "Beijing", lng: 116.41, lat: 39.90, timezone: "Asia/Shanghai" },
  { name: "Manila", lng: 120.98, lat: 14.60, timezone: "Asia/Manila" },
  { name: "Jakarta", lng: 106.85, lat: -6.21, timezone: "Asia/Jakarta" },
  { name: "Perth", lng: 115.86, lat: -31.95, timezone: "Australia/Perth" },
  { name: "Delhi", lng: 77.21, lat: 28.61, timezone: "Asia/Kolkata" },
  { name: "Istanbul", lng: 28.98, lat: 41.01, timezone: "Europe/Istanbul" },
  { name: "Nairobi", lng: 36.82, lat: -1.29, timezone: "Africa/Nairobi" },
  { name: "Johannesburg", lng: 28.05, lat: -26.20, timezone: "Africa/Johannesburg" },
  { name: "Lagos", lng: 3.38, lat: 6.52, timezone: "Africa/Lagos" },
  { name: "São Paulo", lng: -46.63, lat: -23.55, timezone: "America/Sao_Paulo" },
  { name: "Buenos Aires", lng: -58.38, lat: -34.60, timezone: "America/Argentina/Buenos_Aires" },
  { name: "Santiago", lng: -70.67, lat: -33.45, timezone: "America/Santiago" },
  { name: "Lima", lng: -77.04, lat: -12.05, timezone: "America/Lima" },
  { name: "Mexico City", lng: -99.13, lat: 19.43, timezone: "America/Mexico_City" },
  { name: "Vancouver", lng: -123.12, lat: 49.28, timezone: "America/Vancouver" },
];
const ROUTE_TICK_MS = 2000;
const ROUTE_LEG_MS = 60 * 60 * 1000;
function hourAt(destination: Destination, timestamp: number) { return Number(new Intl.DateTimeFormat("en-US", { timeZone: destination.timezone, hour: "numeric", hourCycle: "h23" }).format(new Date(timestamp))); }
function isNightHour(hour: number) { return hour >= 22 || hour < 4; }
function isDarkHour(hour: number) { return hour >= 18 || hour < 6; }
function nightLightsData(timestamp: number) {
  return { type: "FeatureCollection" as const, features: worldLights.filter((destination) => isDarkHour(hourAt(destination, timestamp))).map((destination) => ({ type: "Feature" as const, properties: { name: destination.name }, geometry: { type: "Point" as const, coordinates: [destination.lng, destination.lat] as [number, number] } })) };
}
function nightStopIndex(timestamp: number) {
  const eligible = destinations.map((destination, index) => { const hour = hourAt(destination, timestamp); const distanceFromOneAm = Math.min(Math.abs(hour - 1), 24 - Math.abs(hour - 1)); return { destination, index, hour, distanceFromOneAm }; }).filter(({ hour }) => isNightHour(hour));
  eligible.sort((a, b) => a.distanceFromOneAm - b.distanceFromOneAm || b.destination.lng - a.destination.lng);
  return eligible[0]?.index ?? 0;
}
function routePositionAt(timestamp: number) {
  const legStart = Math.floor(timestamp / ROUTE_LEG_MS) * ROUTE_LEG_MS;
  const index = nightStopIndex(legStart); const nextIndex = nightStopIndex(legStart + ROUTE_LEG_MS); const progress = (timestamp - legStart) / ROUTE_LEG_MS;
  const a = destinations[index], b = destinations[nextIndex]; const longitudeDelta = ((b.lng - a.lng + 540) % 360) - 180; const lng = ((a.lng + longitudeDelta * progress + 540) % 360) - 180;
  return { index, nextIndex, progress, lat: a.lat + (b.lat - a.lat) * progress, lng, from: a.name, to: b.name, city: progress < .5 ? a.name : b.name };
}
function cityPopup(city: string) { return `<strong style="color:#2457a6;font-size:15px;letter-spacing:.02em">${city}</strong>`; }
function hash(value: string) { let h = 2166136261; for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return h >>> 0; }
function etaFor(place: Place) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: place.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const ymd = Object.fromEntries(parts.map((p) => [p.type, p.value])); const minutes = hash(`${place.name}|${ymd.year}-${ymd.month}-${ymd.day}`) % 181;
  return `${Math.floor(minutes / 60) || 12}:${String(minutes % 60).padStart(2, "0")} AM`;
}
function coord(value: number, positive: string, negative: string) { return `${Math.abs(value).toFixed(3)}° ${value >= 0 ? positive : negative}`; }
function localTime(timezone: string, now: number) { return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(now)); }
function christmasCountdown(timestamp: number): Countdown {
  const now = new Date(timestamp); const isChristmas = now.getMonth() === 11 && now.getDate() === 25;
  let target = new Date(now.getFullYear(), 11, 25, 0, 0, 0, 0); if (now >= target && !isChristmas) target = new Date(now.getFullYear() + 1, 11, 25, 0, 0, 0, 0);
  const difference = Math.max(0, target.getTime() - timestamp); const days = Math.floor(difference / 86400000); const hours = Math.floor((difference % 86400000) / 3600000); const minutes = Math.floor((difference % 3600000) / 60000); const seconds = Math.floor((difference % 60000) / 1000);
  return { days, hours, minutes, seconds, isChristmas };
}

export default function Tracker() {
  const mapRef = useRef<HTMLDivElement>(null); const mapObject = useRef<import("mapbox-gl").Map | null>(null); const mapMarker = useRef<import("mapbox-gl").Marker | null>(null); const northPoleMarker = useRef<import("mapbox-gl").Marker | null>(null);
  const openingFocusAttempts = useRef(0);
  const [mapReady, setMapReady] = useState(false); const [routeReady, setRouteReady] = useState(false); const [index, setIndex] = useState(0); const [nextIndex, setNextIndex] = useState(1); const [progress, setProgress] = useState(0); const [letters, setLetters] = useState(1287342);
  const [query, setQuery] = useState(""); const [place, setPlace] = useState<Place | null>(null); const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState("");
  const [message, setMessage] = useState(""); const [reply, setReply] = useState(""); const [sending, setSending] = useState(false);
  const [listName, setListName] = useState(""); const [listResult, setListResult] = useState("");
  const [flightWeather, setFlightWeather] = useState<FlightWeather | null>(null); const [now, setNow] = useState(Date.now());
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const current = useMemo(() => { const a = destinations[index], b = destinations[nextIndex]; const longitudeDelta = ((b.lng - a.lng + 540) % 360) - 180; const longitude = ((a.lng + longitudeDelta * progress + 540) % 360) - 180; return { lat: a.lat + (b.lat - a.lat) * progress, lng: longitude, from: a.name, to: b.name, city: progress < .5 ? a.name : b.name }; }, [index, nextIndex, progress]);
  const currentRef = useRef(current); currentRef.current = current;

  useEffect(() => {
    const updateRoute = () => {
      const route = routePositionAt(Date.now());
      setIndex(route.index);
      setNextIndex(route.nextIndex);
      setProgress(route.progress);
      setRouteReady(true);
      setLetters((n) => n + 2);
    };
    updateRoute();
    const timer = window.setInterval(updateRoute, ROUTE_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { const updateCountdown = () => setCountdown(christmasCountdown(Date.now())); updateCountdown(); const timer = window.setInterval(updateCountdown, 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    const loadWeather = async () => {
      const position = currentRef.current;
      try { const response = await fetch(`/api/weather?lat=${position.lat}&lng=${position.lng}`); if (!response.ok) throw new Error(); const data = await response.json(); if (active) setFlightWeather(data); }
      catch { if (active) setFlightWeather(null); }
    };
    loadWeather();
    const timer = window.setInterval(loadWeather, 30 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [index]);
  useEffect(() => {
    const marker = mapMarker.current;
    marker?.setLngLat([current.lng, current.lat]).getPopup()?.setHTML(cityPopup(current.city));
    if (marker) { const element = marker.getElement(); element.setAttribute("aria-label", `Popper Puffin near ${current.city}`); }
    const map = mapObject.current;
    if (map?.loaded() && openingFocusAttempts.current < 2) {
      map.jumpTo({ center: [current.lng, current.lat], zoom: 2.15, bearing: 0, pitch: 0 });
      openingFocusAttempts.current += 1;
    }
  }, [current]);
  useEffect(() => {
    if (!routeReady || !mapRef.current || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return; let active = true; let lightTimer: number | undefined; let focusTimer: number | undefined;
    import("mapbox-gl").then(({ default: mapboxgl }) => { if (!active || !mapRef.current) return; mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
      const openingPosition = routePositionAt(Date.now());
      const map = new mapboxgl.Map({ container: mapRef.current, style: "mapbox://styles/mapbox/navigation-night-v1", projection: "globe", center: [openingPosition.lng, openingPosition.lat], zoom: 2.15, bearing: 0, pitch: 0, attributionControl: false }); mapObject.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right"); map.on("style.load", () => map.setFog({ color: "#101943", "high-color": "#536bac", "horizon-blend": .15, "space-color": "#050921", "star-intensity": .8 }));
      const updateNightLights = () => { const source = map.getSource("night-city-lights") as import("mapbox-gl").GeoJSONSource | undefined; source?.setData(nightLightsData(Date.now())); };
      const focusOnPopper = () => { if (!active) return; const livePosition = routePositionAt(Date.now()); map.resize(); map.jumpTo({ center: [livePosition.lng, livePosition.lat], zoom: 2.15, bearing: 0, pitch: 0 }); };
      map.on("load", () => { focusOnPopper(); map.once("idle", focusOnPopper); focusTimer = window.setTimeout(() => { focusOnPopper(); setMapReady(true); }, 750); map.addSource("night-city-lights", { type: "geojson", data: nightLightsData(Date.now()) }); map.addLayer({ id: "night-city-light-glow", type: "circle", source: "night-city-lights", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 3, 4, 6], "circle-color": "#ffd184", "circle-blur": .75, "circle-opacity": .88, "circle-stroke-width": 1, "circle-stroke-color": "#fff0c2", "circle-stroke-opacity": .55 } }); lightTimer = window.setInterval(updateNightLights, 5 * 60 * 1000); });
      const el = document.createElement("button"); el.className = "popper-marker"; el.setAttribute("aria-label", `Popper Puffin near ${openingPosition.city}`);
      const markerImage = document.createElement("img"); markerImage.src = "/popper-marker.png"; markerImage.alt = ""; el.append(markerImage);
      const markerPosition = routePositionAt(Date.now());
      const popperPopup = new mapboxgl.Popup({ offset: 30, closeButton: false, closeOnClick: false }).setHTML(cityPopup(markerPosition.city));
      mapMarker.current = new mapboxgl.Marker({ element: el }).setLngLat([markerPosition.lng, markerPosition.lat]).setPopup(popperPopup).addTo(map);
      const showPopperCity = () => { const position = currentRef.current; popperPopup.setLngLat([position.lng, position.lat]).setHTML(cityPopup(position.city)).addTo(map); };
      el.addEventListener("mouseenter", showPopperCity); el.addEventListener("mouseleave", () => popperPopup.remove()); el.addEventListener("focus", showPopperCity); el.addEventListener("blur", () => popperPopup.remove());
      const poleEl = document.createElement("button"); poleEl.className = "north-pole-marker"; poleEl.title = "North Pole"; poleEl.setAttribute("aria-label", "North Pole landmark");
      const poleCrop = document.createElement("span"); poleCrop.className = "north-pole-crop"; const poleImage = document.createElement("img"); poleImage.src = "/north-pole-marker.png"; poleImage.alt = ""; poleCrop.append(poleImage); poleEl.append(poleCrop);
      northPoleMarker.current = new mapboxgl.Marker({ element: poleEl, anchor: "bottom" }).setLngLat([0, 85.051]).setPopup(new mapboxgl.Popup({ offset: 64 }).setHTML("<strong>North Pole</strong><br>Popper’s home base")).addTo(map);
    }); return () => { active = false; if (lightTimer) clearInterval(lightTimer); if (focusTimer) clearTimeout(focusTimer); mapMarker.current?.remove(); northPoleMarker.current?.remove(); mapObject.current?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeReady]);
  async function search(e: FormEvent) { e.preventDefault(); if (!query.trim()) return; setSearching(true); setSearchError(""); setPlace(null); try { const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Address not found"); setPlace(data); } catch (error) { setSearchError(error instanceof Error ? error.message : "Search failed"); } finally { setSearching(false); } }
  function sendMessage(e: FormEvent) { e.preventDefault(); if (!message.trim()) return; setSending(true); setReply(""); const responses = ["Flippers up! I’m on my way.", "Message received from the midnight skies!", "I’ll tuck that note beside the letters.", "A puffin never forgets a kind message."]; window.setTimeout(() => { setReply(responses[hash(message) % responses.length]); setMessage(""); setSending(false); }, 650); }
  function checkList(e: FormEvent) { e.preventDefault(); const name = listName.trim(); if (!name) return; setListResult(`${name}, you’re officially on the NICE list!`); }
  return <main className="app-shell">
    <header className="masthead"><div><p className="eyebrow">The North Pole Dispatch</p><h1>Popper Puffin Tracker</h1></div><div className="christmas-countdown" aria-label={countdown?.isChristmas ? "Merry Christmas" : countdown ? `${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, and ${countdown.seconds} seconds until Christmas` : "Loading Christmas countdown"}><p>CHRISTMAS COUNTDOWN</p>{countdown?.isChristmas ? <strong className="merry-christmas">MERRY CHRISTMAS!</strong> : <div className="countdown-units"><span><b>{countdown?.days ?? "--"}</b><small>DAYS</small></span><i>:</i><span><b>{String(countdown?.hours ?? 0).padStart(2, "0")}</b><small>HRS</small></span><i>:</i><span><b>{String(countdown?.minutes ?? 0).padStart(2, "0")}</b><small>MIN</small></span><i>:</i><span><b>{String(countdown?.seconds ?? 0).padStart(2, "0")}</b><small>SEC</small></span></div>}</div><div className="live"><span /> LIVE</div></header>
    <section className="dashboard" aria-label="Live Popper tracking dashboard">
      <aside className="portrait-card panel"><div className="portrait-frame"><img src="/popper-portrait.png" alt="Popper Puffin in his delivery cap" /></div><p className="ribbon">POPPER PUFFIN</p><dl className="mini-stats"><div><dt>Location</dt><dd>{current.from} → {current.to}</dd></div><div><dt>Local time</dt><dd>{flightWeather ? localTime(flightWeather.timezone, now) : "Locating…"}</dd></div><div><dt>Weather</dt><dd>{flightWeather ? `${Math.round(flightWeather.temperature)}°F · ${flightWeather.summary}` : "Checking skies…"}</dd></div></dl></aside>
      <section className="map-card panel" aria-label="Interactive globe" data-map-fix="v5" data-popper-tooltip="city-v6"><div className="map-heading"><div><span className="label">CURRENT LEG</span><strong>{current.from} → {current.to}</strong></div><span className="map-status">SIGNAL STRONG</span></div><div className="globe-wrap"><div ref={mapRef} className="mapbox" aria-label="Mapbox globe" />{!mapReady && <div className="css-globe" role="img" aria-label="Animated nighttime globe preview"><div className="continents" /><div className="night-city-lights" aria-hidden="true">{worldLights.filter((destination) => isDarkHour(hourAt(destination, now))).map((destination) => <i key={destination.name} style={{ left: `${((destination.lng + 180) / 360) * 100}%`, top: `${((90 - destination.lat) / 180) * 100}%` }} />)}</div><div className="fallback-north-pole" title="North Pole"><span className="north-pole-crop"><img src="/north-pole-marker.png" alt="" /></span></div><button className="fallback-marker" title={current.city} aria-label={`Popper Puffin near ${current.city}`}><img src="/popper-marker.png" alt="" /></button></div>}<div className="map-radar" aria-hidden="true"><i /></div><div className="coordinates" aria-live="polite">{current.lat.toFixed(4)}, {current.lng.toFixed(4)}</div></div><div className="instruments"><div><span>LATITUDE</span><strong>{coord(current.lat, "N", "S")}</strong></div><div className="compass" aria-label="Heading north east"><i>NE</i></div><div><span>LONGITUDE</span><strong>{coord(current.lng, "E", "W")}</strong></div><div><span>ALTITUDE</span><strong>{(28600 + Math.sin(progress * Math.PI) * 2400).toFixed(0)} FT</strong></div></div></section>
      <aside className="side-stack"><section className="panel status-card"><h2>Status &amp; info</h2><p className="status-line"><span>●</span> Following the night</p><div className="letter-count"><span>LETTERS PICKED UP</span><strong>{letters.toLocaleString()}</strong><small>and counting</small></div><div className="progress"><i style={{ width: `${36 + progress * 11}%` }} /></div><p className="next">Next stop <strong>{current.to}</strong></p></section><section className="panel eta-card"><p className="eyebrow">WHEN WILL POPPER ARRIVE?</p><h2>ETA Search</h2><form onSubmit={search}><label htmlFor="address">Enter any address worldwide</label><div className="search-row"><input id="address" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="City, postcode, or address" autoComplete="street-address" /><button disabled={searching}>{searching ? "…" : "Find ETA"}</button></div></form>{searchError && <p className="error" role="alert">{searchError}</p>}{place && <div className="eta-result" aria-live="polite"><span>ESTIMATED ARRIVAL</span><strong>{etaFor(place)}</strong><p>{place.name}</p><small>Local time · a magical estimate</small></div>}</section></aside>
    </section>
    <section className="nice-checker panel" aria-labelledby="nice-list-heading"><div className="nice-copy"><p className="eyebrow">NORTH POLE LIST DESK</p><h2 id="nice-list-heading">Naughty or Nice?</h2><small>Names are checked privately and never saved.</small></div><form onSubmit={checkList}><label htmlFor="list-name">Enter your first name</label><div><input id="list-name" value={listName} onChange={(e) => { setListName(e.target.value); setListResult(""); }} maxLength={40} autoComplete="off" placeholder="Your name" /><button>Check the list</button></div></form><div className={`nice-result${listResult ? " is-visible" : ""}`} aria-live="polite">{listResult && <><span aria-hidden="true">★</span><strong>NICE LIST</strong><p>{listResult}</p></>}</div></section>
    <section className="message-dock panel"><div><p className="eyebrow">RADIO ROOM</p><h2>Send Popper a message</h2></div><form onSubmit={sendMessage}><label className="sr-only" htmlFor="message">Your brief message</label><input id="message" maxLength={120} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Wish him fair winds…" /><span>{message.length}/120</span><button disabled={sending}>{sending ? "Sending…" : "Send ✦"}</button></form><div className="reply" aria-live="polite">{reply && <><b>Popper:</b> “{reply}”</>}</div></section><footer>Times are generated for a little Christmas magic. · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo</a></footer>
  </main>;
}
