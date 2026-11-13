// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Small deterministic RNG so the room logic can be replayed in tests and the simulation.

export type Rng = () => number;

/** mulberry32. Pass a fixed number for repeatable shuffles; omit for Math.random. */
export function makeRng(start?: number): Rng {
  if (start === undefined) return Math.random;
  let a = start >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

export function randomId(rng: Rng, prefix = ''): string {
  let s = '';
  for (let i = 0; i < 10; i += 1) s += Math.floor(rng() * 36).toString(36);
  return prefix + s;
}
