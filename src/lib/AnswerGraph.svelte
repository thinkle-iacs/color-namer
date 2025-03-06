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

  function computeVariance(values: number[]) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  }

  function selectBestAxes() {
    const lightnessValues = guesses.map(({ color }) => color.lightness);
    const aValues = guesses.map(({ color }) => color.a);
    const bValues = guesses.map(({ color }) => color.b);

    const varL = computeVariance(lightnessValues);
    const varA = computeVariance(aValues);
    const varB = computeVariance(bValues);

    if (varL <= varA && varL <= varB) return ["a", "b"]; // Drop L
    if (varA <= varL && varA <= varB) return ["l", "b"]; // Drop A
    return ["l", "a"]; // Drop B
  }

  function drawGraph() {
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    selectedAxes = selectBestAxes();
    const [axis1, axis2] = selectedAxes;

    // Compute bounding box for zooming
    let min1 = color[axis1],
      max1 = color[axis1];
    let min2 = color[axis2],
      max2 = color[axis2];

    guesses.forEach(({ color }) => {
      min1 = Math.min(min1, color[axis1]);
      max1 = Math.max(max1, color[axis1]);
      min2 = Math.min(min2, color[axis2]);
      max2 = Math.max(max2, color[axis2]);
    });

    // Expand bounding box by 20%
    const padding1 = (max1 - min1) * 0.2;
    const padding2 = (max2 - min2) * 0.2;
    min1 -= padding1;
    max1 += padding1;
    min2 -= padding2;
    max2 += padding2;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Draw LAB gradient within zoomed area
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const val1 = min1 + (x / width) * (max1 - min1);
        const val2 = min2 + (y / height) * (max2 - min2);

        // Convert to LAB and then RGB
        const lab = { lightness: 50, a: 0, b: 0 };
        lab[axis1] = val1;
        lab[axis2] = val2;
        const rgb = labToRgb(lab.lightness, lab.a, lab.b);

        // Set pixel data
        const index = (y * width + x) * 4;
        data[index] = rgb[0]; // R
        data[index + 1] = rgb[1]; // G
        data[index + 2] = rgb[2]; // B
        data[index + 3] = 255; // Alpha
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert LAB values to canvas coordinates
    function labToCanvas(val1: number, val2: number) {
      return {
        x: ((val1 - min1) / (max1 - min1)) * width,
        y: ((val2 - min2) / (max2 - min2)) * height,
      };
    }

    // Draw the target color circle (🔴 Red)
    const targetPos = labToCanvas(color[axis1], color[axis2]);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(targetPos.x, targetPos.y, 8, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw user guesses
    guesses.forEach(({ color: guessColor, userColor }) => {
      const pos = labToCanvas(guessColor[axis1], guessColor[axis2]);

      // Draw connecting line
      ctx.strokeStyle = userColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(targetPos.x, targetPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Draw user guess
      ctx.fillStyle = userColor;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  onMount(() => {
    drawGraph();
  });
</script>

<div class="graph-container">
  <canvas bind:this={canvas} width="600" height="400"></canvas>
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
</style>
