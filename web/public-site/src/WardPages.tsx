import { useEffect, useMemo, useState } from "react";
import { PublicSpot, WardCount, fetchSpots, fetchWards } from "./api";
import "./wards.css";

const COLOR: Record<string, string> = { severe: "#B3261E", moderate: "#D98A00", clean: "#2E8B57", cleaned: "#2E8B57" };
const LABEL: Record<string, string> = { severe: "Severe waste", moderate: "Moderate waste", clean: "Clean", cleaned: "Cleaned and verified" };
const stateOf = (s: PublicSpot) => (s.status === "cleaned" ? "cleaned" : s.severity ?? "unrated");
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
const rateOf = (w: WardCount) => {
  const t = Number(w.open_spots) + Number(w.cleaned_spots);
  return t ? Math.round((Number(w.cleaned_spots) * 100) / t) : null;
};

export function Top() {
  return (
    <header className="bar">
      <h1><a className="home" href="#/">EcoVision <span>Pune</span></a></h1>
      <div className="barright">
        <a className="navlink" href="#/know">Your ward</a>
        <a className="navlink" href="#/wards">Wards</a>
        <a className="navlink on" href="#/">Map</a>
      </div>
    </header>
  );
}

function useWards() {
  const [wards, setWards] = useState<WardCount[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { fetchWards().then(setWards).catch(() => setError(true)); }, []);
  return { wards, error };
}

export function WardsPage() {
  const { wards, error } = useWards();
  const [q, setQ] = useState("");

  const ranked = useMemo(
    () => (wards ?? []).map((w, i) => ({ w, rank: i + 1 })).filter(({ w }) => w.name.toLowerCase().includes(q.trim().toLowerCase())),
    [wards, q],
  );
  const open = (wards ?? []).reduce((a, w) => a + Number(w.open_spots), 0);
  const cleaned = (wards ?? []).reduce((a, w) => a + Number(w.cleaned_spots), 0);
  const withOpen = (wards ?? []).filter((w) => Number(w.open_spots) > 0).length;

  return (
    <div className="wp">
      <Top />
      <main className="wp-body">
        <h2>Pune wards, ranked by open waste spots</h2>
        {error && <p className="wp-msg" role="alert">Could not load wards. The server may be waking up, so try again in a minute.</p>}
        {!wards && !error && <p className="wp-msg">Loading wards…</p>}
        {wards && (
          <>
            <div className="wp-stats">
              <div><b className="red">{open}</b><span>open spots</span></div>
              <div><b>{cleaned}</b><span>cleaned</span></div>
              <div><b>{withOpen}</b><span>of {wards.length} wards have open spots</span></div>
            </div>
            <input className="wp-search" type="search" placeholder="Search a ward name or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search wards" />
            <div className="wp-head"><span>#</span><span>Ward</span><span>Open</span><span>Cleaned</span><span>Rate</span></div>
            <ul className="wp-list">
              {ranked.length === 0 && <li className="wp-msg">No ward matches “{q}”.</li>}
              {ranked.map(({ w, rank }) => {
                const r = rateOf(w);
                return (
                  <li key={w.id}>
                    <a href={`#/ward/${w.id}`} className="wp-row">
                      <span className="rk">{rank}</span>
                      <span className="nm">{w.name}</span>
                      <span className={Number(w.open_spots) > 0 ? "open red" : "open"}>{w.open_spots}</span>
                      <span>{w.cleaned_spots}</span>
                      <span>{r === null ? "–" : `${r}%`}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="wp-note">Rate is the share of reported spots that have a verified cleanup. Wards are ranked by open spots, then by name.</p>
          </>
        )}
      </main>
    </div>
  );
}

export function WardPage({ id }: { id: number }) {
  const { wards, error } = useWards();
  const [spots, setSpots] = useState<PublicSpot[] | null>(null);
  const [spotsError, setSpotsError] = useState(false);
  useEffect(() => { fetchSpots().then(setSpots).catch(() => setSpotsError(true)); }, []);

  const ward = wards?.find((w) => w.id === id);
  const rank = wards ? wards.findIndex((w) => w.id === id) + 1 : 0;
  const mine = useMemo(
    () => (spots ?? []).filter((s) => ward && s.ward === ward.name)
      .sort((a, b) => Number(a.status === "cleaned") - Number(b.status === "cleaned") || b.first_reported_at.localeCompare(a.first_reported_at)),
    [spots, ward],
  );
  const reps = useMemo(() => {
    const seen = new Map<string, PublicSpot["representatives"][number]>();
    for (const s of mine) for (const r of s.representatives) seen.set(`${r.role}|${r.name}|${r.constituency}`, r);
    return [...seen.values()];
  }, [mine]);

  return (
    <div className="wp">
      <Top />
      <main className="wp-body">
        <p className="wp-back"><a href="#/wards">← All wards</a></p>
        {(error || spotsError) && <p className="wp-msg" role="alert">Could not load this ward. The server may be waking up, so try again in a minute.</p>}
        {!ward && !error && <p className="wp-msg">Loading…</p>}
        {wards && !ward && <p className="wp-msg">Ward {id} was not found.</p>}
        {ward && (
          <>
            <h2>{ward.name}</h2>
            <p className="wp-sub">PMC prabhag · ranked {rank} of {wards!.length} by open spots · <a href="#/know">Find your corporators</a></p>
            <div className="wp-stats">
              <div><b className={Number(ward.open_spots) > 0 ? "red" : ""}>{ward.open_spots}</b><span>open</span></div>
              <div><b>{ward.cleaned_spots}</b><span>cleaned</span></div>
              <div><b>{rateOf(ward) === null ? "–" : `${rateOf(ward)}%`}</b><span>cleanup rate</span></div>
            </div>

            <h3>Responsible representatives</h3>
            {!spots && !spotsError ? <p className="wp-msg">Loading…</p> : reps.length === 0 ? (
              <p className="wp-msg">Not linked yet. Representatives appear here once this ward has a reported spot and the representative data is added.</p>
            ) : (
              <ul className="wp-reps">{reps.map((r) => <li key={r.role + r.name + r.constituency}><strong>{r.name}</strong>, {r.role} for {r.constituency}</li>)}</ul>
            )}

            <h3>Spots in this ward</h3>
            {!spots && !spotsError && <p className="wp-msg">Loading…</p>}
            {spots && mine.length === 0 && <p className="wp-msg">No spots reported here yet.</p>}
            <ul className="wp-spots">
              {mine.map((s) => {
                const st = stateOf(s);
                return (
                  <li key={s.id}>
                    <a href={`#/spot/${s.id}`}>
                      <i style={{ background: COLOR[st] ?? "#5B6B70" }} />
                      <span>
                        <b>Spot {s.id}</b>
                        <small>
                          {LABEL[st] ?? "Waiting for review"} ·{" "}
                          {s.status === "cleaned" ? `reported ${new Date(s.first_reported_at).toLocaleDateString()}` : `open ${daysSince(s.first_reported_at)} days`}
                        </small>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
