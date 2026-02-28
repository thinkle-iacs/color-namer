<script lang="ts">
  import { page } from "$app/stores";
  import LchHueLightnessPicker from "$lib/LchHueLightnessPicker.svelte";
  import LchChromaLightnessPicker from "$lib/LchChromaLightnessPicker.svelte";
  import GridColorPicker from "$lib/GridColorPicker.svelte";
  import type { Color } from "$lib/types";

  let stateNum = $derived(Number($page.params.state) || 1);

  // Sample center colors for step 2 and 3
  const step2Center: Color = { lightness: 78, a: -20, b: 40 };
  const step3Center: Color = { lightness: 55, a: 30, b: -40 };

  let lastSelected: Color | null = $state(null);

  const stateDescriptions = [
    "Step 1 — LchHueLightnessPicker (hue × lightness)",
    "Step 2 — LchChromaLightnessPicker (chroma × lightness)",
    "Step 3 — GridColorPicker (fine ±4 LAB)",
  ];
</script>

<svelte:head><title>Test: ColorPicker State {stateNum}</title></svelte:head>

<!-- Mirrors the actual game layout: .game-layout > .main-area > PickingView(.picking > .picker-wrap) -->
<div class="game-layout">
  <div class="test-header">
    <h2>ColorPicker — {stateDescriptions[stateNum - 1] ?? "?"}</h2>
    <div class="state-links">
      {#each [1, 2, 3] as s}
        <a href="/test/colorPicker/{s}" class:active={s === stateNum}
          >State {s}</a
        >
      {/each}
      <a href="/test/colorPicker">Full flow</a>
      <a href="/test/resultScreen">Result screen</a>
    </div>
  </div>

  <div class="main-area">
    <div class="picking">
      <div class="picker-wrap">
        {#if stateNum === 1}
          <LchHueLightnessPicker onselect={(c) => (lastSelected = c)} />
        {:else if stateNum === 2}
          <LchChromaLightnessPicker
            color={step2Center}
            onselect={(c) => (lastSelected = c)}
          />
        {:else if stateNum === 3}
          <GridColorPicker
            color={step3Center}
            selected={lastSelected}
            onselect={(c) => (lastSelected = c)}
          />
        {/if}
      </div>
    </div>
  </div>

  {#if lastSelected}
    <div class="selected-box">
      <strong>Last selected:</strong>
      L={lastSelected.lightness} a={lastSelected.a} b={lastSelected.b}
    </div>
  {/if}
</div>

<style>
  /* ── Mirrors game [gameId]/+page.svelte .game-layout ── */
  .game-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #111;
    color: #eee;
    font-family: sans-serif;
  }

  .test-header {
    padding: 0.8rem 1rem 0;
    flex-shrink: 0;
  }
  .test-header h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: #aaa;
  }
  .state-links {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }
  .state-links :global(a) {
    color: #6af;
    text-decoration: none;
  }
  .state-links :global(a.active) {
    color: #fff;
    font-weight: bold;
    text-decoration: underline;
  }

  /* ── Mirrors game .main-area ── */
  .main-area {
    flex: 1;
    display: flex;
    align-items: stretch;
  }

  /* ── Mirrors PickingView .picking ── */
  .picking {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 1.5rem;
    gap: 1rem;
    overflow-y: auto;
  }

  /* ── Mirrors PickingView .picker-wrap ── */
  .picker-wrap {
    width: 100%;
    max-width: min(900px, calc(100vh - 120px));
  }

  .selected-box {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.6rem 1rem;
    background: #1e2230;
    border-radius: 8px;
    font-size: 0.9rem;
    z-index: 20;
  }
</style>
