import { useEffect, useMemo, useState } from "react";
import {
  API, Capture, CleanupResult, ReportResult, Spot, getSpot, postCleanup, postReport,
} from "./api";
import Camera from "./Camera";
import { enqueue } from "./queue";

const isNetworkFailure = (e: unknown) => e instanceof TypeError || !navigator.onLine;

function Review({ capture, busy, error, onSend, onRetake }: {
  capture: Capture; busy: boolean; error: string | null; onSend: () => void; onRetake: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(capture.blob), [capture]);
  return (
    <main className="screen">
      <img className="preview" src={url} alt="Photo you just took" />
      <p className="muted">Location accuracy ±{Math.round(capture.accuracy)} m</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="primary" disabled={busy} onClick={onSend}>{busy ? "Sending" : "Send photo"}</button>
        <button className="secondary" disabled={busy} onClick={onRetake}>Retake</button>
      </div>
    </main>
  );
}

export function ReportFlow({ onDone }: { onDone: (note?: string) => void }) {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (result) {
    return (
      <main className="screen">
        <h1>Report sent</h1>
        <p>
          {result.merged_into_existing_spot
            ? `This matches an open spot already on the map (spot ${result.spot_id}). Your photo was added to it.`
            : `A new spot (spot ${result.spot_id}) was added to the map.`}
        </p>
        <p className="muted">
          {result.severity ? `Severity: ${result.severity}.` : "An officer will review the severity."}
        </p>
        <button className="primary" onClick={() => onDone()}>Done</button>
      </main>
    );
  }
  if (!capture) return <Camera title="Report a spot" onCapture={setCapture} onCancel={() => onDone()} />;

  async function send() {
    setBusy(true); setError(null);
    try {
      setResult(await postReport(capture!));
    } catch (e) {
      if (isNetworkFailure(e)) {
        await enqueue({ kind: "report", capture: capture! });
        onDone("No signal. The report is saved on this phone and will upload when you are back online.");
      } else setError("The server could not process this photo. Try again, or retake it.");
    } finally { setBusy(false); }
  }
  return <Review capture={capture} busy={busy} error={error} onSend={send} onRetake={() => setCapture(null)} />;
}

const VERDICT: Record<CleanupResult["verdict"], { title: string; body: string }> = {
  clean: { title: "Cleaned and verified", body: "The spot is closed. Citizens can now confirm it." },
  partial: { title: "Partly cleaned", body: "Some waste is still visible. Clear the rest and send another photo." },
  not_cleaned: { title: "Still needs cleaning", body: "The new photo still shows most of the waste." },
  rejected: { title: "Photo rejected", body: "One or more checks failed. Fix the item marked below and retake the photo at the spot." },
  pending_review: { title: "Sent to an officer", body: "All checks passed. An officer will confirm the cleanup." },
};

const CHECKS: [keyof CleanupResult["checks"], string][] = [
  ["gps", "Taken at the registered spot"],
  ["timestamp", "Taken just now"],
  ["not_reused", "Not a reused photo"],
  ["same_scene", "Same place as the first photo"],
];

export function CleanupFlow({ spot, onDone }: { spot: Spot; onDone: (note?: string) => void }) {
  const [ghost, setGhost] = useState<string | null | undefined>(undefined);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSpot(spot.id)
      .then((d) => {
        const before = [...d.reports].reverse().find((r) => r.kind === "before" && r.photo_url);
        setGhost(before ? `${API}${before.photo_url}` : null);
      })
      .catch(() => setGhost(null)); // offline: camera still works, just without the outline
  }, [spot.id]);

  if (result) {
    const v = VERDICT[result.verdict];
    return (
      <main className="screen">
        <h1>{v.title}</h1>
        <p>{v.body}</p>
        <ul className="checks">
          {CHECKS.map(([k, label]) => (
            <li key={k} className={result.checks[k] ? "pass" : "fail"}>
              <span aria-hidden>{result.checks[k] ? "Passed" : "Failed"}</span> {label}
            </li>
          ))}
        </ul>
        <button className="primary" onClick={() => onDone()}>Done</button>
      </main>
    );
  }
  if (ghost === undefined) return <main className="screen"><p className="muted">Loading the first photo</p></main>;
  if (!capture) {
    return <Camera title={`Spot ${spot.id}: after photo`} ghostUrl={ghost} onCapture={setCapture} onCancel={() => onDone()} />;
  }

  async function send() {
    setBusy(true); setError(null);
    try {
      setResult(await postCleanup(spot.id, capture!));
    } catch (e) {
      if (isNetworkFailure(e)) {
        await enqueue({ kind: "cleanup", spotId: spot.id, capture: capture! });
        onDone("No signal. The cleanup photo is saved on this phone. Upload it soon: photos older than 10 minutes fail the time check.");
      } else setError("The server could not process this photo. Try again, or retake it.");
    } finally { setBusy(false); }
  }
  return <Review capture={capture} busy={busy} error={error} onSend={send} onRetake={() => setCapture(null)} />;
}
