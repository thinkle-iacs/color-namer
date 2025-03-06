<script lang="ts">
  import { labToRgb } from "./labToRgb";
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
  let rgb = $derived(labToRgb(color.lightness, color.a, color.b));
</script>

<section>
  <h1>{description || "Name that Color!"}</h1>
  <label>
    <b>Name the color in fewer than 64 characters:</b>
    <input bind:value={description} type="text" />
    {#if invalidMessage}
      <p><b>{invalidMessage}</b></p>
    {:else}
      <p><b>&nbsp;</b></p>
    {/if}
  </label>
  <div class="swatch-container">
    <div
      class="swatch"
      style:--color="rgb({rgb[0]}, {rgb[1]}, {rgb[2]})"
      style:--text={color.lightness < 50 ? "white" : "black"}
      style:--shadow={color.lightness < 50 ? "0 0 8px black" : "0 0 8px white"}
    >
      {#if description}
        <h1>
          &ldquo;{description}&rdquo;
        </h1>
      {/if}
      <div>RGB: {rgb[0]}, {rgb[1]}, {rgb[2]}</div>
      <div>LAB: {color.lightness}, {color.a}, {color.b}</div>
    </div>
  </div>
  <div style="margin-top:1em;text-align:center;">
    <button
      disabled={!!invalidMessage || description.length === 0}
      on:click={() => {
        ondescribe(description);
      }}
    >
      Submit
    </button>
  </div>
</section>

<style>
  button.hidden {
    opacity: 0;
  }
  button {
    opacity: 1;
  }
  button[disabled] {
    opacity: 0.5;
    filter: blur(2px);
  }
  section {
    display: grid;
    place-content: center;
    width: 100vw;
    height: 100vh;
    position: fixed;
    z-index: 2;
    top: 0;
    left: 0;
    background: black;
    color: white;
  }

  .swatch-container {
    display: grid;
    place-content: center;
    padding: 3em;
    background: linear-gradient(to bottom right, black, white);
  }
  .swatch {
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
    min-width: 80px;
    min-height: 80px;
    padding: 16px;
    border-radius: 16px;
    place-content: center;
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
