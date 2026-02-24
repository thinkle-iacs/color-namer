<script lang="ts">
  import { onMount } from "svelte";
  import { hslToRgb, labToRgb, rgbToHsl, rgbToLab } from "./labToRgb";

  const {
    center = { lightness: 50, a: 0, b: 0 },
    zoom = 1,
    selection = null,
    selectionRange = null,
    onselect,
    onlightnesschange,
  } = $props<{
    center: { lightness: number; a: number; b: number };
    zoom: number; // 1 = full LAB space, 2 = half, etc.
    selection?: { lightness: number; a: number; b: number } | null;
    selectionRange?: number | null; // LAB half-range for the next zoom preview
    onselect: (selectedColor: { lightness: number; a: number; b: number }) => void;
    onlightnesschange?: (lightness: number) => void;
  }>();

  const SLIDER_W = 36;

  let lightness = $state(center.lightness);
  let lightnessSlider: HTMLDivElement;
  let gradientCanvas: HTMLCanvasElement;
  let containerWidth = $state(0);

  // Canvas fills available width minus the lightness slider
  let canvasSize = $derived(Math.max(80, containerWidth - SLIDER_W - 2));
  let currentLabRange = $derived(128 / zoom);
  let hueRange = $derived(180 / zoom);
  let satRange = $derived(50 / zoom);
  let satMin = $derived(0);
  let satMax = $derived.by(() => clamp(centerHsl.s + satRange, 12, 100));
  let satSpan = $derived(Math.max(1, satMax - satMin));

  function clamp(v: number, min: number, max: number): number {
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function wrapHue(h: number): number {
    const wrapped = h % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
  }

  function shortestHueDelta(target: number, from: number): number {
    let d = wrapHue(target) - wrapHue(from);
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  let centerHsl = $derived.by(() => {
    if (zoom === 1) return { h: 180, s: 50, l: 50 };
    const [r, g, b] = labToRgb(center.lightness, center.a, center.b);
    const [h, s, l] = rgbToHsl(r, g, b);
    return { h, s, l };
  });

  let selectionPoint = $derived.by(() => {
    if (!selection) return null;
    const [sr, sg, sb] = labToRgb(selection.lightness, selection.a, selection.b);
    const [selHue, selSat] = rgbToHsl(sr, sg, sb);
    const hueDelta = shortestHueDelta(selHue, centerHsl.h);
    const xPct = ((hueDelta + hueRange) / (hueRange * 2)) * 100;
    const yPct = ((satMax - selSat) / satSpan) * 100;
    return {
      x: Math.max(0, Math.min(100, xPct)),
      y: Math.max(0, Math.min(100, yPct)),
    };
  });

  let selectionBox = $derived.by(() => {
    if (!selectionPoint || selectionRange === null) return null;
    const sizePct = (selectionRange / currentLabRange) * 100;
    const left = Math.max(0, Math.min(100 - sizePct, selectionPoint.x - sizePct / 2));
    const top = Math.max(0, Math.min(100 - sizePct, selectionPoint.y - sizePct / 2));
    return { sizePct, left, top };
  });

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

    const hue = wrapHue(centerHsl.h - hueRange + (x / rect.width) * (hueRange * 2));
    const sat = clamp(satMax - (y / rect.height) * satSpan, 0, 100);
    const [r, g, b] = hslToRgb(hue, sat, lightness);
    const [l2, a2, b2] = rgbToLab(r, g, b);
    onselect({ lightness: l2, a: a2, b: b2 });
  }

  function drawLabGradient() {
    if (!gradientCanvas) return;
    const ctx = gradientCanvas.getContext("2d");
    if (!ctx) return;

    const w = gradientCanvas.width;
    const h = gradientCanvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const hue = wrapHue(centerHsl.h - hueRange + (x / w) * (hueRange * 2));
        const sat = clamp(satMax - (y / h) * satSpan, 0, 100);
        const rgb = hslToRgb(hue, sat, lightness);

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
    centerHsl.h;
    centerHsl.s;
    centerHsl.l;
    lightness = centerHsl.l;
  });

  $effect(() => {
    lightness;
    onlightnesschange?.(lightness);
  });

  $effect(() => {
    canvasSize;
    lightness;
    centerHsl.h;
    centerHsl.s;
    hueRange;
    satRange;
    satMax;
    satSpan;
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
    <!-- Saturation / hue guidance -->
    <span class="axis top">high saturation</span>
    <span class="axis bottom">low saturation</span>
    <span class="axis left">hue −</span>
    <span class="axis right">hue +</span>

    {#if selectionBox}
      <div
        class="selection-box"
        style="
          left: {selectionBox.left}%;
          top: {selectionBox.top}%;
          width: {selectionBox.sizePct}%;
          height: {selectionBox.sizePct}%;
        "
      ></div>
    {/if}

    {#if selectionPoint}
      <div
        class="selection-dot"
        style="
          left: calc({selectionPoint.x}% - 5px);
          top: calc({selectionPoint.y}% - 5px);
        "
      ></div>
    {/if}
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

  .selection-box {
    position: absolute;
    border: 2px dashed rgba(255, 255, 255, 0.92);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.2);
    pointer-events: none;
    border-radius: 2px;
  }

  .selection-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.55);
    pointer-events: none;
  }
</style>
