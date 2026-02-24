<script lang="ts">
  import ColorPicker from '$lib/ColorPicker.svelte';
  import type { Color } from '$lib/types';

  let confirmed: Color | null = $state(null);
</script>

<svelte:head><title>Test: ColorPicker</title></svelte:head>

<div class="test-page">
  <div class="test-header">
    <h1>ColorPicker — full flow</h1>
    <p>
      See individual states:
      <a href="/test/colorPicker/1">State 1</a> ·
      <a href="/test/colorPicker/2">State 2</a> ·
      <a href="/test/colorPicker/3">State 3 (final zoom)</a> ·
      <a href="/test/colorPicker/4">State 4 (grid)</a>
    </p>
    <p>Also: <a href="/test/resultScreen">Result Screen</a></p>
  </div>

  <!-- Simulates the game's .picking flex column (align-items: center) -->
  <div class="game-context">
    <ColorPicker onconfirm={(c) => (confirmed = c)} />
  </div>

  {#if confirmed}
    <div class="confirmed-box">
      <strong>Confirmed:</strong>
      L={confirmed.lightness} a={confirmed.a} b={confirmed.b}
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
  .test-header h1 { margin: 0 0 0.5rem; font-size: 1.2rem; color: #aaa; }
  .test-header p { font-size: 0.85rem; color: #666; margin: 0 0 0.3rem; }
  .test-header a { color: #6af; }
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
  .confirmed-box {
    margin-top: 1rem;
    padding: 0.6rem 1rem;
    background: #1e2230;
    border-radius: 8px;
    font-size: 0.9rem;
  }
</style>
