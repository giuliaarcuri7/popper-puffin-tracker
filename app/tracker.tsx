"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Place = { name: string; longitude: number; latitude: number; timezone: string };
const route = [
  { name: "Reykjavík", lng: -21.94, lat: 64.15 }, { name: "New York", lng: -74.01, lat: 40.71 },
  { name: "Rio de Janeiro", lng: -43.17, lat: -22.91 }, { name: "Cape Town", lng: 18.42, lat: -33.92 },
  { name: "Tokyo", lng: 139.69, lat: 35.68 }, { name: "London", lng: -0.13, lat: 51.51 },
];
const ROUTE_TICK_MS = 2000;
const ROUTE_DURATION_MS = 24 * 60 * 60 * 1000;
function hash(value: string) { let h = 2166136261; for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return h >>> 0; }
function etaFor(place: Place) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: place.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const ymd = Object.fromEntries(parts.map((p) => [p.type, p.value])); const minutes = hash(`${place.name}|${ymd.year}-${ymd.month}-${ymd.day}`) % 181;
  return `${Math.floor(minutes / 60) || 12}:${String(minutes % 60).padStart(2, "0")} AM`;
}
function coord(value: number, positive: string, negative: string) { return `${Math.abs(value).toFixed(3)}° ${value >= 0 ? positive : negative}`; }

export default function Tracker() {
  const mapRef = useRef<HTMLDivElement>(null); const mapObject = useRef<import("mapbox-gl").Map | null>(null); const mapMarker = useRef<import("mapbox-gl").Marker | null>(null);
  const [mapReady, setMapReady] = useState(false); const [index, setIndex] = useState(0); const [progress, setProgress] = useState(0); const [letters, setLetters] = useState(1287342);
  const [query, setQuery] = useState(""); const [place, setPlace] = useState<Place | null>(null); const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState("");
  const [message, setMessage] = useState(""); const [reply, setReply] = useState(""); const [sending, setSending] = useState(false);
  const current = useMemo(() => { const a = route[index], b = route[(index + 1) % route.length]; return { lat: a.lat + (b.lat - a.lat) * progress, lng: a.lng + (b.lng - a.lng) * progress, from: a.name, to: b.name }; }, [index, progress]);

  useEffect(() => {
    const updateRoute = () => {
      const routePosition = ((Date.now() % ROUTE_DURATION_MS) / ROUTE_DURATION_MS) * route.length;
      setIndex(Math.floor(routePosition) % route.length);
      setProgress(routePosition % 1);
      setLetters((n) => n + 2);
    };
    updateRoute();
    const timer = window.setInterval(updateRoute, ROUTE_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { mapMarker.current?.setLngLat([current.lng, current.lat]).getPopup()?.setHTML(`<strong>Popper Puffin</strong><br>${current.lat.toFixed(4)}, ${current.lng.toFixed(4)}`); }, [current]);
  useEffect(() => {
    if (!mapRef.current || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return; let active = true;
    import("mapbox-gl").then(({ default: mapboxgl }) => { if (!active || !mapRef.current) return; mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
      const map = new mapboxgl.Map({ container: mapRef.current, style: "mapbox://styles/mapbox/navigation-night-v1", projection: "globe", center: [current.lng, current.lat], zoom: 1.45, attributionControl: false }); mapObject.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right"); map.on("style.load", () => map.setFog({ color: "#101943", "high-color": "#536bac", "horizon-blend": .15, "space-color": "#050921", "star-intensity": .8 }));
      const el = document.createElement("button"); el.className = "popper-marker"; el.title = "Popper’s exact location"; el.setAttribute("aria-label", "Popper’s exact location");
      const markerImage = document.createElement("img"); markerImage.src = "/popper-marker.png"; markerImage.alt = "";
      const markerFallback = document.createElement("span"); markerFallback.setAttribute("aria-hidden", "true"); markerFallback.textContent = "🐧";
      markerImage.addEventListener("load", () => { markerFallback.hidden = true; }); markerImage.addEventListener("error", () => { markerImage.hidden = true; }); el.append(markerImage, markerFallback);
      mapMarker.current = new mapboxgl.Marker({ element: el }).setLngLat([current.lng, current.lat]).setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML(`<strong>Popper Puffin</strong><br>${current.lat.toFixed(4)}, ${current.lng.toFixed(4)}`)).addTo(map); setMapReady(true);
    }); return () => { active = false; mapMarker.current?.remove(); mapObject.current?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function search(e: FormEvent) { e.preventDefault(); if (!query.trim()) return; setSearching(true); setSearchError(""); setPlace(null); try { const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Address not found"); setPlace(data); } catch (error) { setSearchError(error instanceof Error ? error.message : "Search failed"); } finally { setSearching(false); } }
  function sendMessage(e: FormEvent) { e.preventDefault(); if (!message.trim()) return; setSending(true); setReply(""); const responses = ["Flippers up! I’m on my way.", "Message received from the midnight skies!", "I’ll tuck that note beside the letters.", "A puffin never forgets a kind message."]; window.setTimeout(() => { setReply(responses[hash(message) % responses.length]); setMessage(""); setSending(false); }, 650); }
  return <main className="app-shell">
    <header className="masthead"><div><p className="eyebrow">The North Pole Dispatch</p><h1>Popper Puffin Tracker</h1></div><div className="live"><span /> LIVE</div></header>
    <section className="dashboard" aria-label="Live Popper tracking dashboard">
      <aside className="portrait-card panel"><div className="portrait-frame"><img src="/popper-portrait.png" alt="Popper Puffin in his delivery cap" onLoad={(e) => { const fallback = e.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = true; }} onError={(e) => { e.currentTarget.hidden = true; }} /><span aria-hidden="true">🐧</span></div><p className="ribbon">POPPER PUFFIN</p><dl className="mini-stats"><div><dt>Flight</dt><dd>PP-1224</dd></div><div><dt>Weather</dt><dd>Clear skies</dd></div></dl></aside>
      <section className="map-card panel" aria-label="Interactive globe"><div className="map-heading"><div><span className="label">CURRENT LEG</span><strong>{current.from} → {current.to}</strong></div><span className="map-status">SIGNAL STRONG</span></div><div className="globe-wrap"><div ref={mapRef} className="mapbox" aria-label="Mapbox globe" />{!mapReady && <div className="css-globe" role="img" aria-label="Animated nighttime globe preview"><div className="continents" /><button className="fallback-marker" title={`${current.lat.toFixed(4)}, ${current.lng.toFixed(4)}`} aria-label={`Popper at ${current.lat.toFixed(4)}, ${current.lng.toFixed(4)}`}><img src="/popper-marker.png" alt="" onLoad={(e) => { const fallback = e.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = true; }} onError={(e) => { e.currentTarget.hidden = true; }} /><span aria-hidden="true">🐧</span></button></div>}<div className="map-radar" aria-hidden="true"><i /></div><div className="coordinates" aria-live="polite">{current.lat.toFixed(4)}, {current.lng.toFixed(4)}</div></div><div className="instruments"><div><span>LATITUDE</span><strong>{coord(current.lat, "N", "S")}</strong></div><div className="compass" aria-label="Heading north east"><i>NE</i></div><div><span>LONGITUDE</span><strong>{coord(current.lng, "E", "W")}</strong></div><div><span>ALTITUDE</span><strong>{(28600 + Math.sin(progress * Math.PI) * 2400).toFixed(0)} FT</strong></div></div></section>
      <aside className="side-stack"><section className="panel status-card"><h2>Status &amp; info</h2><p className="status-line"><span>●</span> Flying south-east</p><div className="letter-count"><span>LETTERS PICKED UP</span><strong>{letters.toLocaleString()}</strong><small>and counting</small></div><div className="progress"><i style={{ width: `${36 + progress * 11}%` }} /></div><p className="next">Next stop <strong>{current.to}</strong></p></section><section className="panel eta-card"><p className="eyebrow">WHEN WILL POPPER ARRIVE?</p><h2>ETA Search</h2><form onSubmit={search}><label htmlFor="address">Enter any address worldwide</label><div className="search-row"><input id="address" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="City, postcode, or address" autoComplete="street-address" /><button disabled={searching}>{searching ? "…" : "Find ETA"}</button></div></form>{searchError && <p className="error" role="alert">{searchError}</p>}{place && <div className="eta-result" aria-live="polite"><span>ESTIMATED ARRIVAL</span><strong>{etaFor(place)}</strong><p>{place.name}</p><small>Local time · a magical estimate</small></div>}</section></aside>
    </section>
    <section className="message-dock panel"><div><p className="eyebrow">RADIO ROOM</p><h2>Send Popper a message</h2></div><form onSubmit={sendMessage}><label className="sr-only" htmlFor="message">Your brief message</label><input id="message" maxLength={120} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Wish him fair winds…" /><span>{message.length}/120</span><button disabled={sending}>{sending ? "Sending…" : "Send ✦"}</button></form><div className="reply" aria-live="polite">{reply && <><b>Popper:</b> “{reply}”</>}</div></section><footer>Fictional tracking experience · Times are generated for a little Christmas magic.</footer>
  </main>;
}
