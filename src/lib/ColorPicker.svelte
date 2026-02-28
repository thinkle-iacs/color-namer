<script lang="ts">
  import LchHueLightnessPicker from "./LchHueLightnessPicker.svelte";
  import LchChromaLightnessPicker from "./LchChromaLightnessPicker.svelte";
  import TwoStepGridColorPicker from "./TwoStepGridColorPicker.svelte";
  import { labToRgb, normalizeLabToDisplayP3 } from "./labToRgb";
  import type { Color } from "./types";

  const INITIAL_COLOR: Color = { lightness: 50, a: 0, b: 0 };

  const { onconfirm, onchange } = $props<{
    onconfirm: (color: Color) => void;
    onchange?: (color: Color) => void;
  }>();

  // step 1 = LchHueLightnessPicker (hue × lightness broad view)
  // step 2 = LchChromaLightnessPicker (chroma × lightness + hue strip)
  // step 3 = TwoStepGridColorPicker wide phase
  // step 4 = TwoStepGridColorPicker tight phase (tracked via gridPhase)
  let step = $state<1 | 2 | 3>(1);
  let gridPhase = $state<"wide" | "tight">("wide");
  let displayStep = $derived(step === 3 && gridPhase === "tight" ? 4 : step);

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
    labToRgb(
      finePreviewColor.lightness,
      finePreviewColor.a,
      finePreviewColor.b,
    ),
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

  let confirmTextColor = $derived(
    finePreviewColor.lightness > 55 ? "#111" : "#fff",
  );

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
      gridPhase = "wide";
      pendingFineSelection = null;
      finePreviewLightnessOverride = null;
    } else if (step === 2) {
      step = 1;
    }
  }

  function reset(): void {
    step = 1;
    gridPhase = "wide";
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
    <div class="stage">
      <p class="instruction">
        {#if step === 1}
          Pick the area your color is in
        {:else if step === 2}
          Select the gradient closest to your color
        {:else if gridPhase === "wide"}
          Hone in on the color
        {:else}
          Click to select your color
        {/if}
      </p>
      <span class="step-counter">Step {displayStep}/4</span>
    </div>
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
      <div
        class="selected-preview-swatch"
        style="background: rgb({finePreviewRgb.join(',')});"
      ></div>
      <span class="selected-preview-lab"
        >L {finePreviewColor.lightness} a {finePreviewColor.a} b {finePreviewColor.b}</span
      >
    </div>

    <div class="fine-grid-wrap">
      <TwoStepGridColorPicker
        color={step3Center}
        selected={pendingFineSelection ?? step3Center}
        onselect={(c) => {
          pendingFineSelection = c;
          finePreviewLightnessOverride = c.lightness;
          confirmFineSelection();
        }}
        onphasechange={(p) => (gridPhase = p)}
      />
    </div>
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
    margin-bottom: 0.3rem;
    flex-wrap: wrap;
  }

  .stage {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .instruction {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #e8e8e8;
  }
  .step-counter {
    font-size: 0.65rem;
    color: #555;
    font-variant-numeric: tabular-nums;
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
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.35rem;
    width: 100%;
  }
  .selected-preview-swatch {
    width: 2.2rem;
    height: 2.2rem;
    flex-shrink: 0;
    border-radius: 8px;
    border: 1px solid #6e6e6e;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.22),
      0 2px 10px rgba(0, 0, 0, 0.45);
  }
  .selected-preview-lab {
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    color: #999;
    white-space: nowrap;
  }

  .fine-grid-wrap {
    width: 100%;
  }

  .confirm-btn {
    width: 100%;
    margin-top: 0.35rem;
    padding: 0.55em 1em;
    border-radius: 10px;
    border: none;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    box-shadow: 0 3px 14px rgba(0, 0, 0, 0.45);
    transition:
      filter 120ms ease,
      transform 80ms ease;
  }
  .confirm-btn:hover {
    filter: brightness(1.12);
    transform: translateY(-1px);
  }
  .confirm-btn:active {
    transform: translateY(0);
  }
</style>
