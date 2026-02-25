<script lang="ts">
  import { labToRgb, isInDisplayP3 } from './labToRgb';

  const COLS = 7;
  const ROWS = 7;

  const {
    center = { lightness: 50, a: 0, b: 0 },
    zoom = 1,
    selection = null,
    onselect,
  } = $props<{
    center: { lightness: number; a: number; b: number };
    zoom: number;
    selection?: { lightness: number; a: number; b: number } | null;
    onselect: (selectedColor: { lightness: number; a: number; b: number }) => void;
  }>();

  let range = $derived(128 / zoom);

  // Half-width of one cell in LAB a and b units
  let cellHalfA = $derived(range / COLS);
  let cellHalfB = $derived(range / ROWS);

  function clampLab(v: number): number {
    return Math.max(-128, Math.min(127, Math.round(v)));
  }

  // Find the lightness nearest to preferredL where (a, b) is in Display P3 gamut.
  // This lets each cell display at its natural lightness: yellow cells use high L,
  // blue cells use moderate L, so every cell shows a real color rather than going dark.
  function findBestL(a: number, b: number, preferredL: number): number {
    const base = Math.max(0, Math.min(100, Math.round(preferredL)));
    if (isInDisplayP3(base, a, b)) return base;
    for (let delta = 1; delta <= 50; delta++) {
      if (base + delta <= 100 && isInDisplayP3(base + delta, a, b)) return base + delta;
      if (base - delta >= 0   && isInDisplayP3(base - delta, a, b)) return base - delta;
    }
    return base; // truly out of gamut — will show as clamped gray
  }

  // Diagonal gradient across the cell's a/b region at the given L.
  function cellStyle(rawA: number, rawB: number, L: number): string {
    const aLo = clampLab(rawA - cellHalfA);
    const aHi = clampLab(rawA + cellHalfA);
    const bLo = clampLab(rawB - cellHalfB);
    const bHi = clampLab(rawB + cellHalfB);
    const [r1, g1, b1] = labToRgb(L, aLo, bHi); // top-left corner
    const [r2, g2, b2] = labToRgb(L, aHi, bLo); // bottom-right corner
    return [
      `background:linear-gradient(135deg,rgb(${r1},${g1},${b1}),rgb(${r2},${g2},${b2}))`,
      `background:linear-gradient(135deg,lab(${L} ${aLo} ${bHi}),lab(${L} ${aHi} ${bLo}))`,
    ].join(';');
  }

  type CellData = { a: number; b: number; lightness: number; style: string };

  let cells = $derived.by((): CellData[] => {
    const out: CellData[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const rawA = center.a - range + ((col + 0.5) / COLS) * (range * 2);
        const rawB = center.b + range - ((row + 0.5) / ROWS) * (range * 2);
        const a = clampLab(rawA);
        const b = clampLab(rawB);
        const lightness = findBestL(a, b, center.lightness);
        out.push({ a, b, lightness, style: cellStyle(rawA, rawB, lightness) });
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
      const dl = selection.lightness - cells[i].lightness;
      const dist = da * da + db * db + dl * dl;
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best >= 0 ? best : null;
  });
</script>

<div class="gradient-picker">
  <div class="grid-wrap">
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
          aria-label="L {cell.lightness} a {cell.a} b {cell.b}"
          onclick={() => onselect({ lightness: cell.lightness, a: cell.a, b: cell.b })}
        ></button>
      {/each}
    </div>
  </div>
</div>

<style>
  .gradient-picker {
    width: 100%;
  }

  .grid-wrap {
    position: relative;
    width: 100%;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
    width: 100%;
  }

  .swatch {
    aspect-ratio: 1;
    width: 100%;
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
  /* Axis labels — positioned inside grid-wrap */
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
</style>
