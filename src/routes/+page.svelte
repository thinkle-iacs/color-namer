<script lang="ts">
  import AnswerRevealer from "$lib/AnswerRevealer.svelte";
  import ColorDescriber from "$lib/ColorDescriber.svelte";
  import ColorPicker from "$lib/ColorPicker.svelte";
  import type { Color } from "$lib/types";
  let theGuess: Color | null = null;
  let theColor: Color | null = null;
  let theClue: string = "";

  function resetColor() {
    let lightness = Math.round(Math.random() * 100);
    let a = Math.round(Math.random() * 256) - 128;
    let b = Math.round(Math.random() * 256) - 128;
    theColor = { lightness, a, b };
    theClue = "";
    theGuess = null;
  }
</script>

<h1>Color Namer</h1>
{#if !theClue}
  <button id="new-color-button" onclick={resetColor}>New Color</button>
{/if}
{#if !theClue && theColor}
  <ColorDescriber color={theColor} ondescribe={(clue) => (theClue = clue)} />
{:else}
  <div>
    {#if !theGuess}
      <p>Pick the color named:</p>
      <h1>&ldquo;{theClue}&rdquo;</h1>
      <ColorPicker onconfirm={(c) => (theGuess = c)} />
    {:else}
      <AnswerRevealer
        color={theColor!}
        guesses={[{ name: "Your guess", color: theGuess, userColor: "white" }]}
        description={theClue}
        onComplete={resetColor}
      />
    {/if}
  </div>
{/if}

<style>
  div {
    width: max(calc(100vw - 32px), 500px);
    height: max(70vh, 750px);
    display: grid;
    place-content: center;
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
</style>
