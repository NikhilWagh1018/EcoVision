export interface Rep { name: string; role: "MP" | "MLA" | "corporator"; constituency: string }
export interface PublicSpot {
  id: number; lat: number; lon: number; status: "open" | "cleaned" | "disputed";
  first_reported_at: string; ward: string | null; severity: string | null; representatives: Rep[];
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
