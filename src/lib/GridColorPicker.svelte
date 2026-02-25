<script lang="ts">
  import { isInDisplayP3, labStyle } from './labToRgb';
  import type { Color } from './types';

  const GRID_RADIUS = 4;
  const GRID_SIDE = GRID_RADIUS * 2 + 1; // 9x9
  const PAGE_OFFSETS = [-2, -1, 0, 1, 2] as const;
  const PAGE_STEP = 2;

  const LIGHTNESS_MIN = 0;
  const LIGHTNESS_MAX = 100;
  const A_MIN = -128;
  const A_MAX = 127;
  const B_MIN = -128;
  const B_MAX = 127;

  const {
    color,
    selected = null,
    onselect,
    onlightnesschange,
  } = $props<{
    color: Color;
    selected?: Color | null;
    onselect: (color: Color) => void;
    onlightnesschange?: (lightness: number) => void;
  }>();

  type CellData = {
    color: Color;
    style: string;
    isCenter: boolean;
  };

  type PageData = {
    targetL: number;
    centerColor: Color;
    centerStyle: string;
    cells: CellData[];
  };

  let activePageIdx = $state(0);

  function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // Keep a/b fixed for "address", and find nearest displayable L at that address.
  function resolveDisplayableLightness(targetL: number, a: number, b: number): number {
    let bestL = clamp(Math.round(targetL), LIGHTNESS_MIN, LIGHTNESS_MAX);
    let bestDist = Number.POSITIVE_INFINITY;

    for (let l = LIGHTNESS_MIN; l <= LIGHTNESS_MAX; l++) {
      if (!isInDisplayP3(l, a, b)) continue;
      const dist = Math.abs(l - targetL);
      if (dist < bestDist) {
        bestDist = dist;
        bestL = l;
      }
    }

    return bestL;
  }

  // Build fixed A/B-addressed pages around the selected center.
  let pages = $derived.by((): PageData[] => {
    const baseL = clamp(Math.round(color.lightness), LIGHTNESS_MIN, LIGHTNESS_MAX);
    const baseA = clamp(Math.round(color.a), A_MIN, A_MAX);
    const baseB = clamp(Math.round(color.b), B_MIN, B_MAX);

    const seenTargetL = new Set<number>();
    const out: PageData[] = [];

    for (const offset of PAGE_OFFSETS) {
      const targetL = clamp(baseL + offset * PAGE_STEP, LIGHTNESS_MIN, LIGHTNESS_MAX);
      if (seenTargetL.has(targetL)) continue;
      seenTargetL.add(targetL);

      const cells: CellData[] = [];
      const centerResolvedL = resolveDisplayableLightness(targetL, baseA, baseB);
      const centerColor: Color = { lightness: centerResolvedL, a: baseA, b: baseB };
      const centerStyle = labStyle(centerColor.lightness, centerColor.a, centerColor.b);

      for (let row = 0; row < GRID_SIDE; row++) {
        for (let col = 0; col < GRID_SIDE; col++) {
          const a = clamp(baseA - GRID_RADIUS + col, A_MIN, A_MAX);
          const b = clamp(baseB + GRID_RADIUS - row, B_MIN, B_MAX);
          const resolvedL = resolveDisplayableLightness(targetL, a, b);

          cells.push({
            color: { lightness: resolvedL, a, b },
            style: labStyle(resolvedL, a, b),
            isCenter: row === GRID_RADIUS && col === GRID_RADIUS,
          });
        }
      }

      out.push({ targetL, centerColor, centerStyle, cells });
    }

    return out;
  });

  // Reset to page closest to center L when center changes.
  $effect(() => {
    color.lightness;
    color.a;
    color.b;
    const baseL = clamp(Math.round(color.lightness), LIGHTNESS_MIN, LIGHTNESS_MAX);
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pages.length; i++) {
      const dist = Math.abs(pages[i].targetL - baseL);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    activePageIdx = bestIdx;
  });

  $effect(() => {
    pages.length;
    if (activePageIdx < 0) activePageIdx = 0;
    if (activePageIdx > pages.length - 1) activePageIdx = Math.max(0, pages.length - 1);
  });

  let currentPage = $derived(pages[activePageIdx] ?? null);
  let canGoDarker = $derived(activePageIdx > 0);
  let canGoLighter = $derived(activePageIdx < pages.length - 1);

  $effect(() => {
    onlightnesschange?.(currentPage?.centerColor.lightness ?? Math.round(color.lightness));
  });

  let cells = $derived(currentPage?.cells ?? []);

  let selectedIdx = $derived.by(() => {
    if (!selected) return null;

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i].color;
      if (
        c.lightness === selected.lightness &&
        c.a === selected.a &&
        c.b === selected.b
      ) {
        return i;
      }
    }

    // Keep highlight stable even if selected L was gamut-adjusted elsewhere.
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i].color;
      const dist =
        (c.lightness - selected.lightness) ** 2 +
        (c.a - selected.a) ** 2 +
        (c.b - selected.b) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best >= 0 ? best : null;
  });
</script>

<div class="fine-picker">
  <div class="picker-nav">
    <button class="step-btn" aria-label="Darker page" onclick={() => (activePageIdx -= 1)} disabled={!canGoDarker}>−</button>
    {#each pages as page, idx}
      <button
        class="page-pill"
        class:active={idx === activePageIdx}
        style={page.centerStyle}
        aria-label="Show page around L {page.targetL}"
        onclick={() => (activePageIdx = idx)}
      ></button>
    {/each}
    <button class="step-btn" aria-label="Lighter page" onclick={() => (activePageIdx += 1)} disabled={!canGoLighter}>+</button>
  </div>

  <div class="grid" style="grid-template-columns: repeat({GRID_SIDE}, 1fr);">
    {#each cells as cell, idx}
      <button
        class="swatch"
        class:center-cell={selectedIdx === null && cell.isCenter}
        class:selected-cell={selectedIdx === idx}
        style={cell.style}
        aria-label="L {cell.color.lightness} a {cell.color.a} b {cell.color.b}"
        onclick={() => onselect(cell.color)}
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

  .picker-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }
  .step-btn {
    border: 1px solid #4a4a4a;
    background: #1f1f1f;
    color: #d6d6d6;
    border-radius: 999px;
    width: 2rem;
    height: 2rem;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
  }
  .step-btn:hover:not([disabled]) {
    background: #2a2a2a;
  }
  .step-btn[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .page-pill {
    width: 1.9rem;
    height: 1.2rem;
    border: 1px solid #4e4e4e;
    border-radius: 999px;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
  }
  .page-pill:hover {
    transform: translateY(-1px);
    border-color: #8a8a8a;
  }
  .page-pill.active {
    border-color: #77b6ff;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.25),
      0 0 0 2px rgba(119, 182, 255, 0.35);
  }

  .grid {
    display: grid;
    gap: 3px;
    width: 100%;
  }
  .swatch {
    aspect-ratio: 1;
    width: 100%;
    border: none;
    padding: 0;
    border-radius: 3px;
    cursor: pointer;
    position: relative;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .swatch:hover {
    transform: scale(1.08);
    z-index: 1;
    position: relative;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.8);
  }
  .center-cell {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.85);
  }
  .selected-cell {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2), 0 0 0 4px #77b6ff;
    z-index: 2;
    position: relative;
  }
</style>
