<script lang="ts">
  export let players: { name: string; color: string }[] = [];
  export let onUpdate;
</script>

<section>
  {#each players as player, i}
    <label>
      <div class="dot" style="background: {player.color}"></div>
      Team {i + 1}:
      <input bind:value={player.name} />
    </label>
  {/each}

  <button
    on:click={() => {
      onUpdate(players);
    }}>Start Game</button
  >
</section>

<style>
  section {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    flex-direction: column;
  }
  div {
    width: max(calc(100vw - 32px), 500px);
    height: max(70vh, 750px);
    display: grid;
    place-content: center;
  }

  .player-select {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .player-select button {
    padding: 1em;
    font-size: 1.5rem;
    border-radius: 8px;
    cursor: pointer;
  }

  #new-color-button {
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 99;
    padding: 1em;
    font-size: 2rem;
    border-radius: 16px;
    background: linear-gradient(to bottom right, #f00, #0f0, #00f);
    color: white;
    text-shadow: 1px 1px 1px black;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    font-size: 1.5rem;
  }

  h2.on-top {
    position: fixed;
    top: 32px;
    left: 32px;
    z-index: 99;
    color: white;
    width: 100%;
    text-align: center;
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
    font-style: italic;
  }

  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
  }
</style>
