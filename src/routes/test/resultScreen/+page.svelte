<script lang="ts">
  import RevealView from "$lib/RevealView.svelte";
  import type { GameDoc } from "$lib/types";

  // Mock game in 'reveal' state with 3 players
  const mockGame: GameDoc = {
    status: "reveal",
    hostId: "player-1",
    pickerIndex: 0,
    roundNumber: 2,
    createdAt: Date.now(),
    playerOrder: ["player-1", "player-2", "player-3", "player-4", "player-5"],
    players: {
      "player-1": {
        name: "Alice",
        score: 42,
        avatarColor: "hsl(0, 70%, 50%)",
        order: 0,
      },
      "player-2": {
        name: "Bob",
        score: 31,
        avatarColor: "hsl(138, 68%, 50%)",
        order: 1,
      },
      "player-3": {
        name: "Carol",
        score: 58,
        avatarColor: "hsl(275, 72%, 50%)",
        order: 2,
      },
      "player-4": {
        name: "David",
        score: 29,
        avatarColor: "hsl(315, 40%, 30%)",
        order: 3,
      },
      "player-5": {
        name: "Eve",
        score: 0,
        avatarColor: "hsl(60, 70%, 50%)",
        order: 4,
      },
    },
    roundClue: "stormy lavender",
    roundTarget: { lightness: 55, a: 15, b: -35 },
    roundGuesses: {
      "player-2": { lightness: 52, a: 10, b: -28 },
      "player-3": { lightness: 60, a: 22, b: -42 },
      "player-4": { lightness: 35, a: 5, b: 12 },
      "player-5": { lightness: 80, a: -25, b: 0 },
    },
  };

  // "You" are player-2 (a guesser) by default; toggle below lets you switch POV
  type POV = "guesser" | "picker";
  let pov = $state<POV>("guesser");
  let viewAs = $derived(pov === "picker" ? "player-1" : "player-2");
  let amPicker = $derived(
    viewAs === mockGame.playerOrder[mockGame.pickerIndex],
  );

  let roundAdvanced = $state(false);
</script>

<svelte:head><title>Test: Result Screen</title></svelte:head>

<div class="test-page">
  <div class="test-controls">
    <h2>RevealView test</h2>
    <div class="control-row">
      <span>View as:</span>
      <button class:active={pov === "guesser"} onclick={() => (pov = "guesser")}
        >Guesser (Bob)</button
      >
      <button class:active={pov === "picker"} onclick={() => (pov = "picker")}
        >Picker (Alice)</button
      >
    </div>
    <div class="links">
      <a href="/test/colorPicker">ColorPicker</a> ·
      <a href="/test/colorPicker/1">Picker states</a>
    </div>
    {#if roundAdvanced}
      <div class="advanced-msg">▶ Next round triggered!</div>
    {/if}
  </div>

  <RevealView
    game={mockGame}
    gameId="TEST01"
    playerId={viewAs}
    {amPicker}
    onNextRound={() => (roundAdvanced = true)}
  />
</div>

<style>
  .test-page {
    min-height: 100vh;
    background: #111;
    color: #eee;
    font-family: sans-serif;
    display: flex;
    flex-direction: column;
  }
  .test-controls {
    padding: 0.8rem 1.5rem;
    background: #0d0d0d;
    border-bottom: 1px solid #222;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    flex-wrap: wrap;
  }
  .test-controls h2 {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
  }
  .control-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  .control-row span {
    color: #888;
  }
  .control-row button {
    padding: 0.2em 0.7em;
    border-radius: 5px;
    border: 1px solid #444;
    background: transparent;
    color: #888;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .control-row button.active {
    background: #333;
    color: #fff;
    border-color: #666;
  }
  .links {
    font-size: 0.8rem;
    color: #666;
  }
  .links a {
    color: #6af;
  }
  .advanced-msg {
    font-size: 0.8rem;
    color: #6f9;
  }
</style>
