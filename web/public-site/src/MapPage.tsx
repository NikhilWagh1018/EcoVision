import maplibregl, { GeoJSONSource, Map, Marker } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import "./layout.css";
import { PublicSpot, SpotPhoto, Stats, WardCount, fetchPhotos, fetchSpots, fetchStats, fetchWards } from "./api";

const BOUNDS: [[number, number], [number, number]] = [[73.7, 18.38], [74.03, 18.73]];
const SEV_LABEL: Record<string, string> = { clean: "Clean", moderate: "Moderate", severe: "Severe" };
const SEV_COLOR: Record<string, string> = { severe: "#B3261E", moderate: "#D98A00", clean: "#2E8B57", cleaned: "#2E8B57" };
const BRAND = "#0B5C63";
const RED = "#C0463D";
const BLUE = "#4A5F85";
const FONT = ["Open Sans Regular", "Arial Unicode MS Regular"];
const WARD_SHADES = ["rgba(224,129,111,0.14)", "#F6C9BE", "#EE9F8F", "#DD6E5C", "#B3261E"];

type View = "map" | "list";
type Info = { title: string; sub: string; extra?: string; red?: string };

const shade = (open: number) => (open === 0 ? WARD_SHADES[0] : open <= 2 ? WARD_SHADES[1] : open <= 5 ? WARD_SHADES[2] : open <= 10 ? WARD_SHADES[3] : WARD_SHADES[4]);
const wardNum = (name: string) => parseInt(name, 10);
const stateOf = (s: PublicSpot) => (s.status === "cleaned" ? "cleaned" : s.severity ?? "unrated");

// point-in-polygon (handles holes and multipolygons)
type Ring = number[][];
const inRing = (p: [number, number], ring: Ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const inPoly = (p: [number, number], rings: Ring[]) => inRing(p, rings[0]) && !rings.slice(1).some((r) => inRing(p, r));
const inFC = (p: [number, number], fc: GeoJSON.FeatureCollection | null) =>
  !!fc && fc.features.some((f) => f.geometry.type === "Polygon" ? inPoly(p, f.geometry.coordinates)
    : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates.some((q) => inPoly(p, q)) : false);

function toGeoJSON(spots: PublicSpot[]) {
  return {
    type: "FeatureCollection" as const,
    features: spots.map((s) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [Number(s.lon), Number(s.lat)] },
      properties: { id: s.id, state: stateOf(s) },
    })),
  };
}

const isDesktop = () => window.matchMedia("(min-width: 900px)").matches;
const panelPad = () => (isDesktop() ? 360 : 0);
const NO_PAD = { left: 0, top: 0, right: 0, bottom: 0 };
const bboxOf = (g: GeoJSON.Geometry): [number, number, number, number] | null => {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  const walk = (x: any) => {
    if (typeof x[0] === "number") { a = Math.min(a, x[0]); c = Math.max(c, x[0]); b = Math.min(b, x[1]); d = Math.max(d, x[1]); }
    else x.forEach(walk);
  };
  if ("coordinates" in g) walk(g.coordinates);
  return Number.isFinite(a) ? [a, b, c, d] : null;
};
type Result = { kind: "ward"; w: WardCount } | { kind: "spot"; s: PublicSpot };

export default function MapPage({ flash, focusSpot }: { flash?: string | null; focusSpot?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const userMarker = useRef<Marker | null>(null);
  const cityFC = useRef<GeoJSON.FeatureCollection | null>(null);
  const pcmcFC = useRef<GeoJSON.FeatureCollection | null>(null);
  const prabhagFC = useRef<GeoJSON.FeatureCollection | null>(null);
  const wardByNum = useRef<Record<number, WardCount>>({});
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("map");
  const [spots, setSpots] = useState<PublicSpot[]>([]);
  const [wards, setWards] = useState<WardCount[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [selected, setSelected] = useState<PublicSpot | null>(null);
  const [photos, setPhotos] = useState<SpotPhoto[]>([]);
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("all");
  const [info, setInfo] = useState<Info | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetchSpots().then(setSpots).catch((e) => setProblems((p) => [...p, `spots (${e.message})`]));
    fetchStats().then(setStats).catch((e) => setProblems((p) => [...p, `stats (${e.message})`]));
    fetchWards().then((w) => {
      setWards(w);
      wardByNum.current = Object.fromEntries(w.map((x) => [wardNum(x.name), x]));
    }).catch(() => undefined);
    fetch("/pmc-city.geojson").then((r) => r.json()).then((j) => (cityFC.current = j)).catch(() => undefined);
    fetch("/pmc-prabhags.geojson").then((r) => r.json()).then((j) => (prabhagFC.current = j)).catch(() => undefined);
    fetch("/pcmc-boundary.geojson").then((r) => r.json()).then((j) => (pcmcFC.current = j)).catch(() => undefined);
  }, []);

  useEffect(() => { if (flash) setNote(flash); }, [flash]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 7000);
    return () => clearTimeout(t);
  }, [note]);

  const shown = useMemo(
    () => spots.filter((s) =>
      (sev === "all" || stateOf(s) === sev) &&
      (status === "all" || (status === "open" ? s.status !== "cleaned" : s.status === "cleaned"))),
    [spots, sev, status],
  );

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new maplibregl.Map({
      container: el.current, center: [73.88, 18.54], zoom: 10.5, attributionControl: { compact: true },
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: { base: { type: "raster", tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap contributors",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"] } },
        layers: [{ id: "base", type: "raster", source: "base",
          paint: { "raster-saturation": -0.9, "raster-contrast": -0.25, "raster-brightness-min": 0.3 } }],
      },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.fitBounds(BOUNDS, { padding: 30, animate: false });

    m.on("load", () => {
      m.addSource("mask", { type: "geojson", data: "/pmc-mask.geojson" });
      m.addSource("city", { type: "geojson", data: "/pmc-city.geojson" });
      m.addSource("gaps", { type: "geojson", data: "/pmc-gaps.geojson", generateId: true });
      m.addSource("prabhags", { type: "geojson", data: "/pmc-prabhags.geojson", generateId: true });
      m.addSource("pcmc", { type: "geojson", data: "/pcmc-wards.geojson", generateId: true });
      m.addSource("pcmc-city", { type: "geojson", data: "/pcmc-boundary.geojson" });
      m.addSource("spots", { type: "geojson", cluster: true, clusterRadius: 45, clusterMaxZoom: 14,
        data: { type: "FeatureCollection", features: [] } });

      const hoverOn = ["boolean", ["feature-state", "hover"], false] as maplibregl.ExpressionSpecification;
      const L = (l: maplibregl.LayerSpecification) => m.addLayer(l);
      L({ id: "outside-mask", type: "fill", source: "mask", paint: { "fill-color": "#fff", "fill-opacity": 0.55 } });
      // PCMC: neighbouring corporation, outside the pilot
      L({ id: "pcmc-fill", type: "fill", source: "pcmc", paint: { "fill-color": BLUE, "fill-opacity": 0.1 } });
      L({ id: "pcmc-line", type: "line", source: "pcmc", paint: { "line-color": "#8A9BB8", "line-width": 0.8, "line-dasharray": [2, 2] } });
      // PMC prabhags shaded by open spots
      L({ id: "ward-fill", type: "fill", source: "prabhags", paint: { "fill-color": WARD_SHADES[0], "fill-opacity": 0.75 } });
      L({ id: "ward-line", type: "line", source: "prabhags", paint: { "line-color": "#D98B80", "line-width": 0.9, "line-dasharray": [2, 2] } });
      // Non-PMC pockets (cantonments), filled so the city reads as one shape
      L({ id: "gap-fill", type: "fill", source: "gaps", paint: { "fill-color": "#DCDCDC", "fill-opacity": 0.85 } });
      L({ id: "gap-line", type: "line", source: "gaps", paint: { "line-color": "#9A9A9A", "line-width": 1, "line-dasharray": [2, 2] } });
      // hover highlight (stroke + tint), like NammaKasa
      L({ id: "ward-hover-fill", type: "fill", source: "prabhags", paint: { "fill-color": RED, "fill-opacity": ["case", hoverOn, 0.28, 0] } });
      L({ id: "ward-hover-line", type: "line", source: "prabhags", paint: { "line-color": RED, "line-width": 2.5, "line-opacity": ["case", hoverOn, 1, 0] } });
      L({ id: "pcmc-hover-fill", type: "fill", source: "pcmc", paint: { "fill-color": BLUE, "fill-opacity": ["case", hoverOn, 0.25, 0] } });
      L({ id: "pcmc-hover-line", type: "line", source: "pcmc", paint: { "line-color": BLUE, "line-width": 2.5, "line-opacity": ["case", hoverOn, 1, 0] } });
      L({ id: "gap-hover-line", type: "line", source: "gaps", paint: { "line-color": "#555", "line-width": 2.2, "line-opacity": ["case", hoverOn, 1, 0] } });
      // labels
      L({ id: "ward-num", type: "symbol", source: "prabhags", minzoom: 10.8, maxzoom: 12.5,
        layout: { "text-field": ["to-string", ["get", "num"]], "text-font": FONT, "text-size": 12 },
        paint: { "text-color": "#5A2A25", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
      L({ id: "ward-name", type: "symbol", source: "prabhags", minzoom: 12.5,
        layout: { "text-field": ["concat", ["to-string", ["get", "num"]], " ", ["get", "name"]], "text-font": FONT, "text-size": 11, "text-max-width": 7 },
        paint: { "text-color": "#5A2A25", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
      L({ id: "pcmc-num", type: "symbol", source: "pcmc", minzoom: 11.5,
        layout: { "text-field": ["to-string", ["get", "num"]], "text-font": FONT, "text-size": 11 },
        paint: { "text-color": "#34425E", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
      L({ id: "gap-label", type: "symbol", source: "gaps", minzoom: 11,
        layout: { "text-field": ["get", "name"], "text-font": FONT, "text-size": 11, "text-max-width": 6 },
        paint: { "text-color": "#555", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
      // city outlines
      L({ id: "pcmc-city-line", type: "line", source: "pcmc-city", paint: { "line-color": BLUE, "line-width": 2, "line-dasharray": [4, 2] } });
      L({ id: "city-line", type: "line", source: "city", paint: { "line-color": RED, "line-width": 2, "line-dasharray": [4, 2] } });
      // spots
      L({ id: "clusters", type: "circle", source: "spots", filter: ["has", "point_count"],
        paint: { "circle-color": BRAND, "circle-stroke-color": "#fff", "circle-stroke-width": 2,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26, 200, 32] } });
      L({ id: "cluster-count", type: "symbol", source: "spots", filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": FONT, "text-size": 12 }, paint: { "text-color": "#fff" } });
      L({ id: "spots", type: "circle", source: "spots", filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 9, "circle-stroke-width": 2.5, "circle-stroke-color": "#fff",
          "circle-color": ["match", ["get", "state"], "severe", SEV_COLOR.severe, "moderate", SEV_COLOR.moderate,
            "clean", SEV_COLOR.clean, "cleaned", SEV_COLOR.cleaned, "#5B6B70"] } });

      // hover highlight + info card, for each region layer
      const regions: { layer: string; source: string; info: (p: Record<string, any>) => Info }[] = [
        { layer: "ward-fill", source: "prabhags", info: (p) => {
            const w = wardByNum.current[Number(p.num)];
            const open = w ? Number(w.open_spots) : 0, cleaned = w ? Number(w.cleaned_spots) : 0;
            return { title: `${p.num} ${p.name}`, sub: "PMC prabhag", extra: `${open} open · ${cleaned} cleaned`, red: `${open + cleaned} reports` };
          } },
        { layer: "pcmc-fill", source: "pcmc", info: (p) => ({ title: `Ward ${p.num ?? ""}`.trim(), sub: `Pimpri Chinchwad (PCMC)${p.zone ? ` · Zone ${p.zone}` : ""}`, extra: "Outside the PMC pilot area" }) },
        { layer: "gap-fill", source: "gaps", info: (p) => ({ title: String(p.name), sub: "Not under PMC", extra: "Separate civic authority" }) },
      ];
      for (const r of regions) {
        let hovered: string | number | undefined;
        const clear = () => { if (hovered !== undefined) m.setFeatureState({ source: r.source, id: hovered }, { hover: false }); hovered = undefined; };
        m.on("mousemove", r.layer, (e) => {
          if (m.queryRenderedFeatures(e.point, { layers: ["spots", "clusters"] }).length) return;
          const f = e.features?.[0];
          if (!f || f.id === undefined) return;
          if (f.id !== hovered) { clear(); hovered = f.id; m.setFeatureState({ source: r.source, id: hovered }, { hover: true }); }
          setInfo(r.info(f.properties ?? {}));
        });
        m.on("mouseleave", r.layer, () => { clear(); setInfo(null); });
        m.on("click", r.layer, (e) => {
          if (m.queryRenderedFeatures(e.point, { layers: ["spots", "clusters"] }).length) return;
          const f = e.features?.[0];
          if (f) setInfo(r.info(f.properties ?? {}));
        });
      }
      m.on("click", "clusters", async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const z = await (m.getSource("spots") as GeoJSONSource).getClusterExpansionZoom(f.properties?.cluster_id);
        m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z + 0.5 });
      });
      m.on("click", "spots", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id === undefined) return;
        setSelected({ id } as PublicSpot);
        const at = (e.features?.[0]?.geometry as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined;
        if (at) m.easeTo({ center: at, padding: { left: panelPad(), top: 0, right: 0, bottom: 0 } });
      });
      for (const l of ["clusters", "spots"]) {
        m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
      }
      setReady(true);
    });
    m.on("error", (e) => console.warn("map error:", e.error?.message ?? e));
    map.current = m;
  }, []);

  useEffect(() => {
    if (!ready) return;
    (map.current?.getSource("spots") as GeoJSONSource | undefined)?.setData(toGeoJSON(shown));
  }, [ready, shown]);

  useEffect(() => {
    if (!ready) return;
    const pairs: (number | string)[] = [];
    for (const w of wards) pairs.push(wardNum(w.name), shade(Number(w.open_spots)));
    const expr = pairs.length
      ? (["match", ["get", "num"], ...pairs, WARD_SHADES[0]] as unknown as maplibregl.ExpressionSpecification)
      : WARD_SHADES[0];
    map.current?.setPaintProperty("ward-fill", "fill-color", expr);
  }, [ready, wards]);

  useEffect(() => { if (view === "map") map.current?.resize(); }, [view]);

  const full = useMemo(() => spots.find((s) => s.id === selected?.id) ?? null, [spots, selected]);
  useEffect(() => {
    setPhotos([]);
    if (selected) fetchPhotos(selected.id).then(setPhotos).catch(() => setPhotos([]));
  }, [selected?.id]);
  const before = [...photos].reverse().find((p) => p.kind === "before");
  const after = [...photos].reverse().find((p) => p.kind === "after");

  const showOnMap = (s: PublicSpot) => {
    setView("map");
    setSelected({ id: s.id } as PublicSpot);
    setTimeout(() => map.current?.flyTo({ center: [Number(s.lon), Number(s.lat)], zoom: 15, padding: { left: panelPad(), top: 0, right: 0, bottom: 0 } }), 50);
  };

  const [query, setQuery] = useState("");
  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];
    const n = q.match(/^(?:spot\s*)?#?(\d+)$/);
    if (n) { const s = spots.find((x) => x.id === Number(n[1])); if (s) out.push({ kind: "spot", s }); }
    for (const w of wards) if (w.name.toLowerCase().includes(q)) out.push({ kind: "ward", w });
    return out.slice(0, 6);
  }, [query, spots, wards]);

  const pick = (r: Result) => {
    setQuery("");
    setView("map");
    if (r.kind === "spot") { showOnMap(r.s); return; }
    const num = wardNum(r.w.name);
    const f = prabhagFC.current?.features.find((x) => Number(x.properties?.num) === num);
    const b = f ? bboxOf(f.geometry) : null;
    if (b) map.current?.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: 100, bottom: 40, left: (full ? panelPad() : 0) + 40, right: 40 }, maxZoom: 15 });
    setInfo({ title: r.w.name, sub: "PMC prabhag", extra: `${r.w.open_spots} open · ${r.w.cleaned_spots} cleaned` });
  };

  const closePanel = () => { setSelected(null); map.current?.easeTo({ padding: NO_PAD, duration: 300 }); };

  // Shareable spot link (#/spot/12): open that spot's sheet and fly to it once the data is in
  const focused = useRef(false);
  useEffect(() => {
    if (!focusSpot || focused.current || !ready || spots.length === 0) return;
    focused.current = true;
    const s = spots.find((x) => x.id === focusSpot);
    if (s) showOnMap(s); else setNote(`Spot ${focusSpot} was not found`);
  }, [focusSpot, ready, spots]);

  const share = async (id: number) => {
    const url = `${location.origin}${location.pathname}#/spot/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: `EcoVision Pune: spot ${id}`, url });
      else { await navigator.clipboard.writeText(url); setNote("Link copied"); }
    } catch { /* share cancelled */ }
  };

  // Locate button: tells people when they are outside Pune. Test with ?fakeLoc=19.07,72.87 (Mumbai)
  const locate = () => {
    const done = (lat: number, lon: number) => {
      const pt: [number, number] = [lon, lat];
      const m = map.current;
      if (!m) return;
      userMarker.current?.remove();
      const dot = document.createElement("div");
      dot.className = "userdot";
      userMarker.current = new maplibregl.Marker({ element: dot }).setLngLat(pt).addTo(m);
      if (inFC(pt, cityFC.current)) { m.flyTo({ center: pt, zoom: 14 }); setNote(null); }
      else if (inFC(pt, pcmcFC.current)) { m.flyTo({ center: pt, zoom: 12.5 }); setNote("You're in Pimpri Chinchwad, outside the PMC pilot area"); }
      else setNote("You're outside Pune");
    };
    const fake = new URLSearchParams(window.location.search).get("fakeLoc");
    if (fake) { const [la, lo] = fake.split(",").map(Number); done(la, lo); return; }
    if (!navigator.geolocation) { setNote("Location is not available on this device"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => done(p.coords.latitude, p.coords.longitude),
      () => setNote("Couldn't get your location. Check the browser permission."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="app">
      <header className="bar">
        <h1>EcoVision <span>Pune</span></h1>
        <div className="barright">
        <a className="navlink" href="#/wards">Wards</a>
        <div className="seg" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === "map"} className={view === "map" ? "on" : ""} onClick={() => setView("map")}>Map</button>
          <button role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
        </div></div>
      </header>

      <main className={"stage" + (view === "map" && full ? " hasPanel" : "")}>
        <div className="floatbar">
          <div className="search">
            <input type="search" placeholder="Search a ward or spot number" aria-label="Search wards or spots" value={query}
              onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && results[0]) pick(results[0]); }} />
            {results.length > 0 && (
              <ul className="results">
                {results.map((r) => (
                  <li key={r.kind === "ward" ? `w${r.w.id}` : `s${r.s.id}`}>
                    <button onClick={() => pick(r)}>
                      {r.kind === "ward" ? <><b>{r.w.name}</b><small>Ward · {r.w.open_spots} open</small></> : <><b>Spot {r.s.id}</b><small>{r.s.ward ?? "Not linked to a ward yet"}</small></>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select value={sev} aria-label="Severity" onChange={(e) => setSev(e.target.value)}>
            <option value="all">All severity</option><option value="severe">Severe</option>
            <option value="moderate">Moderate</option><option value="clean">Clean</option><option value="unrated">Awaiting review</option>
          </select>
          <select value={status} aria-label="Status" onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All status</option><option value="open">Open</option><option value="cleaned">Cleaned</option>
          </select>
        </div>
        <div ref={el} className="map" aria-label="Map of waste spots in Pune" style={{ visibility: view === "map" ? "visible" : "hidden" }} />
        {view === "map" && stats && (
          <div className="pill"><b className="red">{stats.open_spots}</b> Active <i /> <b>{stats.total_spots}</b> Reports <i /> <b>{stats.verified_cleanups}</b> Verified</div>
        )}
        {problems.length > 0 && (
          <p className="banner" role="alert">Could not load: {problems.join(", ")}. Open http://localhost:8000/api/v1/public/spots to see the error.</p>
        )}
        {problems.length === 0 && stats && stats.total_spots === 0 && view === "map" && <p className="banner">No spots yet. Be the first to report one.</p>}

        {view === "map" && (
          <>
            <aside className="legend" aria-label="Map key">
              <span><i style={{ background: SEV_COLOR.severe }} />Severe</span>
              <span><i style={{ background: SEV_COLOR.moderate }} />Moderate</span>
              <span><i style={{ background: SEV_COLOR.cleaned }} />Cleaned</span>
              <span><i style={{ background: "#5B6B70" }} />Awaiting review</span>
              <small>Prabhag shade = open spots</small>
            </aside>
            {info && (
              <div className="card" aria-live="polite">
                <strong>{info.title}</strong>
                <span>{info.sub}</span>
                {info.extra && <span>{info.extra}</span>}
                {info.red && <b className="red">{info.red}</b>}
              </div>
            )}
            <button className="locate" onClick={locate} aria-label="Find my location" title="Find my location">◎</button>
            {note && <div className="note" role="status">{note}</div>}
          </>
        )}

        {view === "list" && (
          <ul className="list">
            {shown.length === 0 && <li className="empty">No spots match these filters.</li>}
            {shown.map((s) => (
              <li key={s.id}>
                <button onClick={() => showOnMap(s)}>
                  <i style={{ background: SEV_COLOR[stateOf(s)] ?? "#5B6B70" }} />
                  <span><b>Spot {s.id}</b>
                    <small>{s.status === "cleaned" ? "Cleaned and verified" : s.severity ? `${SEV_LABEL[s.severity]} waste` : "Waiting for review"}
                      {s.ward ? ` · ${s.ward}` : ""} · {new Date(s.first_reported_at).toLocaleDateString()}</small></span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {view === "map" && full && (() => {
          const st = stateOf(full);
          const isOpen = full.status !== "cleaned";
          const days = Math.max(0, Math.floor((Date.now() - new Date(full.first_reported_at).getTime()) / 86400000));
          const wardRec = full.ward ? wards.find((w) => w.name === full.ward) : undefined;
          const sevText = st === "cleaned" ? "Cleaned" : st === "unrated" ? "Awaiting review" : SEV_LABEL[st] ?? st;
          const link = `${location.origin}${location.pathname}#/spot/${full.id}`;
          const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Garbage spot ${full.id}${full.ward ? ` in ${full.ward}` : ""}, Pune, has been open for ${days} days.`)}&url=${encodeURIComponent(link)}`;
          return (
            <section className="sheet" aria-live="polite">
              <div className="shead">
                <span className="badge"><i style={{ background: SEV_COLOR[st] ?? "#5B6B70" }} />{sevText} · {isOpen ? "Unresolved" : "Resolved"}</span>
                <span className="hbtns">
                  <button className="iconbtn" onClick={() => share(full.id)} aria-label="Share this spot">Share</button>
                  <button className="iconbtn" onClick={closePanel} aria-label="Close details">✕</button>
                </span>
              </div>
              <div className="sbody">
                <div className="photos">
                  {before && <figure><img src={before.photo_url} alt="Spot before cleanup" /><figcaption>Reported</figcaption></figure>}
                  {after && <figure><img src={after.photo_url} alt="Spot after cleanup" /><figcaption>After cleanup</figcaption></figure>}
                  {!before && !after && <p className="muted">No photo to show yet.</p>}
                </div>
                <h2>{full.ward ?? `Spot ${full.id}`}</h2>
                <p className="meta">Spot {full.id} · <a href={`https://www.google.com/maps/dir/?api=1&destination=${full.lat},${full.lon}`} target="_blank" rel="noreferrer">Get directions</a></p>
                <div className="facts">
                  <div><b>{isOpen ? days : "–"}</b><small>Days open</small></div>
                  <div><b>{new Date(full.first_reported_at).toLocaleDateString()}</b><small>First reported</small></div>
                  <div><b>{sevText}</b><small>Severity</small></div>
                </div>
                {isOpen && (
                  <div className="callout">
                    <span className="big">{days} days open</span>
                    <p>Posting it publicly keeps it in front of the civic body and your neighbours.</p>
                    <a className="xbtn" href={tweet} target="_blank" rel="noreferrer">Post on X</a>
                  </div>
                )}
                <h3>Know your ward</h3>
                <p className="meta">{full.ward ?? "Not linked to a ward yet"}{wardRec && <> · <a href={`#/ward/${wardRec.id}`}>See the ward page</a></>}</p>
                <h3>Elected representatives</h3>
                {full.representatives.length === 0 ? (
                  <p className="muted">Not linked yet. Ward and representative data is still being added.</p>
                ) : (
                  <ul className="reps">{full.representatives.map((r) => <li key={r.name + r.role}><strong>{r.name}</strong><small>{r.role} · {r.constituency}</small></li>)}</ul>
                )}
              </div>
              {isOpen && <div className="sfoot"><a className="verify" href={`#/cleanup/${full.id}`}>Verify cleanup</a></div>}
            </section>
          );
        })()}
      </main>

      <a className="report" href="#/report">Report a waste spot</a>
    </div>
  );
}
