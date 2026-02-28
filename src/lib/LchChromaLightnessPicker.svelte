<script lang="ts">
  import {
    findMaxChromaP3,
    labToLch,
    lchToLab,
    lchGradientStyle,
    lchStyle,
  } from "./labToRgb";
  import type { Color } from "./types";
  import HueStrip from "./HueStrip.svelte";

  const COLS = 7; // chroma: 0 → maxC
  const ROWS = 7; // lightness: center ± L_RANGE
  const L_RANGE = 28; // ±28 L units around center
  // Hue strip: offsets around current hue
  const HUE_OFFSETS = [-30, -20, -10, 0, 10, 20, 30];

  const {
    color,
    selection = null,
    onselect,
  } = $props<{
    color: Color;
    selection?: Color | null;
    onselect: (c: Color) => void;
  }>();

  // Derive LCH from the input color.
  let [baseL, baseC, baseH] = $derived(
    labToLch(color.lightness, color.a, color.b),
  );

  // Is this a neutral/grey? C < 5 means hue is unreliable.
  let isNeutral = $derived(baseC < 5);

  // The effective hue the grid currently displays — offset by user hue nudge.
  let hueOffset = $state(0);
  let effectiveH = $derived((baseH + hueOffset + 360) % 360);

  // Reset hue offset when center color changes.
  $effect(() => {
    color.lightness;
    color.a;
    color.b;
    hueOffset = 0;
  });

  // Lightness range for the grid, clamped away from 0/100 so cells never
  // have L=100 (which gamut-maps to white) or L=0 (which maps to black).
  let Lmin = $derived(Math.max(3, baseL - L_RANGE));
  let Lmax = $derived(Math.min(97, baseL + L_RANGE));

  function maxChromaAtLightness(lightness: number): number {
    const maxForRow = findMaxChromaP3(lightness, effectiveH);
    // Keep neutral mode narrower so it does not jump to vivid colors.
    return isNeutral ? Math.min(35, maxForRow) : maxForRow;
  }

  type CellData = { L: number; C: number; style: string; color: Color };

  let cells = $derived.by((): CellData[] => {
    const out: CellData[] = [];

    // Define ROWS+1 lightness *edges* first; each row's gradient goes
    // edge[row] → edge[row+1], guaranteeing seamless tiling.
    const edges: number[] = [];
    for (let i = 0; i <= ROWS; i++) {
      edges.push(Lmax - (i / ROWS) * (Lmax - Lmin));
    }

    for (let row = 0; row < ROWS; row++) {
      const L_top = edges[row];
      const L_bot = edges[row + 1];
      // Row center for click target and chroma calculation.
      const L = (L_top + L_bot) / 2;
      const rowMaxC = maxChromaAtLightness(L);

      // Similarly, COLS+1 chroma edges for seamless horizontal tiling.
      for (let col = 0; col < COLS; col++) {
        const C_left = (col / COLS) * rowMaxC;
        const C_right = ((col + 1) / COLS) * rowMaxC;
        const C = (C_left + C_right) / 2;
        const style = lchGradientStyle(
          L_top,
          C_left,
          effectiveH,
          L_bot,
          C_right,
          effectiveH,
        );
        const [, a, b] = lchToLab(L, C, effectiveH);
        out.push({
          L,
          C,
          style,
          color: {
            lightness: Math.round(L),
            a: Math.round(a),
            b: Math.round(b),
          },
        });
      }
    }
    return out;
  });

  // Find the cell closest to the current selection for highlighting.
  let selectedIdx = $derived.by(() => {
    if (!selection) return null;
    const [selL, selC, selH] = labToLch(
      selection.lightness,
      selection.a,
      selection.b,
    );
    let best = -1,
      bestDist = Infinity;
    for (let i = 0; i < cells.length; i++) {
      const dL2 = selL - cells[i].L;
      const dC2 = selC - cells[i].C;
      const dH2 = Math.min(
        Math.abs(selH - effectiveH),
        360 - Math.abs(selH - effectiveH),
      );
      const dist = dL2 * dL2 + dC2 * dC2 + dH2 * dH2 * 0.1;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best >= 0 ? best : null;
  });

  // Hue strip: swatches for nearby hue offsets.
  let hueStripSwatches = $derived.by(() => {
    return HUE_OFFSETS.map((offset) => {
      const H = (baseH + offset + 360) % 360;
      const C = isNeutral ? 18 : findMaxChromaP3(baseL, H) * 0.55;
      return { style: lchStyle(baseL, C, H), label: `hue ${offset > 0 ? '+' : ''}${offset}°` };
    });
  });
  let activeHueIndex = $derived(HUE_OFFSETS.indexOf(hueOffset));
  const centerHueIndex = HUE_OFFSETS.indexOf(0);
</script>

<div class="chroma-l-picker">
  <!-- Hue strip -->
  <HueStrip
    swatches={hueStripSwatches}
    activeIndex={activeHueIndex}
    centerIndex={centerHueIndex}
    onselect={(i) => (hueOffset = HUE_OFFSETS[i])}
  />

  <!-- Axis labels -->
  <div class="axis-row">
    <span class="axis-label muted">← neutral</span>
    <span class="axis-label vivid">vivid →</span>
  </div>

  <div class="grid-wrap">
    <span class="axis-side top">lighter</span>
    <span class="axis-side bottom">darker</span>
    <div class="grid">
      {#each cells as cell, i}
        <button
          class="swatch"
          class:selected={selectedIdx === i}
          style={cell.style}
          aria-label="L {cell.color.lightness} C {cell.C.toFixed(
            0,
          )} H {effectiveH.toFixed(0)}"
          onclick={() => onselect(cell.color)}
        ></button>
      {/each}
    </div>
  </div>
</div>

<style>
  .chroma-l-picker {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .axis-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.6rem;
    color: #555;
    padding: 0 2px;
  }
  .axis-label {
    font-size: 0.6rem;
    color: #555;
  }

  .grid-wrap {
    position: relative;
    width: 100%;
  }
  .axis-side {
    position: absolute;
    font-size: 0.6rem;
    font-weight: 600;
    color: #aaa;
    pointer-events: none;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
    z-index: 10;
    left: 50%;
    transform: translateX(-50%);
  }
  .axis-side.top {
    top: 5px;
  }
  .axis-side.bottom {
    bottom: 5px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
    width: 100%;
    /* 7×7 square grid: constrain width so height fits viewport.
       Subtract overhead for topbar, hue strip, axis labels, etc. */
    max-width: min(100%, calc(100dvh - 15rem));
    margin: 0 auto;
  }

  .swatch {
    aspect-ratio: 1;
    border: none;
    padding: 0;
    border-radius: 3px;
    cursor: pointer;
    width: 100%;
    min-width: 28px;
    min-height: 28px;
  }
  .swatch:hover {
    transform: scale(1.08);
    z-index: 1;
    position: relative;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.8);
  }
  .swatch.selected {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.2),
      0 0 0 4px #77b6ff;
    z-index: 2;
    position: relative;
  }

</style>
