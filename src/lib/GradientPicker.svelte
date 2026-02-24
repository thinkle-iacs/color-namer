<script lang="ts">
  import { onMount } from "svelte";
  import { labToRgb } from "./labToRgb";

  const {
    center = { lightness: 50, a: 0, b: 0 },
    zoom = 1,
    onselect,
  } = $props<{
    center: { lightness: number; a: number; b: number };
    zoom: number; // 1 = full LAB space, 2 = half, etc.
    onselect: (selectedColor: { lightness: number; a: number; b: number }) => void;
  }>();

  const SLIDER_W = 36;

  let lightness = $state(center.lightness);
  let lightnessSlider: HTMLDivElement;
  let gradientCanvas: HTMLCanvasElement;
  let containerWidth = $state(0);

  // Canvas fills available width minus the lightness slider
  let canvasSize = $derived(Math.max(80, containerWidth - SLIDER_W - 2));

  function updateLightness(clientY: number) {
    if (!lightnessSlider) return;
    const rect = lightnessSlider.getBoundingClientRect();
    const offsetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    lightness = Math.round(100 - (offsetY / rect.height) * 100);
    drawLabGradient();
  }

  function startDragging(e: MouseEvent | TouchEvent) {
    e.preventDefault();

    function moveHandler(event: MouseEvent | TouchEvent) {
      const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
      updateLightness(clientY);
    }

    function stopDragging() {
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchmove", moveHandler);
      window.removeEventListener("touchend", stopDragging);
    }

    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchmove", moveHandler, { passive: false });
    window.addEventListener("touchend", stopDragging);

    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    updateLightness(clientY);
  }

  function handleClickOnGradient(event: MouseEvent) {
    if (!gradientCanvas) return;
    const rect = gradientCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const range = 128 / zoom;
    const a = center.a - range + (x / rect.width) * (range * 2);
    const b = center.b + range - (y / rect.height) * (range * 2);

    onselect({ lightness, a: Math.round(a), b: Math.round(b) });
  }

  function drawLabGradient() {
    if (!gradientCanvas) return;
    const ctx = gradientCanvas.getContext("2d");
    if (!ctx) return;

    const w = gradientCanvas.width;
    const h = gradientCanvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const range = 128 / zoom;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = center.a - range + (x / w) * (range * 2);
        const b = center.b + range - (y / h) * (range * 2);
        const rgb = labToRgb(lightness, a, b);

        const index = (y * w + x) * 4;
        data[index] = rgb[0];
        data[index + 1] = rgb[1];
        data[index + 2] = rgb[2];
        data[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  onMount(() => {
    drawLabGradient();
  });

  // Redraw when canvas display size changes
  $effect(() => {
    canvasSize; // track as reactive dependency
    drawLabGradient();
  });
</script>

<div class="gradient-picker" bind:clientWidth={containerWidth}>
  <!-- L (lightness) axis slider -->
  <div
    class="lightness-slider"
    style="width: {SLIDER_W}px; height: {canvasSize}px;"
    bind:this={lightnessSlider}
    aria-roledescription="slider"
    onmousedown={startDragging}
    ontouchstart={startDragging}
  >
    <span class="l-label top">light</span>
    <div
      class="slider-thumb"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === "ArrowUp") { e.preventDefault(); lightness = Math.min(100, lightness + 1); }
        else if (e.key === "ArrowDown") { e.preventDefault(); lightness = Math.max(0, lightness - 1); }
        drawLabGradient();
      }}
      style="top: calc({100 - lightness}% - 2px);"
    ></div>
    <span class="l-label bottom">dark</span>
  </div>

  <!-- a/b canvas with axis labels overlaid -->
  <div class="canvas-wrap" style="width: {canvasSize}px; height: {canvasSize}px;">
    <canvas
      bind:this={gradientCanvas}
      width="500"
      height="500"
      onclick={handleClickOnGradient}
    ></canvas>
    <!-- b axis: top = +b (yellow), bottom = −b (blue) -->
    <span class="axis top">+b yellow</span>
    <span class="axis bottom">−b blue</span>
    <!-- a axis: left = −a (green), right = +a (red) -->
    <span class="axis left">−a green</span>
    <span class="axis right">+a red</span>
  </div>
</div>

<style>
  .gradient-picker {
    display: flex;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
  }

  /* Lightness slider */
  .lightness-slider {
    position: relative;
    flex-shrink: 0;
    box-sizing: border-box;
    background: linear-gradient(to top, black, white);
    user-select: none;
    border-radius: 4px 0 0 4px;
    cursor: ns-resize;
  }

  .l-label {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
    white-space: nowrap;
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
  .l-label.top { top: 6px; }
  .l-label.bottom { bottom: 6px; transform: translateX(-50%) rotate(180deg); }

  .slider-thumb {
    position: absolute;
    left: 0;
    width: 100%;
    height: 4px;
    background: rgb(180, 180, 180);
    border: 1px solid white;
    cursor: ns-resize;
  }

  /* Canvas area */
  .canvas-wrap {
    position: relative;
    flex-shrink: 0;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
  }

  /* Axis labels */
  .axis {
    position: absolute;
    font-size: 0.6rem;
    font-weight: 600;
    pointer-events: none;
    opacity: 0.7;
    text-align: center;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.7);
    line-height: 1;
  }
  .axis.top    { top: 5px;    left: 50%; transform: translateX(-50%); color: #ffe066; }
  .axis.bottom { bottom: 5px; left: 50%; transform: translateX(-50%); color: #88aaff; }
  .axis.left   { left: 6px;   top: 50%;  transform: translateY(-50%); color: #88dd88; }
  .axis.right  { right: 6px;  top: 50%;  transform: translateY(-50%); color: #ff9999; }
</style>
