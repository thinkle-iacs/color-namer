<script lang="ts">
  import type { GameDoc } from './types';

  const { game, playerId, gameId, onStart } = $props<{
    game: GameDoc;
    playerId: string;
    gameId: string;
    onStart: () => void;
  }>();

  let copied = $state(false);

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/game/${gameId}`);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  let isHost = $derived(game.hostId === playerId);
  let playerCount = $derived(game.playerOrder.length);
  let canStart = $derived(isHost && playerCount >= 2);
</script>

<div class="lobby">
  <h2>Waiting for players…</h2>

  <div class="invite-box">
    <p class="label">Invite others — share this link:</p>
    <div class="link-row">
      <code class="link">{window.location.origin}/game/{gameId}</code>
      <button onclick={copyLink}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  </div>

  <div class="player-list">
    <p class="label">{playerCount} player{playerCount === 1 ? '' : 's'} in lobby:</p>
    {#each game.playerOrder as id}
      {@const p = game.players[id]}
      <div class="player-row">
        <span class="dot" style="background: {p.avatarColor}"></span>
        <span class="pname">{p.name}</span>
        {#if id === game.hostId}
          <span class="host-badge">host</span>
        {/if}
        {#if id === playerId}
          <span class="you-badge">you</span>
        {/if}
      </div>
    {/each}
  </div>

  {#if isHost}
    <button
      class="start-btn"
      disabled={!canStart}
      onclick={onStart}
    >
      {canStart ? 'Start game' : 'Need at least 2 players'}
    </button>
  {:else}
    <p class="waiting-msg">Waiting for {game.players[game.hostId]?.name ?? 'the host'} to start…</p>
  {/if}
</div>

<style>
  .lobby {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    padding: 2rem;
    text-align: center;
  }

  h2 { margin: 0; font-size: 1.8rem; }

  .label {
    font-size: 0.8rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 0.4rem;
  }

  .invite-box {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.2rem 1.5rem;
    max-width: 500px;
    width: 100%;
  }

  .link-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  code.link {
    font-size: 0.85rem;
    color: #adf;
    word-break: break-all;
  }

  .invite-box button, .start-btn {
    font-size: 0.9rem;
    padding: 0.4em 1em;
    border-radius: 7px;
    border: none;
    cursor: pointer;
    background: #333;
    color: #ddd;
  }
  .invite-box button:hover { background: #444; }

  .player-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
    min-width: 200px;
  }

  .player-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .pname { color: #ddd; }

  .host-badge, .you-badge {
    font-size: 0.65rem;
    padding: 0.15em 0.5em;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .host-badge { background: #333; color: #fa0; }
  .you-badge  { background: #223; color: #6af; }

  .start-btn {
    font-size: 1.2rem;
    padding: 0.7em 2.5em;
    background: linear-gradient(135deg, #6af, #a6f);
    color: #fff;
    font-weight: 700;
    border-radius: 10px;
    transition: filter 0.15s;
  }
  .start-btn:hover:not([disabled]) { filter: brightness(1.15); }
  .start-btn[disabled] { opacity: 0.4; cursor: not-allowed; background: #333; color: #777; }

  .waiting-msg { color: #888; margin: 0; }
</style>
