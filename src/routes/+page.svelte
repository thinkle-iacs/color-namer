<script>
  import ColorPicker from "$lib/ColorPicker.svelte";
</script>

<h1>Welcome to SvelteKit</h1>
<p>
  Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the
  documentation
</p>
<div>
  <ColorPicker />
</div>

<style>
  div {
    width: max(calc(100vw - 32px), 500px);
    height: max(70vh, 500px);
    border: 2px solid grey;
  }
</style>
