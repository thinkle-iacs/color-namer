<script lang="ts">
  import { goto } from "$app/navigation";
  import { createGame, getOrCreatePlayerId } from "$lib/game";

  let playerName = $state("");
  let joinCode = $state("");
  let mode = $state<"home" | "create" | "join">("home");
  let creating = $state(false);
  let errorMsg = $state("");

  async function handleCreate() {
    if (!playerName.trim()) return;
    creating = true;
    errorMsg = "";
    try {
      const playerId = getOrCreatePlayerId();
      const gameId = await createGame(playerId, playerName.trim());
      goto(`/game/${gameId}`);
    } catch (e) {
      errorMsg = "Could not create game. Check your connection.";
      creating = false;
    }
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code || !playerName.trim()) return;
    goto(`/game/${code}?name=${encodeURIComponent(playerName.trim())}`);
  }
</script>

<svelte:head>
  <title>Crayon Namer</title>
</svelte:head>

<main>
  <div class="hero">
    <h1 class="title">Crayon<br />Namer</h1>
    <p class="tagline">Name a color. See if your friends can guess it.</p>
  </div>

  {#if mode === "home"}
    <div class="actions">
      <button class="big" onclick={() => (mode = "create")}>Create game</button>
      <button class="big secondary" onclick={() => (mode = "join")}
        >Join game</button
      >
    </div>
  {:else}
    <div class="form-card">
      <label>
        Your name
        <input
          type="text"
          bind:value={playerName}
          placeholder="Enter your name"
          maxlength="20"
          autofocus
        />
      </label>

      {#if mode === "join"}
        <label>
          Game code
          <input
            type="text"
            bind:value={joinCode}
            placeholder="8-character code"
            maxlength="8"
            style="text-transform: uppercase; letter-spacing: 0.1em;"
          />
        </label>
      {/if}

      {#if errorMsg}
        <p class="error">{errorMsg}</p>
      {/if}

      <div class="form-buttons">
        {#if mode === "create"}
          <button
            class="big"
            disabled={!playerName.trim() || creating}
            onclick={handleCreate}
          >
            {creating ? "Creating…" : "Create & enter lobby"}
          </button>
        {:else}
          <button
            class="big"
            disabled={!playerName.trim() || !joinCode.trim()}
            onclick={handleJoin}
          >
            Join game
          </button>
        {/if}
        <button
          class="link"
          onclick={() => {
            mode = "home";
            errorMsg = "";
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: #111;
    color: #f0f0f0;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2.5rem;
    padding: 2rem;
  }

  .hero {
    text-align: center;
  }

  .title {
    font-size: clamp(3rem, 12vw, 6rem);
    font-weight: 900;
    line-height: 1;
    margin: 0 0 0.4em;
    background: linear-gradient(135deg, #f66, #f93, #ff6, #6f6, #6af, #a6f);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tagline {
    font-size: 1.1rem;
    color: #aaa;
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .form-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 360px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 2rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  input {
    font-size: 1.1rem;
    padding: 0.5em 0.7em;
    background: #111;
    color: #fff;
    border: 2px solid #444;
    border-radius: 8px;
    outline: none;
    width: 100%;
  }
  input:focus {
    border-color: #888;
  }

  .form-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  button.big {
    font-size: 1.1rem;
    padding: 0.7em 1.8em;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #6af, #a6f);
    color: #fff;
    font-weight: 700;
    transition: filter 0.15s;
  }
  button.big:hover:not([disabled]) {
    filter: brightness(1.15);
  }
  button.big[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  button.big.secondary {
    background: #333;
    color: #ddd;
  }

  button.link {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 0.9rem;
    text-align: center;
    padding: 0.3em;
  }
  button.link:hover {
    color: #ccc;
  }

  .error {
    color: #f66;
    font-size: 0.9rem;
    margin: 0;
  }
</style>
