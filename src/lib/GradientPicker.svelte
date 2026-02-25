<script lang="ts">
  import { labToRgb } from './labToRgb';

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

  // Half-width of one cell in LAB a and b units
  let cellHalfA = $derived(range / COLS);
  let cellHalfB = $derived(range / ROWS);

  function clampLab(v: number): number {
    return Math.max(-128, Math.min(127, Math.round(v)));
  }

  // Build a gradient style string showing the diagonal spread of each cell's
  // LAB a/b region: top-left corner (low a, high b) → bottom-right (high a, low b).
  // Uses the CSS duplicate-property trick for progressive enhancement:
  // old browsers get linear-gradient(rgb, rgb), modern ones get linear-gradient(lab, lab)
  // and interpolate in perceptual LAB space.
  function cellGradientStyle(rawA: number, rawB: number): string {
    const aLo = clampLab(rawA - cellHalfA);
    const aHi = clampLab(rawA + cellHalfA);
    const bLo = clampLab(rawB - cellHalfB);
    const bHi = clampLab(rawB + cellHalfB);
    const [r1, g1, b1] = labToRgb(lightness, aLo, bHi); // top-left
    const [r2, g2, b2] = labToRgb(lightness, aHi, bLo); // bottom-right
    return [
      `background:linear-gradient(135deg,rgb(${r1},${g1},${b1}),rgb(${r2},${g2},${b2}))`,
      `background:linear-gradient(135deg,lab(${lightness} ${aLo} ${bHi}),lab(${lightness} ${aHi} ${bLo}))`,
    ].join(';');
  }

  let cells = $derived.by((): CellData[] => {
    const out: CellData[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const rawA = center.a - range + ((col + 0.5) / COLS) * (range * 2);
        const rawB = center.b + range - ((row + 0.5) / ROWS) * (range * 2);
        const a = clampLab(rawA);
        const b = clampLab(rawB);
        out.push({ a, b, style: cellGradientStyle(rawA, rawB) });
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

  // Lightness slider shows the actual hue at dark→light in LAB space.
  // Duplicate background property: rgb() fallback, then lab() for modern browsers.
  let sliderBg = $derived.by(() => {
    const ca = center.a;
    const cb = center.b;
    const [r0, g0, b0] = labToRgb(5, ca, cb);
    const [r5, g5, b5] = labToRgb(50, ca, cb);
    const [r100, g100, b100] = labToRgb(95, ca, cb);
    return (
      `background:linear-gradient(to top,rgb(${r0},${g0},${b0}),rgb(${r5},${g5},${b5}),rgb(${r100},${g100},${b100}));` +
      `background:linear-gradient(to top,lab(5 ${ca} ${cb}),lab(50 ${ca} ${cb}),lab(95 ${ca} ${cb}))`
    );
  });

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
    style="width: {SLIDER_W}px; height: {gridSize}px; {sliderBg}"
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
    /* background set via inline style (reactive LAB gradient) */
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
