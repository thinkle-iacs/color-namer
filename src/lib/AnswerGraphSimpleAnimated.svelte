<script lang="ts">
  import { onMount } from "svelte";
  import { labToRgb } from "./labToRgb";
  import type { Color } from "./types";

  const { color, guesses } = $props<{
    color: Color;
    guesses: { name: string; color: Color; userColor: string }[];
  }>();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let selectedAxes: [keyof Color, keyof Color] = ["a", "b"];
  let currentL = 50; // Start at mid-lightness
  let animating = true; // Toggle animation state
  let maxRadius = 7; // Largest size when L matches
  let minRadius = 2; // Smallest size when L is farthest

  function drawGraph() {
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    // Draw LAB background
    for (let x = 0; x < 256; x++) {
      for (let y = 0; y < 256; y++) {
        let labA = x - 128;
        let labB = y - 128;
        let [r, g, b] = labToRgb(currentL, labA, labB);

        let index = (y * canvas.width + x) * 4;
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw guesses - adjust size based on Lightness distance
    for (let guess of guesses) {
      let distL = Math.abs(guess.color.lightness - currentL);
      let radius = maxRadius - (distL / 50) * (maxRadius - minRadius);
      radius = Math.max(minRadius, radius); // Ensure minimum size

      ctx.fillStyle = guess.userColor;
      ctx.beginPath();
      ctx.arc(guess.color.a + 128, guess.color.b + 128, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    let target = color;
    let distL = Math.abs(target.lightness - currentL);
    let radius = maxRadius - (distL / 50) * (maxRadius - minRadius);
    radius = Math.max(minRadius, radius); // Ensure minimum size
    // alternating red and white circles...
    for (let r = 1; r < radius; r += 5) {
      ctx.fillStyle = r % 2 ? "red" : "white";
      ctx.beginPath();
      ctx.arc(target.a + 128, target.b + 128, r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  let direction = 1;
  let lastUpdate = null;

  function animate() {
    if (!animating) return;
    if (!lastUpdate) lastUpdate = performance.now();
    let elapsed = performance.now() - lastUpdate;
    if (elapsed < 20) {
      requestAnimationFrame(animate);
      return;
    }
    if (direction === 1 && currentL >= 300) {
      direction = -1;
      currentL = 100;
    } else if (direction === -1 && currentL <= 0) {
      direction = 1;
      currentL = 0;
    }
    currentL += direction;
    drawGraph();
    lastUpdate = performance.now();
    requestAnimationFrame(animate);
  }

  function toggleAnimation() {
    animating = !animating;
    if (animating) animate();
  }

  onMount(() => {
    drawGraph();
    animate(); // Start animation
  });
</script>

<div class="graph-container">
  <canvas bind:this={canvas} width="256" height="256"></canvas>
  <button on:click={toggleAnimation}>
    {animating ? "Pause" : "Play"}
  </button>
</div>

<style>
  .graph-container {
    text-align: center;
  }
  canvas {
    width: 100%;
    height: auto;
    display: block;
    margin: auto;
    border: 1px solid white;
  }
  button {
    margin-top: 10px;
    padding: 10px;
    font-size: 1rem;
  }
</style>
