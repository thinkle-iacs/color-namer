<script lang="ts">
import { labStyle, lchToLab, labToLch, isInDisplayP3 } from './labToRgb';
import type { Color } from './types';
import HueStrip from './HueStrip.svelte';

const { color, onselect, onphasechange } = $props<{
  color: Color;
  onselect: (color: Color) => void;
  onphasechange?: (phase: 'wide' | 'tight') => void;
}>();

// Two-step state
let phase: 'wide' | 'tight' = $state('wide');
let anchor = $state<Color>(color);
$effect(() => { anchor = color; });
let tightCenter = $state<Color | null>(null);

// Grid config
const WIDE = { grid: 9, span: 40 };
const TIGHT = { grid: 5, span: 8 };

// Page/hue config
let numPages = $state(5);
let hueStep = $state(5);
let currentPage = $state(2); // Math.floor(numPages / 2) where numPages = 5

// Grid generator
function makeGrid(center: Color, grid: number, span: number, hue: number) {
  const out = [];
  const cx = Math.floor(grid / 2);
  const cy = Math.floor(grid / 2);
  const [, anchorC] = labToLch(center.lightness, center.a, center.b);
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const dx = col - cx;
      const dy = cy - row;
      const L = Math.round(center.lightness + (dy / cy) * (span / 2));
      const C = Math.max(0, anchorC + (dx / cx) * (span / 2));
      const [, a, b] = lchToLab(L, C, hue);
      const inGamut = isInDisplayP3(L, Math.round(a), Math.round(b));
      out.push({ l: L, a: Math.round(a), b: Math.round(b), style: labStyle(L, a, b), isCenter: col === cx && row === cy, inGamut });
    }
  }
  return out;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Current center (differs by phase) and a setter that also resets the hue page
function getCenter(): Color {
  return phase === 'wide' ? anchor : (tightCenter ?? anchor);
}
function setCenter(c: Color) {
  if (phase === 'wide') anchor = c;
  else tightCenter = c;
  currentPage = Math.floor(numPages / 2);
}

// Shift buttons: pan the anchor by a full grid span
function shiftL(dir: number) {
  const center = getCenter();
  const span = phase === 'wide' ? WIDE.span : TIGHT.span;
  setCenter({ ...center, lightness: clamp(center.lightness + dir * span, 1, 99) });
}
function shiftC(dir: number) {
  const center = getCenter();
  const span = phase === 'wide' ? WIDE.span : TIGHT.span;
  const [, centerC, centerH] = labToLch(center.lightness, center.a, center.b);
  const newC = Math.max(0, centerC + dir * span);
  const [, a, b] = lchToLab(center.lightness, newC, centerH);
  setCenter({ lightness: center.lightness, a: Math.round(a), b: Math.round(b) });
}

// Shift button preview colors
let shiftStyles = $derived.by(() => {
  const center = getCenter();
  const span = phase === 'wide' ? WIDE.span : TIGHT.span;
  const [, centerC, centerH] = labToLch(center.lightness, center.a, center.b);
  const lighterL = clamp(center.lightness + span, 1, 99);
  const darkerL = clamp(center.lightness - span, 1, 99);
  const [, va, vb] = lchToLab(center.lightness, centerC + span, centerH);
  const [, ga, gb] = lchToLab(center.lightness, Math.max(0, centerC - span), centerH);
  return {
    lighter: labStyle(lighterL, center.a, center.b),
    darker: labStyle(darkerL, center.a, center.b),
    vivid: labStyle(center.lightness, Math.round(va), Math.round(vb)),
    greyer: labStyle(center.lightness, Math.round(ga), Math.round(gb)),
    lighterDisabled: center.lightness >= 97,
    darkerDisabled: center.lightness <= 3,
    greyerDisabled: centerC <= 2,
  };
});

function textColor(l: number) { return l > 55 ? '#222' : '#eee'; }

// Page pills (hues) — derived from the current center, not always anchor
let pagePills = $derived.by(() => {
  const c = phase === 'wide' ? anchor : (tightCenter ?? anchor);
  const centerIdx = Math.floor(numPages / 2);
  const [,, centerH] = labToLch(c.lightness, c.a, c.b);
  const [, centerC] = labToLch(c.lightness, c.a, c.b);
  return Array.from({ length: numPages }, (_, i) => {
    const offset = i - centerIdx;
    const hue = centerH + offset * hueStep;
    const [, pa, pb] = lchToLab(c.lightness, centerC, hue);
    return { style: labStyle(c.lightness, Math.round(pa), Math.round(pb)), label: `hue ${hue.toFixed(0)}°` };
  });
});

// Which grid to show
let grid = $derived.by(() => {
  const center = phase === 'wide' ? anchor : (tightCenter ?? anchor);
  const conf = phase === 'wide' ? WIDE : TIGHT;
  const [,, anchorH] = labToLch(center.lightness, center.a, center.b);
  const hue = anchorH + (currentPage - Math.floor(numPages / 2)) * hueStep;
  return makeGrid(center, conf.grid, conf.span, hue);
});

type Cell = { l: number; a: number; b: number; style: string; isCenter: boolean; inGamut: boolean };

function handleCellClick(cell: Cell) {
  if (phase === 'wide') {
    tightCenter = { lightness: cell.l, a: cell.a, b: cell.b };
    phase = 'tight';
    currentPage = Math.floor(numPages / 2);
    onphasechange?.('tight');
  } else {
    onselect({ lightness: cell.l, a: cell.a, b: cell.b });
  }
}
function backToWide() {
  phase = 'wide';
  tightCenter = null;
  onphasechange?.('wide');
}

</script>

<div class="two-step-grid-picker">
  <HueStrip
    swatches={pagePills}
    activeIndex={currentPage}
    centerIndex={Math.floor(numPages / 2)}
    onselect={(i) => currentPage = i}
  />
  <div class="grid-with-shifts">
    <button
      class="shift-btn shift-top"
      style="{shiftStyles.lighter};color:{textColor(clamp(getCenter().lightness + (phase === 'wide' ? WIDE.span : TIGHT.span), 1, 99))}"
      onclick={() => shiftL(1)}
      disabled={shiftStyles.lighterDisabled}
    >↑ Lighter</button>

    <div class="grid-row-with-sides">
      <button
        class="shift-btn shift-side"
        style="{shiftStyles.greyer};color:{textColor(getCenter().lightness)}"
        onclick={() => shiftC(-1)}
        disabled={shiftStyles.greyerDisabled}
      >← Grey</button>

      <div class="grid" style="grid-template-columns: repeat({phase === 'wide' ? WIDE.grid : TIGHT.grid}, 1fr);">
        {#each grid as cell}
          <button
            class="swatch"
            class:center-cell={cell.isCenter}
            class:out-of-gamut={!cell.inGamut}
            style={cell.style}
            onclick={() => handleCellClick(cell)}
            title="L={cell.l} a={cell.a} b={cell.b}{cell.inGamut ? '' : ' (clamped)'}"
          ></button>
        {/each}
      </div>

      <button
        class="shift-btn shift-side"
        style="{shiftStyles.vivid};color:{textColor(getCenter().lightness)}"
        onclick={() => shiftC(1)}
      >Vivid →</button>
    </div>

    <button
      class="shift-btn shift-bottom"
      style="{shiftStyles.darker};color:{textColor(clamp(getCenter().lightness - (phase === 'wide' ? WIDE.span : TIGHT.span), 1, 99))}"
      onclick={() => shiftL(-1)}
      disabled={shiftStyles.darkerDisabled}
    >↓ Darker</button>
  </div>
  {#if phase === 'tight'}
    <button class="back-btn" onclick={backToWide}>← Back to wide grid</button>
  {/if}
</div>

<style>
.two-step-grid-picker { width: 100%; }
.grid-with-shifts { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; }
.grid-row-with-sides { display: flex; align-items: stretch; gap: 4px; width: 100%; }
.grid-row-with-sides > .grid { flex: 1; min-width: 0; }
.grid { display: grid; gap: 2px; width: 100%; }
.swatch { aspect-ratio: 1; width: 100%; border: none; padding: 0; border-radius: 3px; cursor: pointer; min-width: 24px; min-height: 24px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.swatch:hover { transform: scale(1.05); z-index: 1; box-shadow: 0 0 0 1.5px rgba(255,255,255,0.7); }.center-cell { box-shadow: inset 0 0 0 2px rgba(255,255,255,0.85); }
.out-of-gamut::after { content: ''; position: absolute; inset: 0; border-radius: 3px; border: 1px dashed rgba(255,255,255,0.25); }
.shift-btn { border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; font-size: 0.68rem; font-weight: 600; cursor: pointer; padding: 0.3em 0.8em; white-space: nowrap; text-shadow: 0 0 3px rgba(0,0,0,0.5); }
.shift-btn:hover:not([disabled]) { filter: brightness(1.15); }
.shift-btn[disabled] { opacity: 0.3; cursor: not-allowed; }
.shift-top, .shift-bottom { width: 50%; text-align: center; }
.shift-side { writing-mode: vertical-lr; text-orientation: mixed; padding: 0.5em 0.3em; min-width: 28px; display: flex; align-items: center; justify-content: center; }
.back-btn { margin-top: 0.5rem; font-size: 0.8rem; background: #222; color: #aaa; border: 1px solid #444; border-radius: 6px; padding: 0.3em 0.8em; cursor: pointer; }
.back-btn:hover { background: #333; color: #fff; }
</style>
