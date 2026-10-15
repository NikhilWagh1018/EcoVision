import maplibregl, { GeoJSONSource, Map } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import "./map-extras.css";
import { PublicSpot, SpotPhoto, Stats, fetchPhotos, fetchSpots, fetchStats } from "./api";

const REPORT_URL = import.meta.env.VITE_REPORT_URL ?? "http://localhost:5173";
const PUNE: [number, number] = [73.8567, 18.5204];
const PUNE_BOUNDS: [[number, number], [number, number]] = [[73.72, 18.38], [74.03, 18.63]];
const SEV_LABEL: Record<string, string> = { clean: "Clean", moderate: "Moderate", severe: "Severe" };
const BRAND = "#0B5C63";
const ORANGE = "#D9780B";

function toGeoJSON(spots: PublicSpot[]) {
  return {
    type: "FeatureCollection" as const,
    features: spots.map((s) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [Number(s.lon), Number(s.lat)] },
      properties: { id: s.id, state: s.status === "cleaned" ? "cleaned" : s.severity ?? "unrated" },
    })),
  };
}

export default function App() {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [spots, setSpots] = useState<PublicSpot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [selected, setSelected] = useState<PublicSpot | null>(null);
  const [photos, setPhotos] = useState<SpotPhoto[]>([]);
  const [showPrabhags, setShowPrabhags] = useState(true);
  const [showOffices, setShowOffices] = useState(false);
  const [showPcmc, setShowPcmc] = useState(false);

  // Load spots and stats independently, so one failing endpoint does not hide the other.
  useEffect(() => {
    fetchSpots().then(setSpots).catch((e) => setProblems((p) => [...p, `spots (${e.message})`]));
    fetchStats().then(setStats).catch((e) => setProblems((p) => [...p, `stats (${e.message})`]));
  }, []);

  // Build the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new maplibregl.Map({
      container: el.current, center: PUNE, zoom: 11,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: { osm: { type: "raster", tileSize: 256, attribution: "© OpenStreetMap contributors",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"] } },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.fitBounds(PUNE_BOUNDS, { padding: { top: 90, bottom: 90, left: 20, right: 20 }, animate: false });

    m.on("load", () => {
      const empty = { type: "FeatureCollection" as const, features: [] };
      m.addSource("pmc-boundary", { type: "geojson", data: "/pmc-boundary.geojson" });
      m.addSource("prabhags", { type: "geojson", data: "/pmc-prabhags.geojson", generateId: true });
      m.addSource("offices", { type: "geojson", data: "/pmc-ward-offices.geojson" });
      m.addSource("pcmc-boundary", { type: "geojson", data: "/pcmc-boundary.geojson" });
      m.addSource("pcmc", { type: "geojson", data: "/pcmc-wards.geojson" });
      m.addSource("spots", { type: "geojson", data: empty });

      // PCMC (neighbouring corporation, shown for context only)
      m.addLayer({ id: "pcmc-fill", type: "fill", source: "pcmc-boundary", layout: { visibility: "none" },
        paint: { "fill-color": ORANGE, "fill-opacity": 0.05 } });
      m.addLayer({ id: "pcmc-line", type: "line", source: "pcmc", layout: { visibility: "none" },
        paint: { "line-color": ORANGE, "line-width": 1, "line-opacity": 0.7 } });
      m.addLayer({ id: "pcmc-boundary-line", type: "line", source: "pcmc-boundary", layout: { visibility: "none" },
        paint: { "line-color": ORANGE, "line-width": 2.5 } });
      m.addLayer({ id: "pcmc-label", type: "symbol", source: "pcmc", layout: { visibility: "none",
        "text-field": ["get", "num"], "text-font": ["Open Sans Regular"], "text-size": 10 }, minzoom: 11.5,
        paint: { "text-color": "#8A4B00", "text-halo-color": "#fff", "text-halo-width": 1.3 } });

      // PMC prabhags
      m.addLayer({ id: "prabhags-hover", type: "fill", source: "prabhags",
        paint: { "fill-color": BRAND, "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.14, 0.0] } });
      m.addLayer({ id: "prabhags-line", type: "line", source: "prabhags",
        paint: { "line-color": BRAND, "line-width": 1.4, "line-opacity": 0.8 } });
      m.addLayer({ id: "offices-line", type: "line", source: "offices", layout: { visibility: "none" },
        paint: { "line-color": "#6B4E9B", "line-width": 2.2, "line-dasharray": [3, 2] } });
      m.addLayer({ id: "prabhags-num", type: "symbol", source: "prabhags",
        layout: { "text-field": ["get", "num"], "text-font": ["Open Sans Regular"], "text-size": 12 }, minzoom: 10.5,
        paint: { "text-color": "#0B3D42", "text-halo-color": "#fff", "text-halo-width": 1.6 } });
      m.addLayer({ id: "prabhags-name", type: "symbol", source: "prabhags",
        layout: { "text-field": ["concat", ["get", "num"], " ", ["get", "name"]], "text-font": ["Open Sans Regular"],
          "text-size": 11, "text-max-width": 7 }, minzoom: 12.5,
        paint: { "text-color": "#0B3D42", "text-halo-color": "#fff", "text-halo-width": 1.6 } });
      m.setLayerZoomRange("prabhags-num", 10.5, 12.5);

      m.addLayer({ id: "boundary-casing", type: "line", source: "pmc-boundary",
        paint: { "line-color": "#fff", "line-width": 6, "line-opacity": 0.9 } });
      m.addLayer({ id: "boundary-line", type: "line", source: "pmc-boundary",
        paint: { "line-color": BRAND, "line-width": 3 } });
      m.addLayer({ id: "spots", type: "circle", source: "spots",
        paint: {
          "circle-radius": 9, "circle-stroke-width": 2.5, "circle-stroke-color": "#fff",
          "circle-color": ["match", ["get", "state"],
            "severe", "#B3261E", "moderate", "#D98A00", "clean", "#2E8B57", "cleaned", "#2E8B57", "#5B6B70"],
        } });

      let hovered: number | string | undefined;
      m.on("mousemove", "prabhags-hover", (e) => {
        const id = e.features?.[0]?.id;
        if (id === undefined || id === hovered) return;
        if (hovered !== undefined) m.setFeatureState({ source: "prabhags", id: hovered }, { hover: false });
        hovered = id;
        m.setFeatureState({ source: "prabhags", id }, { hover: true });
      });
      m.on("mouseleave", "prabhags-hover", () => {
        if (hovered !== undefined) m.setFeatureState({ source: "prabhags", id: hovered }, { hover: false });
        hovered = undefined;
      });
      m.on("click", "prabhags-hover", (e) => {
        if (m.queryRenderedFeatures(e.point, { layers: ["spots"] }).length) return; // a spot was clicked
        const pr = e.features?.[0]?.properties;
        const name = pr?.name, num = pr?.num;
        if (name) new maplibregl.Popup({ closeButton: false }).setLngLat(e.lngLat).setText(`Prabhag ${num} · ${name}`).addTo(m);
      });
      m.on("click", "spots", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id !== undefined) setSelected((prev) => (prev?.id === id ? prev : ({ id } as PublicSpot)));
      });
      m.on("mouseenter", "spots", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "spots", () => (m.getCanvas().style.cursor = ""));
      setReady(true);
    });
    m.on("error", (e) => console.warn("map error:", e.error?.message ?? e));
    map.current = m;
  }, []);

  // Push spots to the map as soon as BOTH the map and the data are ready, in either order.
  useEffect(() => {
    if (!ready) return;
    (map.current?.getSource("spots") as GeoJSONSource | undefined)?.setData(toGeoJSON(spots));
  }, [ready, spots]);

  useEffect(() => {
    if (!ready) return;
    const m = map.current!;
    const vis = (on: boolean) => (on ? "visible" : "none");
    for (const id of ["prabhags-line", "prabhags-num", "prabhags-name", "prabhags-hover"]) m.setLayoutProperty(id, "visibility", vis(showPrabhags));
    m.setLayoutProperty("offices-line", "visibility", vis(showOffices));
    for (const id of ["pcmc-fill", "pcmc-line", "pcmc-boundary-line", "pcmc-label"]) m.setLayoutProperty(id, "visibility", vis(showPcmc));
  }, [ready, showPrabhags, showOffices, showPcmc]);

  const full = useMemo(() => spots.find((s) => s.id === selected?.id) ?? null, [spots, selected]);
  useEffect(() => {
    setPhotos([]);
    if (selected) fetchPhotos(selected.id).then(setPhotos).catch(() => setPhotos([]));
  }, [selected?.id]);

  const before = [...photos].reverse().find((p) => p.kind === "before");
  const after = [...photos].reverse().find((p) => p.kind === "after");

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>EcoVision Pune</h1>
          <p>Every waste spot on a public map, tracked until a verified cleanup.</p>
        </div>
        {stats && (
          <dl className="stats">
            <div><dt>Open spots</dt><dd>{stats.open_spots}</dd></div>
            <div><dt>Cleaned</dt><dd>{stats.cleaned_spots}</dd></div>
            <div><dt>Verified cleanups</dt><dd>{stats.verified_cleanups}</dd></div>
          </dl>
        )}
      </header>

      <div ref={el} className="map" aria-label="Map of waste spots in Pune" />
      {problems.length > 0 && (
        <p className="banner" role="alert">
          Could not load: {problems.join(", ")}. Open http://localhost:8000/api/v1/public/spots to see the error.
        </p>
      )}
      {problems.length === 0 && stats && stats.total_spots === 0 && <p className="banner">No spots yet. Be the first to report one.</p>}

      <aside className="legend" aria-label="Map key">
        <span><i style={{ background: "#B3261E" }} />Severe</span>
        <span><i style={{ background: "#D98A00" }} />Moderate</span>
        <span><i style={{ background: "#2E8B57" }} />Cleaned</span>
        <span><i style={{ background: "#5B6B70" }} />Awaiting review</span>
        <label><input type="checkbox" checked={showPrabhags} onChange={(e) => setShowPrabhags(e.target.checked)} />PMC prabhags</label>
        <label><input type="checkbox" checked={showOffices} onChange={(e) => setShowOffices(e.target.checked)} />Ward offices (old city)</label>
        <label><input type="checkbox" checked={showPcmc} onChange={(e) => setShowPcmc(e.target.checked)} />PCMC wards</label>
      </aside>

      <p className="credit">Boundaries: PMC ward maps, traced by DataMeet (CC BY-SA 2.5 IN). PCMC shown for context only.</p>

      <a className="report" href={REPORT_URL}>Report a waste spot</a>

      {full && (
        <section className="sheet" aria-live="polite">
          <button className="close" onClick={() => setSelected(null)} aria-label="Close details">Close</button>
          <h2>Spot {full.id}</h2>
          <p className="meta">
            {full.status === "cleaned" ? "Cleaned and verified" : full.severity ? `${SEV_LABEL[full.severity]} waste` : "Waiting for review"}
            {full.ward ? `, ${full.ward}` : ""}
          </p>
          <div className="photos">
            {before && <figure><img src={before.photo_url} alt="Spot before cleanup" /><figcaption>Reported</figcaption></figure>}
            {after && <figure><img src={after.photo_url} alt="Spot after cleanup" /><figcaption>After cleanup</figcaption></figure>}
          </div>
          <h3>Responsible representatives</h3>
          {full.representatives.length === 0 ? (
            <p className="muted">Not linked yet. Ward and representative data is still being added.</p>
          ) : (
            <ul>{full.representatives.map((r) => <li key={r.name + r.role}><strong>{r.name}</strong>, {r.role} for {r.constituency}</li>)}</ul>
          )}
        </section>
      )}
    </div>
  );
}
