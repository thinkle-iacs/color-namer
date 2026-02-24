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

  // 🎛️ Controls
  let tilt = $state(0); // 0° (flat A/B) to 90° (L depth)
  let axisMode: "A vs B" | "L vs A" | "L vs B" = $state("A vs B"); // Toggle for axis projection

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function getColorForXY(x: number, y: number, tilt: number, axisMode: string) {
    let L = 50; // Default lightness
    let A = x - 128;
    let B = y - 128;

    if (axisMode === "L vs A") {
      return labToRgb(A, L, B); // Green/Magenta + Lightness
    } else if (axisMode === "L vs B") {
      return labToRgb(B, L, A); // Blue/Yellow + Lightness
    } else {
      return labToRgb(L, A, B); // A/B standard view
    }
  }

  function projectLAB(
    x: number,
    y: number,
    L: number,
    tilt: number,
    axisMode: string
  ) {
    let tiltRad = (tilt * Math.PI) / 180;

    // Adjust which values are used for X/Y based on axis mode
    let newX = 0,
      newY = 0;
    if (axisMode === "A vs B") {
      newX = x * Math.cos(tiltRad) + L * Math.sin(tiltRad); // A = X, B = Y
      newY = y;
    } else if (axisMode === "L vs A") {
      newX = L * Math.cos(tiltRad) + x * Math.sin(tiltRad); // Lightness = X, A = Y
      newY = y;
    } else if (axisMode === "L vs B") {
      newX = L * Math.cos(tiltRad) + y * Math.sin(tiltRad); // Lightness = X, B = Y
      newY = x;
    }

    return {
      x: clamp(newX + 128, 0, 255),
      y: clamp(newY + 128, 0, 255),
    };
  }

  function drawGraph() {
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    // 🎨 Draw LAB Gradient
    for (let x = 0; x < 256; x++) {
      for (let y = 0; y < 256; y++) {
        let [r, g, b] = getColorForXY(x, y, tilt, axisMode);
        let index = (y * canvas.width + x) * 4;
        data[index] = clamp(r, 0, 255);
        data[index + 1] = clamp(g, 0, 255);
        data[index + 2] = clamp(b, 0, 255);
        data[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 🎯 Compute and project target position
    let target = color;
    let { x: tx, y: ty } = projectLAB(
      target.a,
      target.b,
      target.lightness,
      tilt,
      axisMode
    );

    // 🔗 Draw Lines from Guesses to Target
    ctx.lineWidth = 2;
    for (let guess of guesses) {
      let { x: gx, y: gy } = projectLAB(
        guess.color.a,
        guess.color.b,
        guess.color.lightness,
        tilt,
        axisMode
      );

      let distance = Math.abs(guess.color.lightness - color.lightness);
      let intensity = clamp(255 - distance * 5, 100, 255);
      ctx.strokeStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(gx, gy);
      ctx.stroke();
    }

    // 🟠 Draw Guesses
    for (let guess of guesses) {
      let { x: gx, y: gy } = projectLAB(
        guess.color.a,
        guess.color.b,
        guess.color.lightness,
        tilt,
        axisMode
      );

      let dist = Math.abs(guess.color.lightness - color.lightness);
      let radius = clamp(7 - (dist / 50) * 5, 2, 7);

      ctx.fillStyle = guess.userColor;
      ctx.beginPath();
      ctx.arc(gx, gy, radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 🔴 Draw Target
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(tx, ty, 8, 0, 2 * Math.PI);
    ctx.fill();
  }

  function handleChange() {
    drawGraph();
  }

  onMount(() => {
    drawGraph();
  });
</script>

<div class="graph-container">
  <canvas bind:this={canvas} width="256" height="256"></canvas>

  <label>
    Tilt (0° = Flat A/B, 90° = L Depth):
    <input
      type="range"
      min="0"
      max="90"
      bind:value={tilt}
      step="1"
      oninput={handleChange}
    />
  </label>

  <div class="axis-controls">
    <button
      onclick={() => {
        axisMode = "A vs B";
        handleChange();
      }}
      class:active={axisMode === "A vs B"}>A vs B</button
    >
    <button
      onclick={() => {
        axisMode = "L vs A";
        handleChange();
      }}
      class:active={axisMode === "L vs A"}>L vs A</button
    >
    <button
      onclick={() => {
        axisMode = "L vs B";
        handleChange();
      }}
      class:active={axisMode === "L vs B"}>L vs B</button
    >
  </div>
</div>

<style>
  .graph-container {
    text-align: center;
  }
  canvas {
    width: 50%;
    height: auto;
    display: block;
    margin: auto;
    border: 1px solid white;
  }
  label {
    display: block;
    margin: 10px;
  }
  .axis-controls {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
  }
  .axis-controls button {
    padding: 8px 12px;
    font-size: 1rem;
    cursor: pointer;
    border: 2px solid white;
    background: black;
    color: white;
    transition 0.2s ease-in-out;
  }
  .axis-controls button.active {
    background: white;
    color: black;
    border-color: white;
    font-weight: bold;
  }
</style>
