<script lang="ts">
  import ColorPicker from "$lib/ColorPicker.svelte";
  import type { Color } from "$lib/types";

  let confirmed: Color | null = $state(null);
</script>

<svelte:head><title>Test: ColorPicker</title></svelte:head>

<!-- Mirrors the actual game layout: .game-layout > .main-area > PickingView(.picking > .picker-wrap) -->
<div class="game-layout">
  <div class="test-header">
    <h1>ColorPicker — full flow</h1>
    <p>
      See individual states:
      <a href="/test/colorPicker/1">State 1 (broad hue×L)</a> ·
      <a href="/test/colorPicker/2">State 2 (a/b neighborhood)</a> ·
      <a href="/test/colorPicker/3">State 3 (fine grid)</a>
    </p>
    <p>
      Also: <a href="/test/resultScreen">Result Screen</a> ·
      <a href="/test/gridCalibration">Grid Calibration</a>
    </p>
  </div>

  <div class="main-area">
    <!-- Mirrors PickingView .picking -->
    <div class="picking">
      <div class="instructions">
        <h2>Your turn to pick a color!</h2>
        <p>Choose any color — your clue can't mention any color names.</p>
      </div>
      <div class="picker-wrap">
        <ColorPicker onconfirm={(c) => (confirmed = c)} />
      </div>
    </div>
  </div>

  {#if confirmed}
    <div class="confirmed-box">
      <strong>Confirmed:</strong>
      L={confirmed.lightness} a={confirmed.a} b={confirmed.b}
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
  .test-header h1 {
    margin: 0 0 0.3rem;
    font-size: 1rem;
    color: #aaa;
  }
  .test-header p {
    font-size: 0.75rem;
    color: #666;
    margin: 0 0 0.2rem;
  }
  .test-header :global(a) {
    color: #6af;
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

  .instructions {
    text-align: center;
  }
  .instructions h2 {
    margin: 0 0 0.3rem;
    font-size: 1.5rem;
  }
  .instructions p {
    color: #aaa;
    margin: 0;
    font-size: 0.95rem;
  }

  .confirmed-box {
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
