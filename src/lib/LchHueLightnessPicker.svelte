<script lang="ts">
  import { findMaxChromaP3, lchToLab, lchGradientStyle, lchStyle, labToRgb } from './labToRgb';
  import type { Color } from './types';

  // 12 hues at 30° apart covers red (~0°/30°), orange (60°), yellow (90°),
  // green (120°/150°), teal (180°/210°), blue (240°/270°), purple (300°/330°).
  // Each column spans ±15° so adjacent cells share their edge hue exactly.
  const NUM_HUES = 12;
  const HUE_STEP = 360 / NUM_HUES; // 30°
  const HALF_STEP = HUE_STEP / 2;  // 15°

  // lightness rows: top = lightest, bottom = darkest.
  // 9 rows with ~10-unit steps so dark blues (L≈30), navy (L≈20), near-black (L≈10) each get a row.
  const LIGHTNESSES = [92, 82, 72, 61, 50, 39, 28, 17, 8];
  const ROWS = LIGHTNESSES.length;
  const COLS = NUM_HUES + 1; // +1 for the neutral column at left

  const { onselect } = $props<{ onselect: (color: Color) => void }>();

  type CellData = { style: string; color: Color };

  // Static grid — hue gradient within each row is seamless because
  // right edge of col N = left edge of col N+1 (they share the same H boundary).
  const cells: CellData[] = (() => {
    const out: CellData[] = [];
    for (let row = 0; row < ROWS; row++) {
      const L = LIGHTNESSES[row];

      // Neutral column (C = 0): vertical lightness gradient so adjacent rows blend.
      const dL = (LIGHTNESSES[0] - LIGHTNESSES[ROWS - 1]) / ROWS / 2;
      const Lhi = Math.min(100, L + dL);
      const Llo = Math.max(0, L - dL);
      out.push({
        style: lchGradientStyle(Lhi, 0, 0, Llo, 0, 0, '180deg'),
        color: { lightness: L, a: 0, b: 0 },
      });

      // Hue columns.
      for (let col = 0; col < NUM_HUES; col++) {
        const H = col * HUE_STEP; // 0°, 30°, 60°, …, 330°
        const Hlo = (H - HALF_STEP + 360) % 360; // left boundary
        const Hhi = (H + HALF_STEP) % 360;        // right boundary

        // Max P3 chroma at the left and right hue boundaries.
        const C_lo = findMaxChromaP3(L, Hlo);
        const C_hi = findMaxChromaP3(L, Hhi);

        // Horizontal gradient: left = Hlo side, right = Hhi side.
        // Both adjacent cells share this boundary color so the row is seamless.
        const style = lchGradientStyle(L, C_lo, Hlo, L, C_hi, Hhi, '90deg');

        // Click target: 50% max chroma so step 2 can explore muted AND vivid.
        const Ctarget = findMaxChromaP3(L, H) * 0.5;
        const hRad = (H * Math.PI) / 180;
        const a = Math.round(Ctarget * Math.cos(hRad));
        const b = Math.round(Ctarget * Math.sin(hRad));

        out.push({ style, color: { lightness: L, a, b } });
      }
    }
    return out;
  })();

  // Hue name labels for axis hint.
  const HUE_NAMES = ['red', 'orange', 'yellow', 'lime', 'green', 'teal',
                     'cyan', 'sky', 'blue', 'violet', 'purple', 'pink'];
</script>

<div class="hue-l-picker">
  <div class="grid">
    {#each cells as cell}
      <button
        class="swatch"
        style={cell.style}
        aria-label="L {cell.color.lightness} a {cell.color.a} b {cell.color.b}"
        onclick={() => onselect(cell.color)}
      ></button>
    {/each}
  </div>
  <div class="axis-hint">
    <span>lighter ↑ / darker ↓</span>
    <span>grey · {HUE_NAMES.join(' · ')}</span>
  </div>
</div>

<style>
  .hue-l-picker {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(13, 1fr);
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
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85), 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .axis-hint {
    display: flex;
    justify-content: space-between;
    font-size: 0.6rem;
    color: #555;
  }
</style>
