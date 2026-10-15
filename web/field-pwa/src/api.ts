export const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Spot {
  id: number;
  lat: number;
  lon: number;
  status: "open" | "cleaned" | "disputed";
  first_reported_at: string;
}

export interface SpotReport {
  id: number;
  kind: "before" | "after";
  photo_url: string | null;
  captured_at: string;
  severity: string | null;
  coverage_pct: number | null;
}

export interface SpotDetail extends Spot {
  reports: SpotReport[];
}

export interface CleanupResult {
  cleanup_id: number;
  verdict: "clean" | "partial" | "not_cleaned" | "rejected" | "pending_review";
  checks: { gps: boolean; timestamp: boolean; not_reused: boolean; same_scene: boolean };
}

export interface ReportResult {
  report_id: number;
  spot_id: number;
  merged_into_existing_spot: boolean;
  severity: string | null;
  needs_review: boolean;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<T>;
}

export const listOpenSpots = () => fetch(`${API}/api/v1/spots?status=open`).then((r) => json<Spot[]>(r));
export const getSpot = (id: number) => fetch(`${API}/api/v1/spots/${id}`).then((r) => json<SpotDetail>(r));

export interface Capture {
  blob: Blob;
  lat: number;
  lon: number;
  accuracy: number;
  capturedAt: string;
}

function form(c: Capture): FormData {
  const f = new FormData();
  f.append("photo", c.blob, "photo.jpg");
  f.append("lat", String(c.lat));
  f.append("lon", String(c.lon));
  f.append("captured_at", c.capturedAt);
  f.append("gps_accuracy_m", String(c.accuracy));
  return f;
}

export const postReport = (c: Capture) =>
  fetch(`${API}/api/v1/reports`, { method: "POST", body: form(c) }).then((r) => json<ReportResult>(r));

export const postCleanup = (spotId: number, c: Capture) =>
  fetch(`${API}/api/v1/spots/${spotId}/cleanup`, { method: "POST", body: form(c) }).then((r) =>
    json<CleanupResult>(r)
  );

export function metres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000, rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
