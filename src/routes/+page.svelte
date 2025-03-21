<script lang="ts">  
  import NetworkedGame from "$lib/NetworkedGame.svelte";
  import NonNetworkedGame from "./../lib/NonNetworkedGame.svelte";
  const NONE = 0;
  const NETWORKED = 1;
  const NON_NETWORKED = 2;
  let mode = NONE;
</script>


{#if !mode}
  <button on:click={() => (mode = NETWORKED)}>Networked</button>
  <button on:click={() => (mode = NON_NETWORKED)}>Non-Networked</button>
{:else if mode === NETWORKED}
  <NetworkedGame />
{:else}
  <NonNetworkedGame />
{/if}

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
  :global(:root) {
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      "Open Sans",
      "Helvetica Neue",
      sans-serif;
  }
</style>
