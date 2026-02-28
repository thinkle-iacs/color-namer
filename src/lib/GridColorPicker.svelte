<script lang="ts">
  import { labStyle, isInDisplayP3 } from "./labToRgb";
  import type { Color } from "./types";

  // 5 lightness pages: 2 darker, current, 2 lighter.
  // PAGE_STEP is adaptive: smaller near black where ΔL is more perceptible.
  const NUM_PAGES = 5;
  const CENTER_PAGE = 2; // index of the "current" page
  const RANGE = 4; // ±4 LAB units → 9×9 grid

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

  function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // Which page is currently shown (0 = darkest, 4 = lightest).
  let currentPage = $state(CENTER_PAGE);

  // Reset to center page whenever the base color changes.
  $effect(() => {
    color.lightness;
    color.a;
    color.b;
    currentPage = CENTER_PAGE;
  });

  // Lightness for each of the 5 pages, clamped to [1, 99].
  // Step size is adaptive: smaller near black so each page is perceptually distinct.
  let pageLightnesses = $derived.by(() => {
    const L0 = color.lightness;
    const step = L0 < 15 ? 2 : L0 < 30 ? 3 : 6;
    return Array.from({ length: NUM_PAGES }, (_, i) =>
      clamp(Math.round(L0 + (i - CENTER_PAGE) * step), 1, 99),
    );
  });

  // A page is "valid" if the anchor (a, b) is in P3 at that lightness.
  // This prevents navigating to pages where the whole grid would go grey.
  let pageValid = $derived(
    pageLightnesses.map((pL) => isInDisplayP3(pL, color.a, color.b)),
  );

  let L = $derived(pageLightnesses[currentPage]);

  // Notify parent of lightness changes so the preview swatch updates.
  $effect(() => {
    onlightnesschange?.(L);
  });

  // Always show the full RANGE grid. Out-of-gamut cells are gamut-mapped
  // (clamped) by labToRgb so they show their nearest displayable color —
  // no empty/greyed-out squares.
  let gridSize = $derived(RANGE * 2 + 1);

  type CellData = {
    lightness: number;
    a: number;
    b: number;
    style: string;
    isCenter: boolean;
  };

  let cells = $derived.by((): CellData[] => {
    const out: CellData[] = [];
    const r = RANGE;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const a = color.a - r + col;
        const b = color.b + r - row;
        const isCenter = col === r && row === r;
        out.push({ lightness: L, a, b, style: labStyle(L, a, b), isCenter });
      }
    }
    return out;
  });

  let selectedIdx = $derived.by(() => {
    if (!selected) return null;
    // Exact match first
    for (let i = 0; i < cells.length; i++) {
      if (
        cells[i].a === selected.a &&
        cells[i].b === selected.b &&
        cells[i].lightness === selected.lightness
      )
        return i;
    }
    // Nearest otherwise
    let best = -1,
      bestDist = Infinity;
    for (let i = 0; i < cells.length; i++) {
      const dist =
        (selected.a - cells[i].a) ** 2 +
        (selected.b - cells[i].b) ** 2 +
        (selected.lightness - cells[i].lightness) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best >= 0 ? best : null;
  });

  // Can navigate if: there's a page in that direction, it's valid, and its L
  // value is actually different (avoids duplicate pages when near L=1 or L=99).
  let canGoDarker = $derived(
    currentPage > 0 &&
      pageValid[currentPage - 1] &&
      pageLightnesses[currentPage - 1] !== pageLightnesses[currentPage],
  );
  let canGoLighter = $derived(
    currentPage < NUM_PAGES - 1 &&
      pageValid[currentPage + 1] &&
      pageLightnesses[currentPage + 1] !== pageLightnesses[currentPage],
  );
</script>

<div class="fine-picker">
  <div class="grid" style="grid-template-columns: repeat({gridSize}, 1fr);">
    {#each cells as cell, idx}
      <button
        class="swatch"
        class:center-cell={selectedIdx === null && cell.isCenter}
        class:selected-cell={selectedIdx === idx}
        style={cell.style}
        aria-label="L {cell.lightness} a {cell.a} b {cell.b}"
        onclick={() =>
          onselect({ lightness: cell.lightness, a: cell.a, b: cell.b })}
      ></button>
    {/each}
  </div>

  <div class="page-nav">
    <button
      class="nav-btn"
      onclick={() => currentPage--}
      disabled={!canGoDarker}>↓ Darker</button
    >
    <div class="page-dots">
      {#each pageLightnesses as pL, i}
        <button
          class="page-dot"
          class:active={i === currentPage}
          class:invalid={!pageValid[i]}
          onclick={() => {
            if (pageValid[i]) currentPage = i;
          }}
          aria-label="L {pL}"
          title="L {pL}"
        ></button>
      {/each}
    </div>
    <button
      class="nav-btn"
      onclick={() => currentPage++}
      disabled={!canGoLighter}>↑ Lighter</button
    >
  </div>

  <div class="hint">L {L} · ±{RANGE} LAB · {gridSize}×{gridSize}</div>
</div>

<style>
  .fine-picker {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    width: 100%;
  }

  .grid {
    display: grid;
    gap: 3px;
    width: 100%;
    /* Square grid (n×n): constrain width so height fits viewport.
       Large overhead from preview, confirm btn, page nav, topbar. */
    max-width: min(100%, calc(100dvh - 22rem));
    margin: 0 auto;
  }
  .swatch {
    aspect-ratio: 1;
    width: 100%;
    border: none;
    padding: 0;
    border-radius: 3px;
    cursor: pointer;
    min-width: 28px;
    min-height: 28px;
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
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.2),
      0 0 0 4px #77b6ff;
    z-index: 2;
    position: relative;
  }

  .page-nav {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .nav-btn {
    border: 1px solid #4a4a4a;
    background: #1f1f1f;
    color: #d6d6d6;
    border-radius: 6px;
    font-size: 0.74rem;
    padding: 0.28em 0.65em;
    cursor: pointer;
  }
  .nav-btn:hover:not([disabled]) {
    background: #2a2a2a;
  }
  .nav-btn[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-dots {
    display: flex;
    gap: 5px;
    align-items: center;
  }
  .page-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1.5px solid #555;
    background: #2a2a2a;
    cursor: pointer;
    padding: 0;
    transition:
      background 0.12s,
      border-color 0.12s;
  }
  .page-dot:hover:not(.invalid) {
    border-color: #999;
  }
  .page-dot.active {
    background: #77b6ff;
    border-color: #aad4ff;
  }
  .page-dot.invalid {
    opacity: 0.25;
    cursor: not-allowed;
  }

  .hint {
    font-size: 0.65rem;
    color: #666;
  }
</style>
