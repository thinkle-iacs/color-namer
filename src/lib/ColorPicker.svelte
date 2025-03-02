<script lang="ts">
  import GradientPicker from "./GradientPicker.svelte";
  import type { Color } from "./types";

  let mode: "broad" | "narrow" = $state("broad");
  let color: Color | null = $state(null);
  let { onconfirm } = $props();

  // Define the variation range for LAB values
  let baseRanges = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  const multiplierDesc = {
    10: "Broad",
    6: "Medium",
    3: "Narrow",
    1: "Final",
  };

  const multiplierNumStrings = Object.keys(multiplierDesc);
  const multiplierNums: number[] = multiplierNumStrings.map((n) =>
    parseInt(n, 10)
  );
  multiplierNums.sort((a, b) => a - b);

  let multiplier = $state(multiplierNums[multiplierNums.length - 1]);
  let ranges = $derived(baseRanges.map((i) => i * multiplier));

  let tableLightness = $state(50);
  $effect(() => {
    if (color) {
      tableLightness = color.lightness;
    }
  });

  // Derived values for the LAB grid
  let lightnessValues = $derived(
    color
      ? ranges
          .toReversed()
          .map((r) => Math.max(0, Math.min(color!.lightness + r, 100)))
          .filter((v, i, a) => a.indexOf(v) === i)
      : []
  );
  let aValues = $derived(color ? ranges.map((r) => color!.a + r) : []);
  let bValues = $derived(color ? ranges.map((r) => color!.b + r) : []);
  $inspect(color, aValues, bValues, lightnessValues);
  function chooseTableColor(l: number, a: number, b: number) {
    color = { lightness: l, a, b };
    let multiplierIndex = multiplierNums.indexOf(multiplier);
    if (multiplierIndex == 0) {
      console.log("at last multiplier");
      onconfirm(color);
    } else if (multiplierIndex > 0) {
      console.log("move down one multiplier...");
      console.log("setting multiplier to ", multiplier, "@", multiplierIndex);
      multiplier = multiplierNums[multiplierIndex - 1];
    } else {
      console.log("Weird multiplier value?", multiplier);
      multiplier = multiplierNums[0];
      console.log("=>", multiplier);
    }
  }
  $inspect(
    "Multiplier is ",
    multiplier,
    "range is ",
    ranges,
    "avalues are ",
    aValues,
    "lightness vals are ",
    lightnessValues
  );

  function reset() {
    mode = "broad";
    multiplier = multiplierNums[multiplierNums.length - 1];
    color = null;
    tableLightness = 50;
  }
</script>

<div class="color-picker">
  {#if mode == "broad"}
    <GradientPicker
      onselect={(c) => {
        color = c;
        mode = "narrow";
      }}
    ></GradientPicker>
  {/if}

  {#if mode == "narrow"}
    <!-- Back button & Confirm Button -->
    <div>
      {#each Object.keys(multiplierDesc) as m}
        {@const multiplierName : string = multiplierDesc[m]}
        <button
          onclick={() => (multiplier = parseInt(m))}
          class:active={multiplier == Number(m)}
        >
          {multiplierName}
        </button>
      {/each}
    </div>
    <div class="center">
      {color.lightness}
      {color.a}
      {color.b}
    </div>
    <div class="row">
      <button onclick={reset}>Back</button>
      <button
        onclick={() => {
          onconfirm(color);
        }}
        style="width: 100%; height: 32px; background-color: lab({color.lightness} {color.a} {color.b})"
      >
      </button>
    </div>
    <div class="row">
      <table>
        <tbody>
          <tr> <th>Lightness</th> </tr>
          {#each lightnessValues as l}
            <tr>
              <td>
                <button
                  class:selected={tableLightness == l}
                  style="background:lab({l} 0 0)"
                  onclick={() => (tableLightness = l)}
                ></button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <table>
        <thead>
          <tr><th colspan={aValues.length}>Hue</th></tr>
        </thead>
        <tbody>
          {#each aValues as a}
            <tr>
              {#each bValues as b}
                <td>
                  <button
                    class:selected={color.lightness == tableLightness &&
                      color.a == a &&
                      color.b == b}
                    style="background:lab({tableLightness} {a} {b})"
                    onclick={() => {
                      chooseTableColor(tableLightness, a, b);
                    }}
                  ></button>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  button.active {
    background: #222;
    color: white;
  }
  .color-picker {
    width: 100%;
    height: 100%;
  }
  th {
    text-align: center;
    font-family: Inter, sans-serif;
    width: 100%;
  }

  .row {
    display: flex;
    margin-bottom: 8px;
  }

  table {
    border-collapse: collapse;
  }

  td {
    padding: 2px;
  }

  td div,
  td button {
    width: 42px;
    height: 42px;
    cursor: pointer;
    border: 6px solid white;
  }

  td button:hover {
    border: 6px solid black;
  }
  td button.selected {
    border: 6px solid black;
  }
  .centered {
    font-weight: bold;
    text-align: center;
  }
</style>
