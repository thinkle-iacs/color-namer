<script lang="ts">
  import PickingView from '$lib/PickingView.svelte';
  import type { Color, Difficulty } from '$lib/types';

  let difficulty = $state<Difficulty>('easy');
  let seed = $state(42);
  let pickedColor = $state<Color | null>(null);
  let clueSubmitted = $state<string | null>(null);

  // Reset state when difficulty or seed changes
  $effect(() => {
    difficulty; seed;
    pickedColor = null;
    clueSubmitted = null;
  });

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
</script>

<svelte:head><title>Test: PickingView</title></svelte:head>

<div class="test-page">
  <div class="test-controls">
    <h2>PickingView test</h2>

    <div class="control-row">
      <span>Difficulty:</span>
      {#each difficulties as d}
        <button class:active={difficulty === d} onclick={() => difficulty = d}>
          {d}
        </button>
      {/each}
    </div>

    <div class="control-row">
      <span>Seed:</span>
      <input type="number" bind:value={seed} min="0" max="2147483647" />
      <button onclick={() => seed = Math.floor(Math.random() * 2 ** 31)}>
        Random seed
      </button>
    </div>

    <div class="links">
      <a href="/test/colorPicker">ColorPicker</a> ·
      <a href="/test/resultScreen">Result screen</a>
    </div>

    {#if pickedColor}
      <div class="status-line picked">
        Picked: L={pickedColor.lightness} a={pickedColor.a} b={pickedColor.b}
      </div>
    {/if}
    {#if clueSubmitted}
      <div class="status-line clued">Clue submitted: "{clueSubmitted}"</div>
    {/if}
  </div>

  <!-- Simulate the game layout (sidebar + main area) -->
  <div class="game-mock">
    <aside class="sidebar-mock">
      <div class="mock-label">Sidebar</div>
      <div class="mock-player">● You (picker)</div>
      <div class="mock-player">● Alice</div>
      <div class="mock-player">● Bob</div>
    </aside>
    <main class="main-mock">
      <PickingView
        gameId="TEST01"
        playerId="test-player"
        {difficulty}
        roundSeed={seed}
        {pickedColor}
        onColorPicked={(c) => (pickedColor = c)}
      />
    </main>
  </div>
</div>

<style>
  :global(body) { margin: 0; background: #111; color: #eee; font-family: sans-serif; }

  .test-page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .test-controls {
    padding: 0.7rem 1.2rem;
    background: #0d0d0d;
    border-bottom: 1px solid #222;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    flex-wrap: wrap;
  }
  .test-controls h2 { margin: 0; font-size: 0.9rem; color: #666; }

  .control-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
  }
  .control-row span { color: #888; }
  .control-row button {
    padding: 0.2em 0.6em;
    border-radius: 5px;
    border: 1px solid #444;
    background: transparent;
    color: #888;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .control-row button.active { background: #333; color: #fff; border-color: #6af; }
  .control-row input {
    width: 110px;
    padding: 0.2em 0.4em;
    background: #1a1a1a;
    border: 1px solid #444;
    color: #eee;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .links { font-size: 0.8rem; color: #555; }
  .links a { color: #6af; }

  .status-line {
    font-size: 0.75rem;
    padding: 0.2em 0.6em;
    border-radius: 4px;
  }
  .status-line.picked { background: #1a2030; color: #6af; }
  .status-line.clued  { background: #1a2a1a; color: #6f9; }

  /* Simulate the game layout */
  .game-mock {
    display: flex;
    flex: 1;
  }
  .sidebar-mock {
    width: 180px;
    flex-shrink: 0;
    background: #1a1a1a;
    border-right: 1px solid #2a2a2a;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .mock-label { font-size: 0.65rem; color: #555; text-transform: uppercase; }
  .mock-player { font-size: 0.85rem; color: #888; }

  .main-mock {
    flex: 1;
    display: flex;
    align-items: stretch;
  }
</style>
