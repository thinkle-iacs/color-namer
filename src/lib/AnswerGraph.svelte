<script lang="ts">
  import { onMount } from "svelte";
  import { labToRgb } from "./labToRgb";
  import type { Color } from "./types";

  let { color, guesses } = $props<{
    color: Color;
    guesses: { name: string; color: Color; userColor: string }[];
  }>();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  function colorDistance(c1: Color, c2: Color) {
    let dl = c1.lightness - c2.lightness;
    let da = c1.a - c2.a;
    let db = c1.b - c2.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  function drawGraph() {
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Find bounding box for zooming in on guesses
    let minA = color.a,
      maxA = color.a;
    let minB = color.b,
      maxB = color.b;

    guesses.forEach(({ color }) => {
      minA = Math.min(minA, color.a);
      maxA = Math.max(maxA, color.a);
      minB = Math.min(minB, color.b);
      maxB = Math.max(maxB, color.b);
    });

    // Expand bounding box by 20%
    let paddingA = (maxA - minA) * 0.2;
    let paddingB = (maxB - minB) * 0.2;
    minA -= paddingA;
    maxA += paddingA;
    minB -= paddingB;
    maxB += paddingB;

    // Draw LAB gradient within zoomed area
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const a = minA + (x / width) * (maxA - minA);
        const b = minB + (y / height) * (maxB - minB);

        const rgb = labToRgb(color.lightness, a, b);
        const index = (y * width + x) * 4;
        data[index] = rgb[0]; // R
        data[index + 1] = rgb[1]; // G
        data[index + 2] = rgb[2]; // B
        data[index + 3] = 255; // Alpha
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert LAB values to canvas coordinates
    function labToCanvas(a: number, b: number) {
      return {
        x: ((a - minA) / (maxA - minA)) * width,
        y: ((b - minB) / (maxB - minB)) * height,
      };
    }

    // Draw the target color circle (🔴 Red)
    const targetPos = labToCanvas(color.a, color.b);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(targetPos.x, targetPos.y, 8, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw user guesses (🔵 User Color Circles)
    guesses.forEach(({ color: guessColor, userColor }) => {
      const pos = labToCanvas(guessColor.a, guessColor.b);

      // Draw connecting line
      ctx.strokeStyle = userColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(targetPos.x, targetPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Draw user circle
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

<canvas bind:this={canvas} width="600" height="400"></canvas>

<style>
  canvas {
    width: 100%;
    height: auto;
    display: block;
    margin: auto;
    border: 1px solid white;
  }
</style>
