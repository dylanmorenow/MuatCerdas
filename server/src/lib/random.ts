// PRNG deterministik (mulberry32) — seed tetap agar seed data reproducible (TECH_DESIGN §6).
// Tanpa dependensi; cukup untuk men-generate dataset contoh yang konsisten antar run.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generator angka acak deterministik + helper. */
export class Rng {
  private readonly next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  /** [0,1). */
  float(): number {
    return this.next();
  }

  /** [min,max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Bilangan bulat [min,max] inklusif. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** true dengan probabilitas p. */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** Pilih satu elemen (array tak boleh kosong). */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("Rng.pick: array kosong");
    const v = arr[this.int(0, arr.length - 1)];
    if (v === undefined) throw new Error("Rng.pick: indeks tak valid");
    return v;
  }

  /** Sampel distribusi normal (Box–Muller). */
  gaussian(mean: number, stdev: number): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * stdev;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Tanggal = referensi - n hari (UTC). */
export function daysBefore(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * 86_400_000);
}

export { clamp };
