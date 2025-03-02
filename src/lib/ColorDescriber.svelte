<script lang="ts">
  import type { Color } from "./types";
  import { isInvalid } from "./validateColorWord";

  const { color, ondescribe } = $props<{
    color: Color;
    ondescribe: (name: string) => void;
  }>();
  let description = $state("");
  let invalidMessage = $derived(isInvalid(description));

  // Compute complementary LAB color
  let complementaryColor = $derived({
    lightness: color.lightness, // Keep lightness the same
    a: -color.a, // Flip A value
    b: -color.b, // Flip B value
  });
</script>

<div
  style:--color="lab({color.lightness}
  {color.a}
  {color.b})"
  style:--text={color.lightness < 50 ? "white" : "black"}
  style:--shadow={color.lightness < 50 ? "0 0 8px black" : "0 0 8px white"}
>
  <h1>{description || "Name that Color!"}</h1>
  <label>
    <b>Name the color in fewer than 64 characters:</b>
    <input bind:value={description} type="text" />
    <p class="directions">No direct color words allowed: be creative!</p>
    {#if invalidMessage}
      <p><b>{invalidMessage}</b></p>
    {/if}
  </label>

  <button
    disabled={invalidMessage || description.length === 0}
    class:hidden={invalidMessage || description.length === 0}
    style:--complementary-color="lab({complementaryColor.lightness}
    {complementaryColor.a}
    {complementaryColor.b})"
    on:click={() => {
      ondescribe(description);
    }}
  >
    Submit
  </button>
</div>

<style>
  button.hidden {
    opacity: 0;
  }
  button {
    opacity: 1;
  }
  div {
    display: grid;
    place-content: center;
    width: 100vw;
    height: 100vh;
    position: fixed;
    z-index: 2;
    top: 0;
    left: 0;
    background-color: var(--color);
    color: var(--text);
    text-shadow: var(--shadow);
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
  }

  input {
    display: block;
    margin-top: 8px;
    font-size: 2rem;
  }

  button {
    background-color: var(--color);
    border-color: var(--complementary-color);
    border-width: 8px;
    color: var(--text);
    text-shadow: var(--shadow);
    font-size: 2rem;
    padding: 1em;
    border-radius: 16px;
  }
  .directions {
    margin-top: 4px;
    font-style: italic;
  }
</style>
