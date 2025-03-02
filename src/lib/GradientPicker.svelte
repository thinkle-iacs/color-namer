<script lang="ts">
  let mode: "broad" | "narrow" = "broad";
  let color = null;
  export let onselect: (lightness: number) => void;

  let lightness = 50;
  let lightnessSlider: HTMLDivElement;

  function updateLightnessFromEvent(e: MouseEvent | TouchEvent) {
    if (!lightnessSlider) return;
    const rect = lightnessSlider.getBoundingClientRect();
    let clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    let offsetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    lightness = (offsetY / rect.height) * 100;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      lightness = Math.max(0, lightness - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      lightness = Math.min(100, lightness + 1);
    }
  }
</script>

<div class="lab-selector">
  <div
    class="lightness-slider"
    bind:this={lightnessSlider}
    aria-roledescription="slider"
    onmousedown={(e) => updateLightnessFromEvent(e)}
    ontouchstart={(e) => updateLightnessFromEvent(e)}
    ontouchmove={(e) => updateLightnessFromEvent(e)}
  >
    <div
      class="slider-thumb"
      tabindex="0"
      onkeydown={handleKeyDown}
      style="top: calc({lightness}% - 2px);"
    ></div>
  </div>
  <div class="gradient-box" style:--lightness="{lightness}%">
    <!-- Your 2D Lab a/b gradient goes here -->
  </div>
</div>

<style>
  .gradient-box {
    width: 100%;
    height: 100%;
    background: linear-gradient();
  }
  .lab-selector {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 32px auto;
  }
  .lightness-slider {
    position: relative;
    height: 100%;
    width: 32px;
    background: linear-gradient(to bottom, black, white);
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
</style>
