// Hook reaktif untuk antrean offline (revisi F2). Re-render saat antrean/status berubah.
import { useEffect, useReducer } from "react";
import { isOffline, getQueue, subscribe, setOffline, flushQueue, enqueueMass } from "./offlineQueue";

export function useOfflineQueue() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribe(force), []);
  return {
    offline: isOffline(),
    queued: getQueue().length,
    setOffline,
    flush: flushQueue,
    enqueue: enqueueMass,
  };
}
