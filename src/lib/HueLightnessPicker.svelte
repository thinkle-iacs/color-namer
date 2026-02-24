<script lang="ts">
  import { onMount } from 'svelte';
  import { hslToRgb, labToRgb, rgbToHsl, rgbToLab } from './labToRgb';

  const {
    center = { lightness: 50, a: 0, b: 0 },
    selection = null,
    selectionRangePct = 50,
    onselect,
  } = $props<{
    center?: { lightness: number; a: number; b: number };
    selection?: { lightness: number; a: number; b: number } | null;
    selectionRangePct?: number;
    onselect: (selectedColor: { lightness: number; a: number; b: number }) => void;
  }>();

  const SATURATION = 100;
  const HUE_FALLBACK = 180;

  let gradientCanvas: HTMLCanvasElement;
  let containerWidth = $state(0);
  let canvasSize = $derived(Math.max(80, containerWidth));

  function wrapHue(h: number): number {
    const wrapped = h % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
  }

  let selectionPoint = $derived.by(() => {
    if (!selection) return null;
    const [r, g, b] = labToRgb(selection.lightness, selection.a, selection.b);
    const [rawHue, sat, lightness] = rgbToHsl(r, g, b);
    const hue = sat < 3 ? HUE_FALLBACK : rawHue;
    const x = (wrapHue(hue) / 360) * 100;
    const y = ((100 - lightness) / 100) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  });

  let selectionBox = $derived.by(() => {
    if (!selectionPoint) return null;
    const sizePct = Math.max(8, Math.min(90, selectionRangePct));
    const left = Math.max(0, Math.min(100 - sizePct, selectionPoint.x - sizePct / 2));
    const top = Math.max(0, Math.min(100 - sizePct, selectionPoint.y - sizePct / 2));
    return { sizePct, left, top };
  });

  function handleClickOnGradient(event: MouseEvent): void {
    if (!gradientCanvas) return;
    const rect = gradientCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hue = wrapHue((x / rect.width) * 360);
    const lightness = Math.max(0, Math.min(100, Math.round(100 - (y / rect.height) * 100)));
    const [rr, gg, bb] = hslToRgb(hue, SATURATION, lightness);
    const [l2, a2, b2] = rgbToLab(rr, gg, bb);
    onselect({ lightness: l2, a: a2, b: b2 });
  }

  function drawGradient(): void {
    if (!gradientCanvas) return;
    const ctx = gradientCanvas.getContext('2d');
    if (!ctx) return;

    const w = gradientCanvas.width;
    const h = gradientCanvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const hue = wrapHue((x / w) * 360);
        const lightness = Math.max(0, Math.min(100, 100 - (y / h) * 100));
        const rgb = hslToRgb(hue, SATURATION, lightness);

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
    drawGradient();
  });

  $effect(() => {
    center.lightness;
    center.a;
    center.b;
    canvasSize;
    drawGradient();
  });
</script>

<div class="quick-picker" bind:clientWidth={containerWidth}>
  <div class="canvas-wrap" style="width: {canvasSize}px; height: {canvasSize}px;">
    <canvas
      bind:this={gradientCanvas}
      width="500"
      height="500"
      onclick={handleClickOnGradient}
    ></canvas>

    <span class="axis top">light</span>
    <span class="axis bottom">dark</span>
    <span class="axis left">hue 0°</span>
    <span class="axis right">hue 360°</span>

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
          left: calc({selectionPoint.x}% - 6px);
          top: calc({selectionPoint.y}% - 6px);
        "
      ></div>
    {/if}
  </div>
</div>

<style>
  .quick-picker {
    width: 100%;
  }

  .canvas-wrap {
    position: relative;
    margin: 0 auto;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
    border-radius: 4px;
  }

  .axis {
    position: absolute;
    font-size: 0.6rem;
    font-weight: 600;
    pointer-events: none;
    opacity: 0.78;
    text-align: center;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.7);
    line-height: 1;
  }
  .axis.top { top: 6px; left: 50%; transform: translateX(-50%); color: #fff0b3; }
  .axis.bottom { bottom: 6px; left: 50%; transform: translateX(-50%); color: #dddddd; }
  .axis.left { left: 6px; top: 50%; transform: translateY(-50%); color: #ffd6d6; }
  .axis.right { right: 6px; top: 50%; transform: translateY(-50%); color: #d6e9ff; }

  .selection-dot {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.58);
    pointer-events: none;
  }

  .selection-box {
    position: absolute;
    border: 2px dashed rgba(255, 255, 255, 0.92);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.2);
    pointer-events: none;
    border-radius: 2px;
  }
</style>
