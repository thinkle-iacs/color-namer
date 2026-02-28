<script lang="ts">
  import GradientPicker from '$lib/GradientPicker.svelte';
  import { labToRgb } from '$lib/labToRgb';
  import type { Color } from '$lib/types';

  let L = $state(50);
  let a = $state(0);
  let b = $state(0);
  let zoom = $state(1);

  let center = $derived<Color>({ lightness: L, a, b });
  let centerRgb = $derived(labToRgb(L, a, b));

  let lastSelected: Color | null = $state(null);
  let lastSelectedRgb = $derived.by(() => {
    if (!lastSelected) return null;
    return labToRgb(lastSelected.lightness, lastSelected.a, lastSelected.b);
  });

  const ZOOM_PRESETS = [1, 2, 4, 8, 16, 32];

  // When user clicks a swatch, update center to that color
  function handleSelect(c: Color): void {
    lastSelected = c;
  }

  function jumpToSelected(): void {
    if (!lastSelected) return;
    L = lastSelected.lightness;
    a = lastSelected.a;
    b = lastSelected.b;
    lastSelected = null;
  }
</script>

<svelte:head><title>Test: GradientPicker zoom explorer</title></svelte:head>

<div class="test-page">
  <div class="test-header">
    <h1>GradientPicker — zoom explorer</h1>
    <p>
      <a href="/test/colorPicker">Full flow</a> ·
      <a href="/test/colorPicker/1">State 1</a> ·
      <a href="/test/colorPicker/2">State 2</a> ·
      <a href="/test/colorPicker/3">State 3</a>
    </p>
  </div>

  <div class="controls">
    <fieldset>
      <legend>Center color</legend>
      <div class="center-preview" style="background: rgb({centerRgb.join(',')})"></div>
      <label>
        L <input type="range" min="0" max="100" bind:value={L} />
        <span class="val">{L}</span>
      </label>
      <label>
        a <input type="range" min="-128" max="127" bind:value={a} />
        <span class="val">{a}</span>
      </label>
      <label>
        b <input type="range" min="-128" max="127" bind:value={b} />
        <span class="val">{b}</span>
      </label>
    </fieldset>

    <fieldset>
      <legend>Zoom (range = {Math.round(128 / zoom)} LAB units)</legend>
      <div class="zoom-btns">
        {#each ZOOM_PRESETS as z}
          <button
            class:active={zoom === z}
            onclick={() => (zoom = z)}
          >×{z}</button>
        {/each}
      </div>
    </fieldset>

    {#if lastSelected}
      <div class="selected-info">
        <div class="selected-swatch" style="background: rgb({lastSelectedRgb?.join(',')})"></div>
        <div class="selected-vals">
          <span>L {lastSelected.lightness} a {lastSelected.a} b {lastSelected.b}</span>
          <button class="jump-btn" onclick={jumpToSelected}>Jump to this color →</button>
        </div>
      </div>
    {/if}
  </div>

  <div class="picker-wrap">
    {#key `${L}-${a}-${b}-${zoom}`}
      <GradientPicker
        {center}
        {zoom}
        selection={lastSelected}
        onselect={handleSelect}
      />
    {/key}
  </div>
</div>

<style>
  .test-page {
    min-height: 100vh;
    background: #111;
    color: #eee;
    padding: 1.5rem;
    font-family: sans-serif;
    max-width: 600px;
  }
  .test-header h1 { margin: 0 0 0.3rem; font-size: 1.1rem; color: #aaa; }
  .test-header p { font-size: 0.82rem; color: #555; margin: 0 0 1rem; }
  .test-header a { color: #6af; }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    margin-bottom: 1.2rem;
  }

  fieldset {
    border: 1px solid #333;
    border-radius: 8px;
    padding: 0.6rem 0.9rem 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  legend {
    font-size: 0.72rem;
    color: #888;
    padding: 0 0.3rem;
  }

  .center-preview {
    width: 100%;
    height: 2rem;
    border-radius: 6px;
    border: 1px solid #444;
    margin-bottom: 0.3rem;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #bbb;
  }
  label input[type="range"] {
    flex: 1;
    accent-color: #6af;
  }
  .val {
    min-width: 3ch;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #eee;
  }

  .zoom-btns {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .zoom-btns button {
    border: 1px solid #3d3d3d;
    background: #1e1e1e;
    color: #ccc;
    border-radius: 6px;
    padding: 0.3em 0.7em;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .zoom-btns button:hover { background: #2a2a2a; }
  .zoom-btns button.active {
    border-color: #6af;
    background: #1a2a3a;
    color: #adf;
    font-weight: 700;
  }

  .selected-info {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 0.5rem 0.8rem;
    background: #161616;
  }
  .selected-swatch {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 6px;
    border: 1px solid #555;
    flex-shrink: 0;
  }
  .selected-vals {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.78rem;
    color: #ccc;
    font-variant-numeric: tabular-nums;
  }
  .jump-btn {
    border: 1px solid #4a4a4a;
    background: #1e1e1e;
    color: #6af;
    border-radius: 5px;
    padding: 0.25em 0.55em;
    font-size: 0.74rem;
    cursor: pointer;
    width: fit-content;
  }
  .jump-btn:hover { background: #252525; }

  .picker-wrap {
    border: 1px dashed #2a2a2a;
    border-radius: 10px;
    padding: 1rem;
  }
</style>
