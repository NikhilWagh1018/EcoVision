export interface Rep { name: string; role: "MP" | "MLA" | "corporator"; constituency: string }
export interface PublicSpot {
  id: number; lat: number; lon: number; status: "open" | "cleaned" | "disputed";
  first_reported_at: string; ward: string | null; severity: string | null; representatives: Rep[];
  seen_count?: number; not_garbage_count?: number;
}
export interface Stats { open_spots: number; cleaned_spots: number; total_spots: number; verified_cleanups: number }
export interface SpotPhoto { id: number; kind: "before" | "after"; photo_url: string; captured_at: string }
export interface WardCount { id: number; name: string; open_spots: number; cleaned_spots: number }

// Empty in local dev (Vite proxies /api). Set VITE_API_URL to the deployed API address in production.
export const API: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const get = async <T,>(url: string): Promise<T> => {
  const r = await fetch(`${API}${url}`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
};
export const fetchSpots = () => get<PublicSpot[]>("/api/v1/public/spots");
export const fetchStats = () => get<Stats>("/api/v1/public/stats");
export const fetchWards = () => get<WardCount[]>("/api/v1/public/wards");
export const fetchPhotos = (id: number) =>
  get<{ reports: SpotPhoto[] }>(`/api/v1/spots/${id}`).then((d) => d.reports.map((r) => ({ ...r, photo_url: `${API}${r.photo_url}` })));

// "I saw this too" / "Not garbage?": one vote per device. The browser makes a random id for itself and
// keeps it; the server stores only a hash of it, so no account, phone number or name is involved.
let memoryId = "";
const deviceId = () => {
  try {
    let d = localStorage.getItem("ev.device");
    if (!d) { d = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem("ev.device", d); }
    return d;
  } catch {
    return memoryId || (memoryId = crypto.randomUUID().replace(/-/g, ""));
  }
};
export interface SignalResult { seen_count: number; not_garbage_count: number; disputed: boolean }
export const sendSignal = async (id: number, kind: "seen" | "not-garbage"): Promise<SignalResult> => {
  const r = await fetch(`${API}/api/v1/public/spots/${id}/${kind}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device: deviceId() }),
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<SignalResult>;
};
const KEY = "ev.signals";
export const signalsDone = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
export const rememberSignal = (k: string) => { try { localStorage.setItem(KEY, JSON.stringify([...new Set([...signalsDone(), k])])); } catch { /* private window */ } };
