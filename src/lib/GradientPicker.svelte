<script lang="ts">
  import { labStyle } from './labToRgb';

  const COLS = 7;
  const ROWS = 7;
  const SLIDER_W = 36;

  const {
    center = { lightness: 50, a: 0, b: 0 },
    zoom = 1,
    selection = null,
    selectionRange = null,
    onselect,
    onlightnesschange,
  } = $props<{
    center: { lightness: number; a: number; b: number };
    zoom: number;
    selection?: { lightness: number; a: number; b: number } | null;
    selectionRange?: number | null;
    onselect: (selectedColor: { lightness: number; a: number; b: number }) => void;
    onlightnesschange?: (lightness: number) => void;
  }>();

  let lightness = $state(center.lightness);
  let lightnessSlider: HTMLDivElement;
  let containerWidth = $state(0);

  let gridSize = $derived(Math.max(200, containerWidth - SLIDER_W - 2));
  let range = $derived(128 / zoom);

  type CellData = { a: number; b: number; style: string };

  let cells = $derived.by((): CellData[] => {
    const out: CellData[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const rawA = center.a - range + ((col + 0.5) / COLS) * (range * 2);
        const rawB = center.b + range - ((row + 0.5) / ROWS) * (range * 2);
        const a = Math.max(-128, Math.min(127, Math.round(rawA)));
        const b = Math.max(-128, Math.min(127, Math.round(rawB)));
        out.push({ a, b, style: labStyle(lightness, a, b) });
      }
    }
    return out;
  });

  let selectedCellIndex = $derived.by(() => {
    if (!selection) return null;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < cells.length; i++) {
      const da = selection.a - cells[i].a;
      const db = selection.b - cells[i].b;
      const dist = da * da + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best >= 0 ? best : null;
  });

  // Dashed box showing where the next zoom region will be
  let selectionBoxStyle = $derived.by((): string | null => {
    if (!selection || selectionRange === null) return null;
    const aFrac = (selection.a - (center.a - range)) / (range * 2);
    const bFrac = (center.b + range - selection.b) / (range * 2);
    const boxFrac = selectionRange / (range * 2);
    const leftPct = Math.max(0, Math.min(100 - boxFrac * 100, (aFrac - boxFrac / 2) * 100));
    const topPct = Math.max(0, Math.min(100 - boxFrac * 100, (bFrac - boxFrac / 2) * 100));
    return `left:${leftPct.toFixed(1)}%;top:${topPct.toFixed(1)}%;width:${(boxFrac * 100).toFixed(1)}%;height:${(boxFrac * 100).toFixed(1)}%`;
  });

  function updateLightness(clientY: number): void {
    if (!lightnessSlider) return;
    const rect = lightnessSlider.getBoundingClientRect();
    const offsetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    lightness = Math.round(100 - (offsetY / rect.height) * 100);
  }

  function startDragging(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    function moveHandler(event: MouseEvent | TouchEvent) {
      const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
      updateLightness(clientY);
    }
    function stopDragging() {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', stopDragging);
    }
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', stopDragging);
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    updateLightness(clientY);
  }

  // Reset lightness when center changes
  $effect(() => {
    center.lightness;
    center.a;
    center.b;
    lightness = center.lightness;
  });

  $effect(() => {
    onlightnesschange?.(lightness);
  });
</script>

<div class="gradient-picker" bind:clientWidth={containerWidth}>
  <!-- L (lightness) axis slider -->
  <div
    class="lightness-slider"
    style="width: {SLIDER_W}px; height: {gridSize}px;"
    bind:this={lightnessSlider}
    aria-roledescription="slider"
    onmousedown={startDragging}
    ontouchstart={startDragging}
  >
    <span class="l-label top">light</span>
    <div
      class="slider-thumb"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); lightness = Math.min(100, lightness + 1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); lightness = Math.max(0, lightness - 1); }
      }}
      style="top: calc({100 - lightness}% - 2px);"
    ></div>
    <span class="l-label bottom">dark</span>
  </div>

  <!-- LAB a/b grid with axis labels -->
  <div class="grid-wrap" style="width: {gridSize}px; height: {gridSize}px;">
    <span class="axis top">+b yellow</span>
    <span class="axis bottom">−b blue</span>
    <span class="axis left">−a green</span>
    <span class="axis right">+a red</span>

    <div class="grid">
      {#each cells as cell, i}
        <button
          class="swatch"
          class:selected={selectedCellIndex === i}
          style={cell.style}
          aria-label="a {cell.a} b {cell.b}"
          onclick={() => onselect({ lightness, a: cell.a, b: cell.b })}
        ></button>
      {/each}
    </div>

    {#if selectionBoxStyle}
      <div class="selection-box" style={selectionBoxStyle}></div>
    {/if}
  </div>
</div>

<style>
  .gradient-picker {
    display: flex;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
  }

  /* Lightness slider */
  .lightness-slider {
    position: relative;
    flex-shrink: 0;
    background: linear-gradient(to top, black, white);
    user-select: none;
    border-radius: 4px 0 0 4px;
    cursor: ns-resize;
  }

  .l-label {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
    white-space: nowrap;
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
  .l-label.top { top: 6px; }
  .l-label.bottom { bottom: 6px; transform: translateX(-50%) rotate(180deg); }

  .slider-thumb {
    position: absolute;
    left: 0;
    width: 100%;
    height: 4px;
    background: rgb(180, 180, 180);
    border: 1px solid white;
    cursor: ns-resize;
  }

  /* Grid area */
  .grid-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(7, 1fr);
    gap: 3px;
    width: 100%;
    height: 100%;
  }

  .swatch {
    width: 100%;
    height: 100%;
    border: none;
    padding: 0;
    border-radius: 2px;
    cursor: pointer;
  }
  .swatch:hover {
    transform: scale(1.1);
    z-index: 1;
    position: relative;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.75);
  }
  .swatch.selected {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2), 0 0 0 4px #77b6ff;
    z-index: 2;
    position: relative;
  }

  /* Axis labels */
  .axis {
    position: absolute;
    font-size: 0.6rem;
    font-weight: 600;
    pointer-events: none;
    opacity: 0.78;
    text-align: center;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.7);
    line-height: 1;
    z-index: 10;
  }
  .axis.top    { top: 5px;    left: 50%; transform: translateX(-50%); color: #ffe066; }
  .axis.bottom { bottom: 5px; left: 50%; transform: translateX(-50%); color: #88aaff; }
  .axis.left   { left: 6px;   top: 50%;  transform: translateY(-50%); color: #88dd88; }
  .axis.right  { right: 6px;  top: 50%;  transform: translateY(-50%); color: #ff9999; }

  .selection-box {
    position: absolute;
    border: 2px dashed rgba(255, 255, 255, 0.92);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.2);
    pointer-events: none;
    border-radius: 2px;
    z-index: 5;
  }
</style>
