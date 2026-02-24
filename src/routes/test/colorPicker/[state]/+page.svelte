<script lang="ts">
  import { page } from '$app/stores';
  import HueLightnessPicker from '$lib/HueLightnessPicker.svelte';
  import GradientPicker from '$lib/GradientPicker.svelte';
  import GridColorPicker from '$lib/GridColorPicker.svelte';
  import type { Color } from '$lib/types';

  let stateNum = $derived(Number($page.params.state) || 1);

  // Sample colors for each state so they look interesting
  const sampleColors: Color[] = [
    { lightness: 50, a: 0, b: 0 },       // state 1 — start at center
    { lightness: 55, a: 30, b: -40 },    // state 2 — refined hue/sat around selection
    { lightness: 45, a: 40, b: -10 },    // state 3 — final fine-tune grid
  ];

  let sampleColor = $derived(sampleColors[Math.min(stateNum - 1, 2)]);
  let lastSelected: Color | null = $state(null);

  const stateDescriptions = [
    'Step 1 — quick hue + brightness map',
    'Step 2 — refined hue/saturation view',
    'Step 3 — final fine-grained grid',
  ];
</script>

<svelte:head><title>Test: ColorPicker State {stateNum}</title></svelte:head>

<div class="test-page">
  <div class="test-header">
    <h2>ColorPicker — {stateDescriptions[stateNum - 1] ?? '?'}</h2>
    <div class="state-links">
      {#each [1, 2, 3] as s}
        <a href="/test/colorPicker/{s}" class:active={s === stateNum}>State {s}</a>
      {/each}
      <a href="/test/colorPicker">Full flow</a>
      <a href="/test/resultScreen">Result screen</a>
    </div>
  </div>

  <!-- Simulates the game's .picking flex column (align-items: center) -->
  <div class="game-context">
    {#if stateNum === 1}
      <HueLightnessPicker
        center={{ lightness: 50, a: 0, b: 0 }}
        selection={lastSelected}
        onselect={(c) => (lastSelected = c)}
      />
    {:else if stateNum === 2}
      <GradientPicker
        center={sampleColor}
        zoom={2}
        selection={lastSelected}
        onselect={(c) => (lastSelected = c)}
      />
    {:else if stateNum === 3}
      <GridColorPicker
        color={sampleColor}
        selected={lastSelected}
        onselect={(c) => (lastSelected = c)}
      />
    {/if}
  </div>

  {#if lastSelected}
    <div class="selected-box">
      <strong>Last selected:</strong>
      L={lastSelected.lightness} a={lastSelected.a} b={lastSelected.b}
    </div>
  {/if}
</div>

<style>
  .test-page {
    min-height: 100vh;
    background: #111;
    color: #eee;
    padding: 1.5rem;
    font-family: sans-serif;
  }
  .test-header h2 { margin: 0 0 0.5rem; font-size: 1rem; color: #aaa; }
  .state-links {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }
  .state-links a { color: #6af; text-decoration: none; }
  .state-links a.active { color: #fff; font-weight: bold; text-decoration: underline; }
  /* Mirrors .picking from PickingView so layout bugs show up in tests */
  .game-context {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    margin-top: 0.5rem;
    gap: 1rem;
    border: 1px dashed #333;
    max-width: min(900px, calc(100vh - 120px));
  }
  .selected-box {
    margin-top: 1rem;
    padding: 0.6rem 1rem;
    background: #1e2230;
    border-radius: 8px;
    font-size: 0.9rem;
  }
</style>
