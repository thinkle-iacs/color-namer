<script lang="ts">
  import AnswerRevealer from "$lib/AnswerRevealer.svelte";
  import ColorDescriber from "$lib/ColorDescriber.svelte";
  import ColorPicker from "$lib/ColorPicker.svelte";
  import type { Color } from "$lib/types";

  let numPlayers: number | null = null;
  let currentPlayerIndex = 0;
  let currentPickerIndex = 0; // Track whose turn it is to pick
  let players: { name: string; color: string; guess: Color | null }[] = [];

  let theGuess: Color | null = null;
  let theColor: Color | null = null;
  let theClue: string = "";

  // Predefined team colors
  const teamColors = [
    "red",
    "blue",
    "green",
    "orange",
    "yellow",
    "purple",
    "black",
    "white",
  ];

  function startGame(playersCount: number) {
    numPlayers = playersCount;
    players = teamColors.slice(0, playersCount).map((color) => ({
      name: color.charAt(0).toUpperCase() + color.slice(1) + " Team",
      color,
      guess: null,
    }));
    currentPickerIndex = 0; // First player picks
    resetColor();
  }

  function resetColor() {
    if (numPlayers === null) return;

    let lightness = Math.round(Math.random() * 100);
    let a = Math.round(Math.random() * 256) - 128;
    let b = Math.round(Math.random() * 256) - 128;
    theColor = { lightness, a, b };
    theClue = "";
    theGuess = null;
    currentPlayerIndex = 0;
    players.forEach((p) => (p.guess = null));
  }

  function submitGuess(guess: Color) {
    players[currentPlayerIndex].guess = guess;
    if (currentPlayerIndex < players.length - 1) {
      currentPlayerIndex++;
    } else {
      theGuess = guess; // All players guessed, reveal the answer
    }
  }

  function nextRound() {
    // Rotate the picker role
    currentPickerIndex = (currentPickerIndex + 1) % players.length;
    resetColor();
  }
</script>

<h1>Color Namer</h1>

{#if numPlayers === null}
  <h2>Select Number of Players</h2>
  <div class="player-select">
    {#each [2, 3, 4, 5, 6, 7, 8] as p}
      <button on:click={() => startGame(p)}>{p} Players</button>
    {/each}
  </div>
{:else}
  {#if !theClue}
    <button id="new-color-button" on:click={resetColor}>New Color</button>
  {/if}

  {#if !theClue && theColor}
    <h2 class="on-top">
      {players[currentPickerIndex].name} is picking the color...
    </h2>
    <ColorDescriber color={theColor} ondescribe={(clue) => (theClue = clue)} />
  {:else}
    <div>
      {#if !theGuess}
        <p>Pick the color named:</p>
        <h1>&ldquo;{theClue}&rdquo;</h1>

        <h2>{players[currentPlayerIndex].name}'s Turn</h2>

        <!-- 🔥 FORCE RESET: Wrap ColorPicker in {#key} to reset per team -->
        {#key players[currentPlayerIndex].name}
          <ColorPicker onconfirm={(c) => submitGuess(c)} />
        {/key}

        <p>Players Guessed:</p>
        <ul>
          {#each players as player}
            <li style="color: {player.color}">
              {player.name}: {player.guess ? "✅" : "❌"}
            </li>
          {/each}
        </ul>
      {:else}
        <AnswerRevealer
          color={theColor!}
          guesses={players.map((p) => ({
            name: p.name,
            color: p.guess!,
            userColor: p.color,
          }))}
          description={theClue}
          onComplete={nextRound}
        />
      {/if}
    </div>
  {/if}
{/if}

<style>
  div {
    width: max(calc(100vw - 32px), 500px);
    height: max(70vh, 750px);
    display: grid;
    place-content: center;
  }

  .player-select {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .player-select button {
    padding: 1em;
    font-size: 1.5rem;
    border-radius: 8px;
    cursor: pointer;
  }

  #new-color-button {
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 99;
    padding: 1em;
    font-size: 2rem;
    border-radius: 16px;
    background: linear-gradient(to bottom right, #f00, #0f0, #00f);
    color: white;
    text-shadow: 1px 1px 1px black;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    font-size: 1.5rem;
  }
  h2.on-top {
    position: fixed;
    top: 32px;
    left: 32px;
    z-index: 99;
    color: white;
    width: 100%;
    text-align: center;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      "Open Sans",
      "Helvetica Neue",
      sans-serif;
    font-style: italic;
  }
</style>
