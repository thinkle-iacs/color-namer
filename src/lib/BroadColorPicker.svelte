<script lang="ts">
  import { labToRgb, isInDisplayP3 } from './labToRgb';
  import type { Color } from './types';

  // Column 0 = neutral/gray (achromatic).
  // Columns 1-7 = hue directions (degrees in atan2(b,a) space)
  // chosen to cover major color families.
  const COLS = 8;
  const ROWS = 7;

  const HUE_DEGS: (number | null)[] = [
    null,  // neutral — shown as achromatic gray scale
    10,    // warm red
    52,    // orange / warm tan
    98,    // yellow / gold
    148,   // yellow-green / lime
    200,   // green / teal
    257,   // blue / indigo
    308,   // purple / violet
  ];

  // Lightness levels, top = lightest, bottom = darkest
  const LIGHTNESSES = [92, 78, 64, 50, 36, 22, 8];

  const { onselect } = $props<{ onselect: (color: Color) => void }>();

  // Binary search: max P3 chroma along a hue direction at a given L.
  function findMaxChroma(L: number, hueDeg: number): number {
    const hRad = (hueDeg * Math.PI) / 180;
    let lo = 0, hi = 140;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (isInDisplayP3(L, mid * Math.cos(hRad), mid * Math.sin(hRad))) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  type CellData = { lightness: number; a: number; b: number; style: string };

  // Static computation — no reactive deps, runs once per component mount.
  const cells: CellData[] = (() => {
    const out: CellData[] = [];
    for (let row = 0; row < ROWS; row++) {
      const L = LIGHTNESSES[row];
      for (let col = 0; col < COLS; col++) {
        const hueDeg = HUE_DEGS[col];

        if (hueDeg === null) {
          // Neutral column: achromatic, gradient shows the pure lightness.
          const [r, g, b] = labToRgb(L, 0, 0);
          out.push({
            lightness: L, a: 0, b: 0,
            style: `background:rgb(${r},${g},${b});background:lab(${L} 0 0)`,
          });
        } else {
          const hRad = (hueDeg * Math.PI) / 180;
          const maxC = findMaxChroma(L, hueDeg);

          // Click target at 50% max chroma — step 2 will show both muted and
          // vivid options around this point, so beiges/greiges are reachable.
          const a = Math.round(maxC * 0.5 * Math.cos(hRad));
          const b = Math.round(maxC * 0.5 * Math.sin(hRad));

          // Gradient spans from achromatic (top-left) to most-vivid (bottom-right).
          // This visually shows the full range from grey/beige to saturated hue.
          const aHi = Math.round(maxC * Math.cos(hRad));
          const bHi = Math.round(maxC * Math.sin(hRad));
          const [r0, g0, b0] = labToRgb(L, 0, 0);
          const [r1, g1, b1] = labToRgb(L, aHi, bHi);
          const style = [
            `background:linear-gradient(135deg,rgb(${r0},${g0},${b0}),rgb(${r1},${g1},${b1}))`,
            `background:linear-gradient(135deg,lab(${L} 0 0),lab(${L} ${aHi} ${bHi}))`,
          ].join(';');

          out.push({ lightness: L, a, b, style });
        }
      }
    }
    return out;
  })();
</script>

<div class="broad-picker">
  <div class="grid">
    {#each cells as cell}
      <button
        class="swatch"
        style={cell.style}
        aria-label="L {cell.lightness} a {cell.a} b {cell.b}"
        onclick={() => onselect({ lightness: cell.lightness, a: cell.a, b: cell.b })}
      ></button>
    {/each}
  </div>
  <div class="axis-hint">
    <span>lighter ↑ / darker ↓</span>
    <span>gray · red · orange · yellow · green · teal · blue · purple</span>
  </div>
</div>

<style>
  .broad-picker {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 3px;
    width: 100%;
  }

  .swatch {
    aspect-ratio: 1;
    border: none;
    padding: 0;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
  }
  .swatch:hover {
    transform: scale(1.08);
    z-index: 1;
    position: relative;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .axis-hint {
    display: flex;
    justify-content: space-between;
    font-size: 0.6rem;
    color: #555;
  }
</style>
