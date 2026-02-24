<script lang="ts">
  import { labToRgb } from './labToRgb';
  import type { Color } from './types';

  const LIGHTNESS_STEP = 4;
  const MAX_LIGHTNESS_OFFSET = 20;

  type GridCell = Color & {
    r: number;
    g: number;
    bl: number;
    isCenter: boolean;
  };

  const {
    color,
    diff = 12,
    side = 9,
    onselect,
  } = $props<{
    color: Color;
    diff?: number;
    side?: number;
    onselect: (color: Color) => void;
  }>();

  let lightnessOffset = $state(0);
  let sideSize = $derived(side % 2 === 1 ? side : side + 1);
  let half = $derived((sideSize - 1) / 2);
  let previewLightness = $derived(
    Math.max(0, Math.min(100, Math.round(color.lightness + lightnessOffset)))
  );

  $effect(() => {
    color.lightness;
    color.a;
    color.b;
    lightnessOffset = 0;
  });

  let labCells = $derived.by(() => {
    const cells: GridCell[] = [];
    for (let yi = 0; yi < sideSize; yi++) {
      for (let xi = 0; xi < sideSize; xi++) {
        const aOffset = Math.round(((xi - half) / half) * diff);
        const bOffset = Math.round(((half - yi) / half) * diff);
        const a = Math.max(-128, Math.min(127, color.a + aOffset));
        const b = Math.max(-128, Math.min(127, color.b + bOffset));
        const [r, g, bl] = labToRgb(previewLightness, a, b);
        cells.push({
          lightness: previewLightness,
          a,
          b,
          r,
          g,
          bl,
          isCenter: xi === half && yi === half,
        });
      }
    }
    return cells;
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

  <div class="axis-hint">a/b plane around your selected color</div>

  <div class="selector" style:--side-size={sideSize}>
    {#each labCells as cell}
      <button
        class="swatch"
        class:center-cell={cell.isCenter}
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
</style>
