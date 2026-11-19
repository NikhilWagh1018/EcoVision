import { del, get, set } from "idb-keyval";
import { Capture, postCleanup, postReport } from "./api";

// Offline queue: captures are stored on the phone and uploaded when the network returns.
export interface QueuedItem {
  id: string;
  kind: "report" | "cleanup";
  spotId?: number;
  capture: Capture;
}

const KEY = "ecovision-queue";

export const readQueue = async (): Promise<QueuedItem[]> => (await get<QueuedItem[]>(KEY)) ?? [];

export async function enqueue(item: Omit<QueuedItem, "id">): Promise<void> {
  const q = await readQueue();
  q.push({ ...item, id: crypto.randomUUID() });
  await set(KEY, q);
}

/** Upload everything queued. Items that fail stay in the queue for the next attempt. */
export async function flushQueue(): Promise<number> {
  const q = await readQueue();
  const remaining: QueuedItem[] = [];
  let sent = 0;
  for (const item of q) {
    try {
      if (item.kind === "report") await postReport(item.capture);
      else await postCleanup(item.spotId!, item.capture);
      sent++;
    } catch {
      remaining.push(item);
    }
  }
  if (remaining.length) await set(KEY, remaining);
  else await del(KEY);
  return sent;
}
