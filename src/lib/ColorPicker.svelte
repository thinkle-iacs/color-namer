<script lang="ts">
  import GradientPicker from "./GradientPicker.svelte";

  let mode: "broad" | "narrow" = $state("broad");
  let color = $state(null);
  let { onconfirm } = $props();
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
</div>
{#if mode == "narrow"}
  <!-- Back button... -->
  <button onclick={() => (mode = "broad")}>Back</button>
  <table>
    <!-- Make a tight grid of possible color choices around the user's choice -->
  </table>
{/if}

<style>
  .color-picker {
    width: 100%;
    height: 100%;
  }
</style>
