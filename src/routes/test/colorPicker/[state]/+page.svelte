<script lang="ts">
  import { page } from '$app/stores';
  import GradientPicker from '$lib/GradientPicker.svelte';
  import GridColorPicker from '$lib/GridColorPicker.svelte';
  import type { Color } from '$lib/types';

  let stateNum = $derived(Number($page.params.state) || 1);

  // Sample colors for each state so they look interesting
  const sampleColors: Color[] = [
    { lightness: 50, a: 0, b: 0 },       // state 1 — start at grey
    { lightness: 55, a: 30, b: -40 },    // state 2 — zoomed in on a blue-purple region
    { lightness: 60, a: -20, b: 35 },    // state 3 — zoomed in on olive/green
    { lightness: 45, a: 40, b: -10 },    // state 4 — grid around a red-purple
  ];

  let sampleColor = $derived(sampleColors[Math.min(stateNum - 1, 3)]);
  let lastSelected: Color | null = $state(null);

  const stateDescriptions = [
    'Zoom 1 — initial broad view (full LAB space)',
    'Zoom 2 — first zoom in (half the LAB space)',
    'Zoom 3 — final zoom ("Final selection!" prompt)',
    'Narrow / Grid — precise fine-grained selection',
  ];
</script>

<svelte:head><title>Test: ColorPicker State {stateNum}</title></svelte:head>

<div class="test-page">
  <div class="test-header">
    <h2>ColorPicker — {stateDescriptions[stateNum - 1] ?? '?'}</h2>
    <div class="state-links">
      {#each [1, 2, 3, 4] as s}
        <a href="/test/colorPicker/{s}" class:active={s === stateNum}>State {s}</a>
      {/each}
      <a href="/test/colorPicker">Full flow</a>
      <a href="/test/resultScreen">Result screen</a>
    </div>
  </div>

  <div class="component-wrap">
    {#if stateNum === 1}
      <GradientPicker
        center={{ lightness: 50, a: 0, b: 0 }}
        zoom={1}
        onselect={(c) => (lastSelected = c)}
      />
    {:else if stateNum === 2}
      <GradientPicker
        center={sampleColor}
        zoom={2}
        onselect={(c) => (lastSelected = c)}
      />
    {:else if stateNum === 3}
      <!-- Zoom 3 = maxZoom, shows "Final selection!" -->
      <div class="label">Final selection!</div>
      <GradientPicker
        center={sampleColor}
        zoom={3}
        onselect={(c) => (lastSelected = c)}
      />
    {:else if stateNum === 4}
      <GridColorPicker
        color={sampleColor}
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
  .component-wrap { margin-top: 0.5rem; }
  .label {
    font-size: 0.85rem;
    color: #888;
    margin-bottom: 0.4rem;
  }
  .selected-box {
    margin-top: 1rem;
    padding: 0.6rem 1rem;
    background: #1e2230;
    border-radius: 8px;
    font-size: 0.9rem;
  }
</style>
