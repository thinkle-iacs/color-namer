<script lang="ts">
  import ColorPicker from "$lib/ColorPicker.svelte";
  import GridColorPicker from "$lib/GridColorPicker.svelte";
  import NonNetworkedGame from "./../lib/NonNetworkedGame.svelte";
</script>

<NonNetworkedGame />

<style global>
  :global(button) {
    border: 4px solid;
    border-image: linear-gradient(
        45deg,
        red,
        orange,
        yellow,
        green,
        blue,
        indigo,
        violet
      )
      1;
    background: white;
    border-radius: 8px;
    margin: 1em;
    padding: 1em;
  }
  :global(button:hover) {
    filter: drop-shadow(4px 4px 8px #777);
  }
</style>
