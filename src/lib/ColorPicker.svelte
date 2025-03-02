<script lang="ts">
  import GradientPicker from "./GradientPicker.svelte";

  let mode: "broad" | "narrow" = $state("broad");
  let color: { lightness: number; a: number; b: number } | null = $state(null);
  let { onconfirm } = $props();

  // Define the variation range for LAB values
  let baseRanges = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  let multiplier = $state(18);
  let ranges = $derived(baseRanges.map((i) => i * multiplier));

  // Derived values for the LAB grid
  let lightnessValues = $derived(
    color ? ranges.toReversed().map((r) => color!.lightness + r) : []
  );
  let aValues = $derived(color ? ranges.map((r) => color!.a + r) : []);
  let bValues = $derived(color ? ranges.map((r) => color!.b + r) : []);

  $effect(() => console.log(color, aValues, bValues, lightnessValues));
  let tableLightness = $state(50);
  $effect(() => {
    if (color) {
      tableLightness = color.lightness;
    }
  });

  const multiplierDesc = {
    18: "Broad",
    8: "Medium",
    3: "Narrow",
    1: "Final",
  };

  function chooseTableColor(l, a, b) {
    let multiplierNumStrings = Object.keys(multiplierDesc);
    let multiplierNums: number[] = multiplierNumStrings.map((n) =>
      parseInt(n, 10)
    );
    multiplierNums.sort((a, b) => a - b);
    console.log("multiplier nums", multiplierNums);
    color = { lightness: l, a, b };
    let multiplierIndex = multiplierNums.indexOf(multiplier);
    if (multiplierIndex == 0) {
      onconfirm(color);
    } else {
      multiplier = multiplierNums[multiplierIndex - 1];
    }
  }
  $effect(() => {
    console.log("Multiplier is ", multiplier);
    console.log("range is ", ranges);
    console.log("avalues are ", aValues);
    console.log("lightness vals are ", lightnessValues);
  });
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
      <button onclick={() => (mode = "broad")}>Back</button>
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
    width: 32px;
    height: 32px;
    cursor: pointer;
    border: 1px solid transparent;
  }

  td div:hover {
    border: 1px solid black;
  }
  .selected {
    border: 2px solid black;
  }
  .centered {
    font-weight: bold;
    text-align: center;
  }
</style>
