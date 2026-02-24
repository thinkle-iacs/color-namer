export function labToRgb(l: number, a: number, b: number) {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  x = 95.047 * (x ** 3 > 0.008856 ? x ** 3 : (x - 16 / 116) / 7.787);
  y = 100.0 * (y ** 3 > 0.008856 ? y ** 3 : (y - 16 / 116) / 7.787);
  z = 108.883 * (z ** 3 > 0.008856 ? z ** 3 : (z - 16 / 116) / 7.787);

  x /= 100;
  y /= 100;
  z /= 100;
  let red = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let green = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let blue = x * 0.0557 + y * -0.204 + z * 1.057;

  red = red > 0.0031308 ? 1.055 * red ** (1 / 2.4) - 0.055 : 12.92 * red;
  green =
    green > 0.0031308 ? 1.055 * green ** (1 / 2.4) - 0.055 : 12.92 * green;
  blue = blue > 0.0031308 ? 1.055 * blue ** (1 / 2.4) - 0.055 : 12.92 * blue;

  return [
    Math.max(0, Math.min(255, Math.round(red * 255))),
    Math.max(0, Math.min(255, Math.round(green * 255))),
    Math.max(0, Math.min(255, Math.round(blue * 255))),
  ];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Mulberry32 seeded PRNG — returns a function that yields floats in [0, 1)
function mulberry32(seed: number) {
  return function (): number {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type LabColor = { lightness: number; a: number; b: number };

function labDistance(c1: LabColor, c2: LabColor): number {
  const dl = c1.lightness - c2.lightness;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

// Allow richer chroma in middle lightness; taper near black/white.
function maxChromaForLightness(lightness: number): number {
  const edge = Math.abs(lightness - 50) / 50; // 0 in middle, 1 at extremes
  return 90 - edge * 70; // ~90 at mid, ~20 near ends
}

function sampleLabCandidate(rand: () => number): LabColor {
  const lightness = Math.round(8 + rand() * 86); // 8–94
  const maxC = maxChromaForLightness(lightness);
  const minC = Math.min(12, maxC * 0.55);
  const chroma = minC + rand() * (maxC - minC);
  const angle = rand() * Math.PI * 2;
  return {
    lightness,
    a: Math.round(chroma * Math.cos(angle)),
    b: Math.round(chroma * Math.sin(angle)),
  };
}

function isGamutSafe(color: LabColor): boolean {
  const [r, g, bl] = labToRgb(color.lightness, color.a, color.b);
  const [l2, a2, b2] = rgbToLab(r, g, bl);
  return (
    Math.abs(color.lightness - l2) <= 5 &&
    Math.abs(color.a - a2) <= 9 &&
    Math.abs(color.b - b2) <= 9
  );
}

// Generate `count` varied, sRGB-gamut-safe LAB colors from a seed.
// The same seed always produces the same colors (deterministic).
export function generateColorOptions(seed: number, count: number): Array<{ lightness: number; a: number; b: number }> {
  const rand = mulberry32(seed);
  const pool: LabColor[] = [];
  let attempts = 0;
  const maxAttempts = Math.max(300, count * 260);
  const targetPoolSize = Math.max(count * 36, 60);

  while (pool.length < targetPoolSize && attempts < maxAttempts) {
    attempts++;
    const candidate = sampleLabCandidate(rand);
    if (!isGamutSafe(candidate)) continue;
    // Keep pool reasonably de-duped so final picks spread better.
    if (pool.some((c) => labDistance(c, candidate) < 6)) continue;
    pool.push(candidate);
  }

  const selected: LabColor[] = [];
  const used = new Set<number>();

  if (pool.length > 0) {
    const firstIdx = Math.floor(rand() * pool.length);
    selected.push(pool[firstIdx]);
    used.add(firstIdx);
  }

  // Farthest-point selection with a lightness-spread bonus.
  while (selected.length < count && used.size < pool.length) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      if (used.has(i)) continue;
      const candidate = pool[i];

      let minLabDist = Infinity;
      let minLightDist = Infinity;
      for (const chosen of selected) {
        minLabDist = Math.min(minLabDist, labDistance(candidate, chosen));
        minLightDist = Math.min(minLightDist, Math.abs(candidate.lightness - chosen.lightness));
      }
      // For the very first loop when selected is empty (defensive).
      if (!isFinite(minLabDist)) minLabDist = 0;
      if (!isFinite(minLightDist)) minLightDist = 0;

      const score = minLabDist + minLightDist * 0.45;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    selected.push(pool[bestIdx]);
    used.add(bestIdx);
  }

  // Fallback: deterministic, gamut-safe fillers if pool was unexpectedly sparse.
  while (selected.length < count) {
    const step = selected.length;
    const lightness = 20 + ((step * 37) % 70);
    const maxC = maxChromaForLightness(lightness);
    const chroma = maxC * 0.35;
    const angle = (step * 2.399963229728653) % (Math.PI * 2); // golden angle
    const candidate: LabColor = {
      lightness,
      a: Math.round(chroma * Math.cos(angle)),
      b: Math.round(chroma * Math.sin(angle)),
    };
    if (isGamutSafe(candidate)) {
      selected.push(candidate);
    } else {
      selected.push({ lightness, a: 0, b: 0 });
    }
  }

  return selected.slice(0, count);
}

export function rgbToLab(r: number, g: number, b: number) {
  let red = r / 255;
  let green = g / 255;
  let blue = b / 255;

  red = red > 0.04045 ? ((red + 0.055) / 1.055) ** 2.4 : red / 12.92;
  green = green > 0.04045 ? ((green + 0.055) / 1.055) ** 2.4 : green / 12.92;
  blue = blue > 0.04045 ? ((blue + 0.055) / 1.055) ** 2.4 : blue / 12.92;

  let x = red * 0.4124564 + green * 0.3575761 + blue * 0.1804375;
  let y = red * 0.2126729 + green * 0.7151522 + blue * 0.072175;
  let z = red * 0.0193339 + green * 0.119192 + blue * 0.9503041;

  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  x = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116;

  return [
    Math.round(116 * y - 16),
    Math.round(500 * (x - y)),
    Math.round(200 * (y - z)),
  ];
}
