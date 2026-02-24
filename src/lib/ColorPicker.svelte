<script lang="ts">
  import GradientPicker from "./GradientPicker.svelte";
  import GridColorPicker from "./GridColorPicker.svelte";
  import { labToRgb, rgbToLab } from "./labToRgb";
  import type { Color } from "./types";

  let mode: "broad" | "narrow" = $state("broad");
  let color: Color = $state({
    lightness: 50,
    a: 0,
    b: 0,
  });

  let { onconfirm } = $props();

  function reset() {
    mode = "broad";
    zoom = 1;
    color = { lightness: 50, a: 0, b: 0 };
  }
  let zoom = $state(1);
  let maxZoom = 3;
</script>

<div class="color-picker">
  {#if mode == "broad"}
    {#if zoom > 1}
      <button onclick={() => reset()}>Restart</button>
      {#if zoom > 2}
        <button onclick={() => (zoom -= 1)}>Back</button>
      {/if}
    {/if}
    {#if zoom == maxZoom}
      Final selection!
    {:else}
      Narrow down...
    {/if}
    {#key zoom}
      <GradientPicker
        center={color}
        {zoom}
        onselect={(c) => {
          color = c;
          const [red, green, blue] = labToRgb(c.lightness, c.a, c.b);
          const [l, a, b] = rgbToLab(red, green, blue);
          if (color.lightness !== l || color.a !== a || color.b !== b) {
            console.log("Simplifying to displayed color: was ", color);
            color = { lightness: l, a, b };
          }
          if (zoom >= maxZoom) {
            mode = "narrow";
          }
          zoom += 1;
        }}
      ></GradientPicker>
    {/key}
  {/if}

  {#if mode == "narrow"}
    <!-- Back butt{on & Confirm Button -->
    <GridColorPicker {color} onselect={onconfirm} />
  {/if}
</div>

<style>
  .color-picker {
    display: block;
    width: 100%;
  }
</style>
