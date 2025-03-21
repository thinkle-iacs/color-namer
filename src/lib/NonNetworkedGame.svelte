<script lang="ts">
  import PlayerNamer from "./PlayerNamer.svelte";

  import AnswerRevealer from "$lib/AnswerRevealer.svelte";
  import ColorDescriber from "$lib/ColorDescriber.svelte";
  import ColorPicker from "$lib/ColorPicker.svelte";
  import type { Color } from "$lib/types";
  import { labToRgb, rgbToLab } from "./labToRgb";
  import { updated } from "$app/state";

  let numPlayers: number | null = null;
  let players: { name: string; color: string; guess: Color | null }[] = [];
  // activeGuessIndex tracks the current guesser (players[0] is always the cluer)
  let activeGuessIndex = 1;
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
    activeGuessIndex = 1; // first guesser after the cluer
    resetColor();
  }

  function resetColor() {
    if (numPlayers === null) return;

    // Generate a random color
    let r = Math.floor(Math.random() * 256);
    let g = Math.floor(Math.random() * 256);
    let blue = Math.floor(Math.random() * 256);
    const [lightness, a, b] = rgbToLab(r, g, blue);
    theColor = { lightness, a, b };

    theClue = "";
    // Reset all guesses
    players = players.map((p) => ({ ...p, guess: null }));
  }

  function submitGuess(guess: Color) {
    // Record the guess for the current guesser
    players[activeGuessIndex].guess = guess;
    // Force reactivity
    players = [...players];
    activeGuessIndex++;
  }

  // Check if all guessers have guessed (i.e. activeGuessIndex is out of bounds)
  function roundOver() {
    return activeGuessIndex >= players.length;
  }

  function nextRound() {
    // Rotate the players list: the cluer moves to the end,
    // so a new cluer is at players[0].
    players.push(players.shift()!);
    // Reassign to trigger reactivity.
    players = [...players];
    activeGuessIndex = 1; // reset the guesser index
    resetColor();
  }

  let needNames = true;
  let delay = true;
</script>

{#if numPlayers === null}
  <h2>Select Number of Players</h2>
  <div class="player-select">
    {#each [2, 3, 4, 5, 6, 7, 8] as p}
      <button on:click={() => startGame(p)}>{p} Players</button>
    {/each}
  </div>
{:else if needNames}
  <PlayerNamer
    onUpdate={(updatedPlayers) => {
      players = updatedPlayers;
      needNames = false;
    }}
    {players}
  />
{:else if delay}
  <div class="fs-center">
    <p>Ok... {players[0].name} will go first</p>
    <p>Move the other players away from the screen</p>
    <button on:click={() => (delay = false)}>Go</button>
  </div>
{:else}
  {#if !theClue}
    <button id="new-color-button" on:click={resetColor}>New Color</button>
  {/if}

  {#if !theClue && theColor}
    <h2 class="on-top">
      {players[0].name} is picking the color...
    </h2>
    <ColorDescriber
      color={theColor}
      ondescribe={(clue) => {
        theClue = clue;
      }}
    />
  {:else}
    <div>
      {#if !roundOver()}
        <p>Pick the color named:</p>
        <h1>&ldquo;{theClue}&rdquo;</h1>
        <h2>{players[activeGuessIndex].name}'s Turn</h2>

        {#key players[activeGuessIndex].name}
          <ColorPicker onconfirm={(c) => submitGuess(c)} />
        {/key}
      {:else}
        <AnswerRevealer
          color={theColor!}
          guesses={players.slice(1).map((p) => ({
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
    display: block;
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

  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
  }
</style>
