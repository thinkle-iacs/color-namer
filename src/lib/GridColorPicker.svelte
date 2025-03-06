<script lang="ts">
  import { labToRgb, rgbToLab } from "./labToRgb";
  import type { Color } from "./types";
  let {
    color,
    diff = 5,
    onselect,
  } = $props<{ color: Color; diff: number; onselect: (Color) => void }>();
  let [red, green, blue]: number[] = $derived(
    labToRgb(color.lightness, color.a, color.b)
  );

  let rgbColorOptions = $derived.by(() => {
    let colors = [];
    for (
      let r = Math.max(0, red - diff);
      r <= Math.min(255, red + diff);
      r += 1
    ) {
      for (
        let g = Math.max(0, green - diff);
        g <= Math.min(255, green + diff);
        g += 1
      ) {
        for (
          let b = Math.max(0, blue - diff);
          b <= Math.min(255, blue + diff);
          b += 1
        ) {
          colors.push({ r, g, b });
        }
      }
    }
    // Only keep colors with distinct lab values
    let labSet = new Set();
    colors = colors.filter((c) => {
      let labKey = rgbToLab(c.r, c.g, c.b).join("-");
      if (labSet.has(labKey)) {
        return false;
      } else {
        labSet.add(labKey);
        return true;
      }
    });
    return colors;
  });

  function select(rgb) {
    let lab = rgbToLab(rgb.r, rgb.g, rgb.b);
    onselect({ lightness: lab[0], a: lab[1], b: lab[2] });
  }
</script>

<div
  class="selector"
  style:--side-size={Math.round(Math.sqrt(rgbColorOptions.length))}
>
  {#each rgbColorOptions as rgb}
    <button
      style="background-color: rgb({rgb.r}, {rgb.g}, {rgb.b})"
      onclick={() => select(rgb)}
    >
      &nbsp;
    </button>
  {/each}
</div>

<style>
  button {
    width: 2em;
    height: 2em;
    border: none;
    padding: 0;
    margin: 0;
  }
  .selector {
    display: grid;
    gap: 5px 5px;
    flex-direction: row;
    flex-wrap: wrap;
    grid-template-columns: repeat(var(--side-size), 2em);
    margin: auto;
    align-items: center;
    justify-content: center;
  }
</style>
