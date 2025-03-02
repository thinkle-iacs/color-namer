<script lang="ts">
  import AnswerGraph from "./AnswerGraph.svelte";

  import { labToRgb } from "./labToRgb";
  import type { Color } from "./types";

  let { color, guesses, description, onComplete } = $props<{
    color: Color;
    guesses: { name: string; color: Color; userColor: string }[];
    description: string;
    onComplete: () => void;
  }>();

  function colorDistance(c1: Color, c2: Color) {
    let dl = c1.lightness - c2.lightness;
    let da = c1.a - c2.a;
    let db = c1.b - c2.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  let rgb = labToRgb(color.lightness, color.a, color.b);
  let textColor = color.lightness < 50 ? "white" : "black";
  let shadowColor = color.lightness < 50 ? "0 0 8px black" : "0 0 8px white";

  let sortedGuesses = guesses
    .map((g) => ({ ...g, score: colorDistance(g.color, color) }))
    .sort((a, b) => a.score - b.score);
</script>

<section
  style:--color="lab({color.lightness}
  {color.a}
  {color.b})"
  style:--text={textColor}
  style:--shadow={shadowColor}
>
  <h2>The Big Reveal...</h2>
  <h1>{description}</h1>

  <div class="left-right">
    <div class="guesses">
      {#each sortedGuesses as { name, color, userColor, score }, i}
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
          <span class="user-icon" style="background-color: {userColor}"></span>
          &nbsp;{name}
          <span class="score">({Math.round(score)})</span>
          <span class="details">
            <br />LAB: {color.lightness}, {color.a}, {color.b}
            <br />RGB: {labToRgb(color.lightness, color.a, color.b).join(", ")}
          </span>
        </div>
      {/each}
    </div>

    <div class="answer">
      The Target
      <span class="details">
        <br />LAB: {color.lightness}, {color.a}, {color.b}
        <br />RGB: {rgb.join(", ")}
      </span>
    </div>
  </div>
  <AnswerGraph {guesses} {color}></AnswerGraph>

  <button onclick={onComplete}>Play again?</button>
</section>

<style>
  section {
    background: black;
    color: white;
    width: 90vw;
    padding: 32px;
    margin: auto;
    min-height: 80vh;
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
    text-align: center;
    text-shadow:
      3px 3px 2px var(--text),
      -3px -3px 5px var(--text);
    color: var(--color);
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
  }

  .score {
    font-size: 1.5rem;
    font-weight: bold;
    margin-left: 8px;
  }

  button {
    background: var(--color);
    color: var(--text);
    text-shadow: var(--shadow);
    font-size: 2em;
    padding: 1em;
    border-radius: 16px;
    margin: 1em auto;
    display: block;
  }
</style>
