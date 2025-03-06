<script lang="ts">
  import { onMount } from "svelte";
  import { labToRgb } from "./labToRgb";

  // ✅ Svelte 5 props
  const {
    center = { lightness: 50, a: 0, b: 0 },
    zoom = 1,
    height = 600,
    onselect,
  } = $props<{
    center: { lightness: number; a: number; b: number };
    zoom: number; // 1 = Full space, 2 = Half space, 8 = 1/8th space, etc.
    onselect: (selectedColor: {
      lightness: number;
      a: number;
      b: number;
    }) => void;
  }>();

  let lightness = $state(center.lightness);
  let lightnessSlider: HTMLDivElement;
  let gradientCanvas: HTMLCanvasElement;

  function updateLightness(clientY: number) {
    if (!lightnessSlider) return;
    const rect = lightnessSlider.getBoundingClientRect();
    let offsetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    lightness = Math.round(100 - (offsetY / rect.height) * 100); // Invert slider direction
    drawLabGradient();
  }

  function startDragging(e: MouseEvent | TouchEvent) {
    e.preventDefault();

    function moveHandler(event: MouseEvent | TouchEvent) {
      let clientY =
        event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
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

    let clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    updateLightness(clientY);
  }

  function handleClickOnGradient(event: MouseEvent) {
    if (!gradientCanvas) return;
    const rect = gradientCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // ✅ New absolute zoom calculation
    const range = 128 / zoom;
    const a = center.a - range + (x / rect.width) * (range * 2);
    const b = center.b + range - (y / rect.height) * (range * 2);

    const selectedColor = { lightness, a: Math.round(a), b: Math.round(b) };
    onselect(selectedColor);
  }

  function drawLabGradient() {
    if (!gradientCanvas) return;
    const ctx = gradientCanvas.getContext("2d");
    if (!ctx) return;

    const width = gradientCanvas.width;
    const height = gradientCanvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // ✅ Define LAB range proportionally based on zoom level
    const range = 128 / zoom;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const a = center.a - range + (x / width) * (range * 2);
        const b = center.b + range - (y / height) * (range * 2);
        const rgb = labToRgb(lightness, a, b);

        const index = (y * width + x) * 4;
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
</script>

<!-- ✅ Now zoom and center affect the LAB display dynamically -->
<h2>Zoom level: {zoom}</h2>
<div class="lab-selector" style:--height="{height}px">
  <!-- Lightness Slider -->
  <div
    class="lightness-slider"
    bind:this={lightnessSlider}
    aria-roledescription="slider"
    onmousedown={startDragging}
    ontouchstart={startDragging}
  >
    <div
      class="slider-thumb"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          lightness = Math.min(100, lightness + 1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          lightness = Math.max(0, lightness - 1);
        }
        drawLabGradient();
      }}
      style="top: calc({100 - lightness}% - 2px);"
    ></div>
  </div>

  <!-- Lab a/b Gradient Box (Canvas) -->
  <canvas
    bind:this={gradientCanvas}
    width="500"
    height="500"
    onclick={handleClickOnGradient}
  ></canvas>
</div>

<style>
  .lab-selector {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 32px auto;
  }

  .lightness-slider {
    position: relative;
    height: var(--height);
    box-sizing: border-box;
    width: 32px;
    background: linear-gradient(to top, black, white);
    user-select: none;
  }

  .slider-thumb {
    position: absolute;
    left: 0;
    width: 100%;
    height: 4px;
    background: rgb(133, 133, 133);
    border: 1px solid white;
    cursor: pointer;
  }

  canvas {
    width: var(--height);
    height: var(--height);
    display: block;
  }
</style>
