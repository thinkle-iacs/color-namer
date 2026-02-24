<script lang="ts">
  import { hslToRgb, labToRgb, rgbToHsl, rgbToLab } from './labToRgb';
  import type { Color } from './types';

  const LIGHTNESS_STEP = 4;
  const MAX_LIGHTNESS_OFFSET = 20;
  const HUE_RANGE = 24;
  const SAT_RANGE = 24;

  type GridCell = Color & {
    r: number;
    g: number;
    bl: number;
    isCenter: boolean;
    h: number;
    s: number;
    l: number;
  };

  const {
    color,
    selected = null,
    side = 9,
    onselect,
    onlightnesschange,
  } = $props<{
    color: Color;
    selected?: Color | null;
    side?: number;
    onselect: (color: Color) => void;
    onlightnesschange?: (lightness: number) => void;
  }>();

  let lightnessOffset = $state(0);
  let sideSize = $derived(side % 2 === 1 ? side : side + 1);
  let half = $derived((sideSize - 1) / 2);
  let centerHsl = $derived.by(() => {
    const [r, g, bl] = labToRgb(color.lightness, color.a, color.b);
    const [h, s, l] = rgbToHsl(r, g, bl);
    return { h, s, l };
  });
  let satMin = $derived(clamp(centerHsl.s - SAT_RANGE, 0, 100));
  let satMax = $derived(clamp(centerHsl.s + SAT_RANGE, 0, 100));
  let satSpan = $derived(Math.max(1, satMax - satMin));

  function clamp(v: number, min: number, max: number): number {
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function wrapHue(h: number): number {
    const wrapped = h % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
  }

  let previewLightness = $derived(clamp(Math.round(centerHsl.l + lightnessOffset), 0, 100));

  $effect(() => {
    color.lightness;
    color.a;
    color.b;
    lightnessOffset = 0;
  });

  $effect(() => {
    previewLightness;
    onlightnesschange?.(previewLightness);
  });

  let labCells = $derived.by(() => {
    const cells: GridCell[] = [];
    for (let yi = 0; yi < sideSize; yi++) {
      const yT = sideSize <= 1 ? 0.5 : yi / (sideSize - 1);
      const s = clamp(satMax - yT * satSpan, 0, 100);
      for (let xi = 0; xi < sideSize; xi++) {
        const xT = half === 0 ? 0 : (xi - half) / half;
        const h = wrapHue(centerHsl.h + xT * HUE_RANGE);
        const l = previewLightness;
        const [r, g, bl] = hslToRgb(h, s, l);
        const [lightness, a, b] = rgbToLab(r, g, bl);
        cells.push({
          lightness,
          a,
          b,
          r,
          g,
          bl,
          isCenter: xi === half && yi === half,
          h,
          s,
          l,
        });
      }
    }
    return cells;
  });

  let selectedCellIndex = $derived.by(() => {
    if (!selected || labCells.length === 0) return null;
    let bestIndex = 0;
    let bestDistSq = Infinity;
    for (let i = 0; i < labCells.length; i++) {
      const cell = labCells[i];
      const dl = selected.lightness - cell.lightness;
      const da = selected.a - cell.a;
      const db = selected.b - cell.b;
      const distSq = dl * dl + da * da + db * db;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestIndex = i;
      }
    }
    return bestIndex;
  });

  function bumpLightness(delta: number): void {
    lightnessOffset = Math.max(
      -MAX_LIGHTNESS_OFFSET,
      Math.min(MAX_LIGHTNESS_OFFSET, lightnessOffset + delta)
    );
  }
</script>

<div class="fine-picker">
  <div class="l-controls">
    <button
      class="l-btn"
      onclick={() => bumpLightness(-LIGHTNESS_STEP)}
      disabled={lightnessOffset <= -MAX_LIGHTNESS_OFFSET}
    >Darker</button>
    <span class="l-val">
      L {previewLightness}
      {#if lightnessOffset !== 0}
        ({lightnessOffset > 0 ? '+' : ''}{lightnessOffset})
      {/if}
    </span>
    <button
      class="l-btn"
      onclick={() => bumpLightness(LIGHTNESS_STEP)}
      disabled={lightnessOffset >= MAX_LIGHTNESS_OFFSET}
    >Lighter</button>
  </div>

  <div class="axis-hint">hue/saturation plane around your selected color</div>

  <div class="selector" style:--side-size={sideSize}>
    {#each labCells as cell, idx}
      <button
        class="swatch"
        class:center-cell={selectedCellIndex === null && cell.isCenter}
        class:selected-cell={selectedCellIndex === idx}
        style="background-color: rgb({cell.r}, {cell.g}, {cell.bl})"
        aria-label={`L ${cell.lightness} a ${cell.a} b ${cell.b}`}
        onclick={() => onselect({ lightness: cell.lightness, a: cell.a, b: cell.b })}
      ></button>
    {/each}
  </div>
</div>

<style>
  .fine-picker {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    width: 100%;
  }

  .l-controls {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }
  .l-btn {
    border: 1px solid #4a4a4a;
    background: #1f1f1f;
    color: #d6d6d6;
    border-radius: 6px;
    font-size: 0.74rem;
    padding: 0.28em 0.6em;
    cursor: pointer;
  }
  .l-btn:hover:not([disabled]) {
    background: #2a2a2a;
  }
  .l-btn[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .l-val {
    min-width: 90px;
    text-align: center;
    font-size: 0.74rem;
    color: #a9a9a9;
    font-variant-numeric: tabular-nums;
  }

  .axis-hint {
    font-size: 0.68rem;
    color: #777;
    letter-spacing: 0.02em;
  }

  .selector {
    display: grid;
    gap: 3px;
    grid-template-columns: repeat(var(--side-size), 1.55rem);
    margin: auto;
    align-items: center;
    justify-content: center;
  }
  .swatch {
    width: 1.55rem;
    height: 1.55rem;
    border: none;
    padding: 0;
    border-radius: 2px;
    cursor: pointer;
  }
  .swatch:hover {
    transform: scale(1.06);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.65), 0 1px 7px rgba(0, 0, 0, 0.5);
  }
  .center-cell {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.92);
  }
  .selected-cell {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2), 0 0 0 2px #77b6ff;
  }
</style>
