// Revisi F2 — antrean store-and-forward (DISIMULASIKAN) untuk laporan operator.
// Saat "offline" (toggle manual), laporan disimpan di localStorage; saat kembali "online"
// otomatis dikirim (flush) ke server. Ini SIMULASI kondisi sinyal lemah di tambang —
// bukan deteksi jaringan nyata. Batas integrasi: ganti dengan sinkron telematik kelak.

import { apiSend } from "../api/client";

export interface QueuedReport {
  localId: string;
  body: Record<string, unknown>;
  queuedAt: string;
}

const QUEUE_KEY = "mc_mass_queue";
const OFFLINE_KEY = "mc_offline";

type Listener = () => void;
const listeners = new Set<Listener>();
function emit(): void {
  for (const l of listeners) l();
}
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function isOffline(): boolean {
  return localStorage.getItem(OFFLINE_KEY) === "1";
}

export function getQueue(): QueuedReport[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedReport[];
  } catch {
    return [];
  }
}
function writeQueue(q: QueuedReport[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  emit();
}

/**
 * Enqueue laporan massa. Online → kirim langsung; bila gagal/offline → simpan utk dikirim nanti.
 * Mengembalikan apakah sudah terkirim atau ditahan di antrean.
 */
export async function enqueueMass(body: Record<string, unknown>): Promise<{ sent: boolean; error?: string }> {
  if (!isOffline()) {
    try {
      await apiSend("/api/mass", "POST", body);
      return { sent: true };
    } catch (err) {
      // Saat online tapi server menolak (mis. validasi) → JANGAN buffer, sampaikan error.
      return { sent: false, error: (err as Error).message };
    }
  }
  const q = getQueue();
  q.push({ localId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, body, queuedAt: new Date().toISOString() });
  writeQueue(q);
  return { sent: false };
}

/** Kirim semua laporan tertahan (dipanggil saat kembali online). Sisakan yang gagal. */
export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  if (isOffline()) return { flushed: 0, remaining: getQueue().length };
  const q = getQueue();
  let flushed = 0;
  const remaining: QueuedReport[] = [];
  for (const item of q) {
    try {
      await apiSend("/api/mass", "POST", item.body);
      flushed++;
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}

/** Toggle status koneksi tersimulasi. Saat menjadi online → otomatis flush antrean. */
export async function setOffline(v: boolean): Promise<void> {
  localStorage.setItem(OFFLINE_KEY, v ? "1" : "0");
  emit();
  if (!v) await flushQueue();
}
