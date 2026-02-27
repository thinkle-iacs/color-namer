<script lang="ts">
  import LchHueLightnessPicker from './LchHueLightnessPicker.svelte';
  import LchChromaLightnessPicker from './LchChromaLightnessPicker.svelte';
  import GridColorPicker from './GridColorPicker.svelte';
  import { labToRgb, normalizeLabToDisplayP3 } from './labToRgb';
  import type { Color } from './types';

  const INITIAL_COLOR: Color = { lightness: 50, a: 0, b: 0 };

  const { onconfirm, onchange } = $props<{
    onconfirm: (color: Color) => void;
    onchange?: (color: Color) => void;
  }>();

  // step 1 = LchHueLightnessPicker (hue × lightness broad view)
  // step 2 = LchChromaLightnessPicker (chroma × lightness + hue strip)
  // step 3 = GridColorPicker (fine ±4 LAB around chosen point)
  let step = $state<1 | 2 | 3>(1);

  let step2Center = $state<Color>(INITIAL_COLOR); // set by step 1 click
  let step3Center = $state<Color>(INITIAL_COLOR); // set by step 2 click

  let pendingFineSelection = $state<Color | null>(null);
  let finePreviewLightnessOverride = $state<number | null>(null);

  let finePreviewBaseColor = $derived(pendingFineSelection ?? step3Center);
  let finePreviewColor = $derived.by(() => {
    if (finePreviewLightnessOverride === null) return finePreviewBaseColor;
    return { ...finePreviewBaseColor, lightness: finePreviewLightnessOverride };
  });
  let finePreviewRgb = $derived(
    labToRgb(finePreviewColor.lightness, finePreviewColor.a, finePreviewColor.b)
  );

  // The best "current" color at any stage — used by parent for auto-submit on timer expiry
  let currentColor = $derived.by<Color | null>(() => {
    if (step === 3) return finePreviewColor;
    if (step === 2) return step2Center;
    return null;
  });

  $effect(() => {
    if (currentColor) onchange?.(currentColor);
  });

  let confirmTextColor = $derived(finePreviewColor.lightness > 55 ? '#111' : '#fff');

  // Step 1 click: gamut-map and advance to step 2
  function handleBroadPick(c: Color): void {
    step2Center = normalizeLabToDisplayP3(c);
    step = 2;
  }

  // Step 2 click: gamut-map and advance to step 3
  function handleMediumPick(c: Color): void {
    const mapped = normalizeLabToDisplayP3(c);
    step3Center = mapped;
    pendingFineSelection = mapped;
    finePreviewLightnessOverride = mapped.lightness;
    step = 3;
  }

  function handleFinePick(c: Color): void {
    pendingFineSelection = c;
    finePreviewLightnessOverride = c.lightness;
  }

  function handleFinePreviewLightness(lightness: number): void {
    finePreviewLightnessOverride = lightness;
  }

  function goBack(): void {
    if (step === 3) {
      step = 2;
      pendingFineSelection = null;
      finePreviewLightnessOverride = null;
    } else if (step === 2) {
      step = 1;
    }
  }

  function reset(): void {
    step = 1;
    step2Center = INITIAL_COLOR;
    step3Center = INITIAL_COLOR;
    pendingFineSelection = null;
    finePreviewLightnessOverride = null;
  }

  function confirmFineSelection(): void {
    onconfirm(pendingFineSelection ?? step3Center);
  }
</script>

<div class="color-picker">
  <!-- ── TOPBAR ── -->
  <div class="picker-topbar">
    <p class="stage">
      Step {step}/3
      {#if step === 1}
        <span>Pick a color family</span>
      {:else if step === 2}
        <span>Choose shade &amp; saturation</span>
      {:else}
        <strong>Fine tune</strong>
        <span>Pick the exact color</span>
      {/if}
    </p>
    <div class="actions">
      {#if step !== 1}
        <button class="ghost" onclick={reset}>Restart</button>
        <button class="ghost" onclick={goBack}>Back</button>
      {/if}
    </div>
  </div>

  <!-- ── STEP 1: hue × lightness broad view ── -->
  {#if step === 1}
    <LchHueLightnessPicker onselect={handleBroadPick} />

  <!-- ── STEP 2: chroma × lightness refinement ── -->
  {:else if step === 2}
    {#key `${step2Center.lightness}-${step2Center.a}-${step2Center.b}`}
      <LchChromaLightnessPicker
        color={step2Center}
        onselect={handleMediumPick}
      />
    {/key}

  <!-- ── STEP 3: fine grid ── -->
  {:else}
    <div class="selected-preview" aria-live="polite">
      <div class="selected-preview-head">
        <strong>Selected:</strong>
        <span>L {finePreviewColor.lightness} a {finePreviewColor.a} b {finePreviewColor.b}</span>
      </div>
      <div class="selected-preview-swatch" style="background: rgb({finePreviewRgb.join(',')});"></div>
    </div>

    <div class="fine-grid-wrap">
      <GridColorPicker
        color={step3Center}
        selected={pendingFineSelection ?? step3Center}
        onlightnesschange={handleFinePreviewLightness}
        onselect={handleFinePick}
      />
    </div>

    <button
      type="button"
      class="confirm-btn"
      style="background: rgb({finePreviewRgb.join(',')});color: {confirmTextColor};"
      onclick={confirmFineSelection}
    >
      ✓ Submit this color
    </button>

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
  .ghost {
    background: transparent;
    color: #aaa;
  }
  .selected-preview {
    border: 1px solid #353535;
    border-radius: 12px;
    background: #161616;
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.6rem;
    width: 100%;
  }
  .selected-preview-head {
    display: flex;
    justify-content: space-between;
    gap: 0.65rem;
    align-items: baseline;
    margin-bottom: 0.45rem;
    color: #c3c3c3;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .selected-preview-head strong {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8d8d8d;
    font-weight: 700;
  }
  .selected-preview-swatch {
    width: 100%;
    height: 2.6rem;
    border-radius: 9px;
    border: 1px solid #6e6e6e;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22), 0 2px 10px rgba(0, 0, 0, 0.45);
  }

  .fine-grid-wrap {
    width: 100%;
  }

  .confirm-btn {
    width: 100%;
    margin-top: 0.6rem;
    padding: 0.75em 1em;
    border-radius: 12px;
    border: none;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    box-shadow: 0 3px 14px rgba(0, 0, 0, 0.45);
    transition: filter 120ms ease, transform 80ms ease;
  }
  .confirm-btn:hover {
    filter: brightness(1.12);
    transform: translateY(-1px);
  }
  .confirm-btn:active {
    transform: translateY(0);
  }
</style>
