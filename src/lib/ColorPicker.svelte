<script lang="ts">
  import GradientPicker from './GradientPicker.svelte';
  import GridColorPicker from './GridColorPicker.svelte';
  import HueLightnessPicker from './HueLightnessPicker.svelte';
  import { labToRgb } from './labToRgb';
  import type { Color } from './types';

  const INITIAL_COLOR: Color = { lightness: 50, a: 0, b: 0 };
  const MAX_BROAD_ZOOM = 2;
  const FINAL_STEP = 3;

  const { onconfirm } = $props<{ onconfirm: (color: Color) => void }>();

  let mode = $state<'broad' | 'narrow'>('broad');
  let zoom = $state(1);
  let centers = $state<Color[]>([INITIAL_COLOR]);
  let pendingSelection = $state<Color | null>(null);
  let broadPreviewLightnessOverride = $state<number | null>(null);
  let narrowCenter = $state<Color>(INITIAL_COLOR);
  let pendingNarrowSelection = $state<Color | null>(null);
  let narrowPreviewLightnessOverride = $state<number | null>(null);

  let currentCenter = $derived(centers[zoom - 1] ?? INITIAL_COLOR);
  let broadDisplaySelection = $derived(pendingSelection ?? currentCenter);
  let broadPreviewBaseColor = $derived(pendingSelection ?? currentCenter);
  let previewColor = $derived.by(() => {
    if (broadPreviewLightnessOverride === null) return broadPreviewBaseColor;
    return {
      ...broadPreviewBaseColor,
      lightness: broadPreviewLightnessOverride,
    };
  });
  let previewRgb = $derived(labToRgb(previewColor.lightness, previewColor.a, previewColor.b));
  let nextSelectionRange = $derived(zoom < MAX_BROAD_ZOOM ? 128 / (zoom + 1) : null);
  let narrowDisplaySelection = $derived(pendingNarrowSelection ?? narrowCenter);
  let narrowPreviewBaseColor = $derived(pendingNarrowSelection ?? narrowCenter);
  let narrowPreviewColor = $derived.by(() => {
    if (narrowPreviewLightnessOverride === null) return narrowPreviewBaseColor;
    return {
      ...narrowPreviewBaseColor,
      lightness: narrowPreviewLightnessOverride,
    };
  });
  let narrowPreviewRgb = $derived(
    labToRgb(narrowPreviewColor.lightness, narrowPreviewColor.a, narrowPreviewColor.b)
  );

  function setCenterForZoom(stage: number, color: Color): void {
    const next = [...centers];
    next[stage - 1] = color;
    centers = next;
  }

  function handleBroadPick(c: Color): void {
    pendingSelection = c;
    broadPreviewLightnessOverride = c.lightness;
  }

  function goNext(): void {
    if (!pendingSelection) return;
    const selected = pendingSelection;
    setCenterForZoom(zoom, selected);

    if (zoom < MAX_BROAD_ZOOM) {
      setCenterForZoom(zoom + 1, selected);
      zoom += 1;
      pendingSelection = selected;
      broadPreviewLightnessOverride = null;
      return;
    }

    narrowCenter = selected;
    mode = 'narrow';
    pendingNarrowSelection = null;
    narrowPreviewLightnessOverride = selected.lightness;
    pendingSelection = null;
  }

  function goBack(): void {
    if (mode === 'narrow') {
      mode = 'broad';
      zoom = MAX_BROAD_ZOOM;
      setCenterForZoom(MAX_BROAD_ZOOM, narrowCenter);
      pendingSelection = narrowCenter;
      pendingNarrowSelection = null;
      broadPreviewLightnessOverride = narrowCenter.lightness;
      narrowPreviewLightnessOverride = null;
      return;
    }
    if (zoom <= 1) return;
    zoom -= 1;
    pendingSelection = centers[zoom - 1] ?? null;
    broadPreviewLightnessOverride = null;
  }

  function reset(): void {
    mode = 'broad';
    zoom = 1;
    centers = [INITIAL_COLOR];
    pendingSelection = null;
    broadPreviewLightnessOverride = null;
    narrowCenter = INITIAL_COLOR;
    pendingNarrowSelection = null;
    narrowPreviewLightnessOverride = null;
  }

  function handleBroadPreviewLightness(lightness: number): void {
    broadPreviewLightnessOverride = lightness;
  }

  function handleNarrowPick(c: Color): void {
    pendingNarrowSelection = c;
    narrowPreviewLightnessOverride = c.lightness;
  }

  function handleNarrowPreviewLightness(lightness: number): void {
    narrowPreviewLightnessOverride = lightness;
  }

  function confirmNarrowSelection(): void {
    if (!pendingNarrowSelection) return;
    onconfirm(pendingNarrowSelection);
  }
</script>

<div class="color-picker">
  {#if mode === 'broad'}
    <div class="picker-topbar">
      <p class="stage">
        Step {zoom}/{FINAL_STEP}
        {#if zoom === 1}
          <span>Pick a hue + brightness region</span>
        {:else}
          <span>Refine hue/saturation, then continue</span>
        {/if}
      </p>
      <div class="actions">
        <button class="ghost" onclick={reset}>Restart</button>
        <button class="ghost" onclick={goBack} disabled={zoom === 1}>Back</button>
        <button class="next" onclick={goNext} disabled={!pendingSelection}>
          {zoom === MAX_BROAD_ZOOM ? 'Fine tune' : 'Next'}
        </button>
      </div>
    </div>

    <div class="preview">
      <div class="preview-swatch" style="background: rgb({previewRgb.join(',')});"></div>
      <span>L {previewColor.lightness} a {previewColor.a} b {previewColor.b}</span>
    </div>

    {#if zoom === 1}
      <HueLightnessPicker
        center={currentCenter}
        selection={broadDisplaySelection}
        onselect={handleBroadPick}
      />
    {:else}
      {#key `${zoom}-${currentCenter.lightness}-${currentCenter.a}-${currentCenter.b}`}
        <GradientPicker
          center={currentCenter}
          {zoom}
          selection={broadDisplaySelection}
          selectionRange={nextSelectionRange}
          onlightnesschange={handleBroadPreviewLightness}
          onselect={handleBroadPick}
        />
      {/key}
    {/if}
  {:else}
    <div class="picker-topbar">
      <p class="stage">
        Step {FINAL_STEP}/{FINAL_STEP}
        <strong>Fine tune selection</strong>
        <span>Adjust lightness + a/b around your chosen point</span>
      </p>
      <div class="actions">
        <button class="ghost" onclick={reset}>Restart</button>
        <button class="ghost" onclick={goBack}>Back</button>
        <button class="next" onclick={confirmNarrowSelection} disabled={!pendingNarrowSelection}>
          Confirm color
        </button>
      </div>
    </div>

    <div class="narrow-preview">
      <div class="narrow-preview-swatch" style="background: rgb({narrowPreviewRgb.join(',')});"></div>
      <div class="narrow-preview-label">
        <strong>{pendingNarrowSelection ? 'Selected color' : 'Current center'}</strong>
        <span>L {narrowPreviewColor.lightness} a {narrowPreviewColor.a} b {narrowPreviewColor.b}</span>
      </div>
    </div>

    <GridColorPicker
      color={narrowCenter}
      selected={narrowDisplaySelection}
      onlightnesschange={handleNarrowPreviewLightness}
      onselect={handleNarrowPick}
    />
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
  .stage strong {
    font-size: 0.86rem;
    color: #d0d0d0;
    font-weight: 700;
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
    display: flex;
    align-items: center;
    gap: 0.45rem;
    width: 100%;
    border: 1px solid #333;
    border-radius: 999px;
    padding: 0.22rem 0.5rem 0.22rem 0.22rem;
    margin-bottom: 0.55rem;
    background: #171717;
    font-size: 0.72rem;
    color: #aaa;
    font-variant-numeric: tabular-nums;
  }
  .preview-swatch {
    width: 100%;
    height: 1.55rem;
    border-radius: 8px;
    border: 1px solid #666;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
    flex: 1 1 auto;
    min-width: 0;
  }
  .preview span {
    white-space: nowrap;
  }

  .narrow-preview {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    border: 1px solid #353535;
    border-radius: 12px;
    background: #161616;
    padding: 0.5rem 0.7rem;
    margin-bottom: 0.6rem;
    width: fit-content;
  }
  .narrow-preview-swatch {
    width: 3.6rem;
    height: 3.6rem;
    border-radius: 10px;
    border: 1px solid #6e6e6e;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 2px 10px rgba(0, 0, 0, 0.45);
    flex-shrink: 0;
  }
  .narrow-preview-label {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    color: #c3c3c3;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    min-width: 150px;
  }
  .narrow-preview-label strong {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8d8d8d;
    font-weight: 700;
  }
</style>
