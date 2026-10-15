import { useCallback, useEffect, useState } from "react";
import { Spot, listOpenSpots, metres } from "./api";
import { CleanupFlow, ReportFlow } from "./Flows";
import { flushQueue, readQueue } from "./queue";

type Screen = { name: "spots" } | { name: "report" } | { name: "cleanup"; spot: Spot };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "spots" });
  const [spots, setSpots] = useState<Spot[] | null>(null);
  const [here, setHere] = useState<{ lat: number; lon: number } | null>(null);
  const [queued, setQueued] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    setQueued((await readQueue()).length);
    try {
      setSpots(await listOpenSpots());
      setLoadError(false);
    } catch { setLoadError(true); }
  }, []);

  const sync = useCallback(async () => {
    const sent = await flushQueue();
    if (sent) setNote(`${sent} saved ${sent === 1 ? "photo" : "photos"} uploaded.`);
    refresh();
  }, [refresh]);

  useEffect(() => {
    sync();
    window.addEventListener("online", sync);
    navigator.geolocation.getCurrentPosition((p) => setHere({ lat: p.coords.latitude, lon: p.coords.longitude }));
    return () => window.removeEventListener("online", sync);
  }, [sync]);

  const done = (n?: string) => { setNote(n ?? null); setScreen({ name: "spots" }); refresh(); };

  if (screen.name === "report") return <ReportFlow onDone={done} />;
  if (screen.name === "cleanup") return <CleanupFlow spot={screen.spot} onDone={done} />;

  const sorted = (spots ?? [])
    .map((s) => ({ s, d: here ? metres(here.lat, here.lon, s.lat, s.lon) : null }))
    .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity));

  return (
    <main className="screen">
      <h1>Open spots</h1>
      {note && <p className="note" role="status">{note}</p>}
      {queued > 0 && (
        <p className="note">
          {queued} {queued === 1 ? "photo is" : "photos are"} waiting to upload.{" "}
          <button className="link" onClick={sync}>Upload now</button>
        </p>
      )}
      {loadError && <p className="error" role="alert">Could not load spots. Check your connection, then pull to refresh.</p>}
      {spots && sorted.length === 0 && <p className="muted">No open spots. Report one with the button below.</p>}
      <ul className="spots">
        {sorted.map(({ s, d }) => (
          <li key={s.id}>
            <div>
              <strong>Spot {s.id}</strong>
              <span className="muted">
                {d !== null ? `${d < 1000 ? Math.round(d) + " m" : (d / 1000).toFixed(1) + " km"} away` : "Distance unknown"}
              </span>
            </div>
            <button className="secondary" onClick={() => setScreen({ name: "cleanup", spot: s })}>Record cleanup</button>
          </li>
        ))}
      </ul>
      <div className="dock">
        <button className="primary" onClick={() => setScreen({ name: "report" })}>Report a new spot</button>
      </div>
    </main>
  );
}
