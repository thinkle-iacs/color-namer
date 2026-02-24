<script lang="ts">
  import GradientPicker from './GradientPicker.svelte';
  import GridColorPicker from './GridColorPicker.svelte';
  import { labToRgb, rgbToLab } from './labToRgb';
  import type { Color } from './types';

  const INITIAL_COLOR: Color = { lightness: 50, a: 0, b: 0 };
  const MAX_ZOOM = 3;

  const { onconfirm } = $props<{ onconfirm: (color: Color) => void }>();

  let mode = $state<'broad' | 'narrow'>('broad');
  let zoom = $state(1);
  let centers = $state<Color[]>([INITIAL_COLOR]);
  let pendingSelection = $state<Color | null>(null);
  let narrowCenter = $state<Color>(INITIAL_COLOR);

  let currentCenter = $derived(centers[zoom - 1] ?? INITIAL_COLOR);
  let previewColor = $derived(pendingSelection ?? currentCenter);
  let previewRgb = $derived(labToRgb(previewColor.lightness, previewColor.a, previewColor.b));
  let nextSelectionRange = $derived(zoom < MAX_ZOOM ? 128 / (zoom + 1) : null);

  function setCenterForZoom(stage: number, color: Color): void {
    const next = [...centers];
    next[stage - 1] = color;
    centers = next;
  }

  function normalizeToRendered(c: Color): Color {
    const [r, g, b] = labToRgb(c.lightness, c.a, c.b);
    const [l2, a2, b2] = rgbToLab(r, g, b);
    return { lightness: l2, a: a2, b: b2 };
  }

  function handleBroadPick(c: Color): void {
    pendingSelection = normalizeToRendered(c);
  }

  function goNext(): void {
    if (!pendingSelection) return;
    const selected = pendingSelection;
    setCenterForZoom(zoom, selected);

    if (zoom < MAX_ZOOM) {
      setCenterForZoom(zoom + 1, selected);
      zoom += 1;
      pendingSelection = null;
      return;
    }

    narrowCenter = selected;
    mode = 'narrow';
    pendingSelection = null;
  }

  function goBack(): void {
    if (mode === 'narrow') {
      mode = 'broad';
      zoom = MAX_ZOOM;
      setCenterForZoom(MAX_ZOOM, narrowCenter);
      pendingSelection = narrowCenter;
      return;
    }
    if (zoom <= 1) return;
    zoom -= 1;
    pendingSelection = centers[zoom - 1] ?? null;
  }

  function reset(): void {
    mode = 'broad';
    zoom = 1;
    centers = [INITIAL_COLOR];
    pendingSelection = null;
    narrowCenter = INITIAL_COLOR;
  }
</script>

<div class="color-picker">
  {#if mode === 'broad'}
    <div class="picker-topbar">
      <p class="stage">
        Step {zoom}/{MAX_ZOOM}
        {#if zoom === MAX_ZOOM}
          <span>Final zoom</span>
        {:else}
          <span>Pick a region, then continue</span>
        {/if}
      </p>
      <div class="actions">
        <button class="ghost" onclick={reset}>Restart</button>
        <button class="ghost" onclick={goBack} disabled={zoom === 1}>Back</button>
        <button class="next" onclick={goNext} disabled={!pendingSelection}>
          {zoom === MAX_ZOOM ? 'Fine tune' : 'Next'}
        </button>
      </div>
    </div>

    <div class="preview">
      <div class="preview-swatch" style="background: rgb({previewRgb.join(',')});"></div>
      <span>L {previewColor.lightness} a {previewColor.a} b {previewColor.b}</span>
    </div>

    {#key `${zoom}-${currentCenter.lightness}-${currentCenter.a}-${currentCenter.b}`}
      <GradientPicker
        center={currentCenter}
        {zoom}
        selection={pendingSelection}
        selectionRange={nextSelectionRange}
        onselect={handleBroadPick}
      />
    {/key}
  {:else}
    <div class="picker-topbar">
      <p class="stage">
        Fine tune selection
        <span>Adjust lightness + a/b around your chosen point</span>
      </p>
      <div class="actions">
        <button class="ghost" onclick={reset}>Restart</button>
        <button class="ghost" onclick={goBack}>Back</button>
      </div>
    </div>
    <GridColorPicker color={narrowCenter} onselect={onconfirm} />
  {/if}
</div>

<style>
  .color-picker {
    display: block;
    width: 100%;
  }

  .picker-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 0.55rem;
    flex-wrap: wrap;
  }

  .stage {
    margin: 0;
    font-size: 0.82rem;
    color: #aaa;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .stage span {
    font-size: 0.72rem;
    color: #767676;
  }

  .actions {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  button {
    border-radius: 7px;
    border: 1px solid #3d3d3d;
    background: #222;
    color: #ddd;
    font-size: 0.8rem;
    padding: 0.35em 0.75em;
    cursor: pointer;
  }
  button:hover:not([disabled]) {
    background: #2b2b2b;
    border-color: #5a5a5a;
  }
  button[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .ghost {
    background: transparent;
    color: #aaa;
  }
  .next {
    border-color: #7aa9ff;
    color: #ecf4ff;
    background: linear-gradient(135deg, #3158a8, #1f6a8c);
  }

  .preview {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    border: 1px solid #333;
    border-radius: 999px;
    padding: 0.22rem 0.6rem 0.22rem 0.25rem;
    margin-bottom: 0.55rem;
    background: #171717;
    font-size: 0.72rem;
    color: #aaa;
    font-variant-numeric: tabular-nums;
  }
  .preview-swatch {
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 50%;
    border: 1px solid #666;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  }
</style>
