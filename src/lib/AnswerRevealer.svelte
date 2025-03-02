<script lang="ts">
  import type { Color } from "./types";

  let { color, guesses, description, onComplete } = $props<{
    color: Color;
    guesses: { name: string; color: Color; userColor: string }[];
    description: string;
    onComplete: () => void;
  }>();
</script>

<section>
  <h2>The Big Reveal...</h2>
  <h1
    style:--color="lab({color.lightness}
    {color.a}
    {color.b})"
  >
    {description}
  </h1>
  <div class="left-right">
    <div class="guesses">
      {#each guesses as { name, color, userColor }, i}
        <div
          class="color"
          style:--color="lab({color.lightness}
          {color.a}
          {color.b})"
          style:--text={color.lightness < 50 ? "white" : "black"}
          style:--shadow={color.lightness < 50
            ? "0 0 8px black"
            : "0 0 8px white"}
        >
          <span class="user-icon" style:color={userColor}></span>&nbsp;{name}
          <span class="details">
            <br />LAB: {color.lightness}
            {color.a}
            {color.b}
            <!-- Show RGB value of your guess -->
            <br />RGB:</span
          >
        </div>
      {/each}
    </div>
    <div
      class="answer"
      style:--color="lab({color.lightness}
      {color.a}
      {color.b})"
      style:--text={color.lightness < 50 ? "white" : "black"}
      style:--shadow={color.lightness < 50 ? "0 0 8px black" : "0 0 8px white"}
    >
      The Target
      <span class="details">
        <!-- Show LAB value of the target -->
        <br />LAB: {color.lightness}
        {color.a}
        {color.b}
        <!-- Show RGB value of the target -->
      </span>
    </div>
  </div>
  <!-- Next up, draw a canvas with the LAB color space and the target cirlced in red,
   then the answers circled in the user colors... -->
  <canvas></canvas>
</section>

<style>
  section {
    background: black;
    color: white;
    width: 90vw;
    box-sizing: border-box;
    padding: 32px;
    margin: auto;
    min-height: 8l0vh;
  }

  .left-right {
    display: flex;
    justify-content: center;
    gap: 4px;
  }
  .guesses {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
  }
  .answer {
    height: 100%;
    width: 100%;
    flex-grow: grow;
  }
  .guesses .color {
    height: 100%;
    width: 100%;
  }
  .guesses .color,
  .answer {
    background-color: var(--color);
    color: var(--text);
    text-shadow: var(--shadow);
    font-size: 2em;
    padding: 1em;
    box-sizing: border-box;
  }
  h1 {
    font-size: 5em;
    color: var(--color);
    text-align: center;
    text-shadow: var(--complementary-color);
  }
  .details {
    font-size: 1rem;
    white-space: nowrap;
  }
  .user-icon {
    display: inline-block;
    width: 1em;
    height: 1em;
    border-radius: 50%;
    background-color: var(--color);
  }
</style>
