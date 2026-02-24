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

// Generate `count` varied, sRGB-gamut-safe LAB colors from a seed.
// The same seed always produces the same colors (deterministic).
export function generateColorOptions(seed: number, count: number): Array<{ lightness: number; a: number; b: number }> {
  const rand = mulberry32(seed);
  const colors: Array<{ lightness: number; a: number; b: number }> = [];
  let attempts = 0;

  while (colors.length < count && attempts < count * 30) {
    attempts++;
    const l = Math.round(25 + rand() * 55);   // L: 25–80
    const a = Math.round(-65 + rand() * 130);  // a: −65 to 65
    const b = Math.round(-65 + rand() * 130);  // b: −65 to 65

    // Gamut check: convert to RGB and back; if round-trip drifts too much
    // the original LAB was outside sRGB and got clamped.
    const [r, g, bl] = labToRgb(l, a, b);
    const [l2, a2, b2] = rgbToLab(r, g, bl);
    if (Math.abs(l - l2) <= 4 && Math.abs(a - a2) <= 8 && Math.abs(b - b2) <= 8) {
      colors.push({ lightness: l, a, b });
    }
  }

  // Fallback: fill with neutral greys if we didn't get enough gamut-safe colors
  while (colors.length < count) {
    const step = colors.length;
    colors.push({ lightness: 30 + step * 10, a: 0, b: 0 });
  }

  return colors;
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
