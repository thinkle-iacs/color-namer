<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import {
    getOrCreatePlayerId,
    joinGame,
    subscribeToGame,
    startGame,
    nextRound,
    setDifficulty,
    setRoundTimer,
    computeResults,
    avatarColor,
  } from '$lib/game';
  import { labToRgb, generateColorOptions } from '$lib/labToRgb';
  import type { Difficulty, GameDoc } from '$lib/types';
  import LobbyView from '$lib/LobbyView.svelte';
  import PickingView from '$lib/PickingView.svelte';
  import GuessingView from '$lib/GuessingView.svelte';
  import RevealView from '$lib/RevealView.svelte';

  const gameId = $derived($page.params.gameId);
  const urlName = $derived(new URLSearchParams($page.url.search).get('name') ?? '');

  let game = $state<GameDoc | null>(null);
  let playerId = $state('');
  let joined = $state(false);
  let playerName = $state('');
  let joinError = $state('');
  let joining = $state(false);
  let changingDifficulty = $state(false);
  let changingTimer = $state(false);

  const timerOptions: { label: string; seconds: number | null }[] = [
    { label: 'Off', seconds: null },
    { label: '30s', seconds: 30 },
    { label: '1m', seconds: 60 },
    { label: '90s', seconds: 90 },
    { label: '2m', seconds: 120 },
  ];
  let unsub: (() => void) | null = null;
  let sidebarOpen = $state(false);

  // Local picker cache; canonical copy is persisted in game.roundPickedColor
  let localPickedColor = $state<import('$lib/types').Color | null>(null);

  onMount(async () => {
    playerId = getOrCreatePlayerId();

    // Subscribe to game updates
    unsub = subscribeToGame(gameId, (data) => {
      const prevGame = game;
      const wasInGame = prevGame !== null && prevGame.players[playerId];
      game = data;
      if (wasInGame || data.players[playerId]) {
        joined = true;
      }

      // Reset local picked color only when round number changes.
      if (prevGame?.roundNumber !== data.roundNumber) {
        localPickedColor = null;
      }

      const amCurrentPicker = data.playerOrder[data.pickerIndex] === playerId;

      // Recover from persisted picked color if present.
      if (amCurrentPicker && data.roundPickedColor && !localPickedColor) {
        localPickedColor = data.roundPickedColor;
      }

      // Hard-mode fallback for older rounds (before picked-color persistence).
      if (
        amCurrentPicker &&
        data.status === 'guessing' &&
        data.difficulty === 'hard' &&
        data.roundSeed !== null &&
        !localPickedColor
      ) {
        localPickedColor = generateColorOptions(data.roundSeed, 1)[0];
      }
    });

    // Pre-fill name from URL query (joining via shared link)
    if (urlName) {
      playerName = urlName;
    }
  });

  onDestroy(() => unsub?.());

  async function handleJoin() {
    if (!playerName.trim()) return;
    joining = true;
    joinError = '';
    const result = await joinGame(gameId, playerId, playerName.trim());
    if (result.ok) {
      joined = true;
    } else {
      joinError = result.error;
    }
    joining = false;
  }

  // Derived helpers
  let myInfo = $derived(game?.players[playerId]);
  let pickerPlayerId = $derived(
    game ? game.playerOrder[game.pickerIndex] : null
  );
  let amPicker = $derived(pickerPlayerId === playerId);
  let amHost = $derived(game?.hostId === playerId);
  let allGuessersSubmitted = $derived(
    game
      ? game.playerOrder
          .filter((id) => id !== pickerPlayerId)
          .every((id) => !!game!.roundGuesses[id])
      : false
  );

  // For the scoreboard sidebar
  let sortedPlayers = $derived(
    game
      ? [...game.playerOrder]
          .map((id) => ({ id, ...game!.players[id] }))
          .sort((a, b) => b.score - a.score)
      : []
  );

  function shareUrl() {
    return `${window.location.origin}/game/${gameId}`;
  }

  async function handleDifficultyChange(difficulty: Difficulty): Promise<void> {
    if (!game || !amHost) return;
    if (game.difficulty === difficulty || game.status === 'picking') return;
    changingDifficulty = true;
    try {
      await setDifficulty(gameId, difficulty);
    } finally {
      changingDifficulty = false;
    }
  }

  async function handleTimerChange(seconds: number | null): Promise<void> {
    if (!game || !amHost) return;
    if ((game.roundTimerSeconds ?? null) === seconds) return;
    changingTimer = true;
    try {
      await setRoundTimer(gameId, seconds);
    } finally {
      changingTimer = false;
    }
  }
</script>

<svelte:head>
  <title>Crayon Namer — Game {gameId}</title>
</svelte:head>

{#if !game}
  <div class="loading">Loading game…</div>
{:else if !joined || !myInfo}
  <!-- Join form -->
  <div class="join-screen">
    <h1 class="logo">Crayon Namer</h1>
    <p>You've been invited to a game!</p>
    <div class="form-card">
      <label>
        Your name
        <input
          type="text"
          bind:value={playerName}
          placeholder="Enter your name"
          maxlength="20"
          autofocus
          onkeydown={(e) => e.key === 'Enter' && handleJoin()}
        />
      </label>
      {#if joinError}
        <p class="error">{joinError}</p>
      {/if}
      <button
        class="btn-primary"
        disabled={!playerName.trim() || joining}
        onclick={handleJoin}
      >
        {joining ? 'Joining…' : 'Join game'}
      </button>
    </div>
  </div>
{:else}
  <!-- In-game layout -->
  <div class="game-layout">
    <button
      class="sidebar-toggle"
      onclick={() => (sidebarOpen = !sidebarOpen)}
      aria-label={sidebarOpen ? 'Close scoreboard' : 'Open scoreboard'}
      aria-expanded={sidebarOpen}
      aria-controls="game-sidebar"
    >
      ☰ Scoreboard
    </button>

    <button
      class="sidebar-backdrop"
      class:visible={sidebarOpen}
      aria-label="Close scoreboard"
      onclick={() => (sidebarOpen = false)}
    ></button>

    <!-- Sidebar -->
    <aside id="game-sidebar" class="sidebar" class:open={sidebarOpen}>
      <div class="sidebar-mobile-head">
        <span>Scoreboard</span>
        <button
          class="sidebar-close"
          onclick={() => (sidebarOpen = false)}
          aria-label="Close scoreboard"
        >✕</button>
      </div>

      <div class="game-id">
        <span class="code-label">Game code</span>
        <span class="code">{gameId}</span>
        <button
          class="copy-btn"
          onclick={() => navigator.clipboard.writeText(shareUrl())}
          title="Copy invite link"
        >Copy link</button>
      </div>

      <div class="round-info">
        Round {game.roundNumber || '—'}
      </div>

      {#if amHost}
        <div class="difficulty-panel">
          <div class="difficulty-label">Difficulty</div>
          <div class="difficulty-buttons">
            {#each ['easy', 'medium', 'hard'] as d}
              <button
                class="diff-btn"
                class:active={game.difficulty === d}
                disabled={changingDifficulty || game.status === 'picking'}
                onclick={() => handleDifficultyChange(d as Difficulty)}
              >
                {d}
              </button>
            {/each}
          </div>
          <div class="difficulty-note">
            {#if game.status === 'picking'}
              Locked while picker is choosing a color
            {:else}
              Applies to the next picking phase
            {/if}
          </div>
        </div>

        <div class="difficulty-panel">
          <div class="difficulty-label">Round timer</div>
          <div class="difficulty-buttons">
            {#each timerOptions as opt}
              <button
                class="diff-btn"
                class:active={(game.roundTimerSeconds ?? null) === opt.seconds}
                disabled={changingTimer}
                onclick={() => handleTimerChange(opt.seconds)}
              >
                {opt.label}
              </button>
            {/each}
          </div>
          <div class="difficulty-note">Applies from the next guessing phase</div>
        </div>
      {/if}

      <ul class="scoreboard">
        {#each sortedPlayers as p}
          <li class:is-me={p.id === playerId} class:is-picker={p.id === pickerPlayerId}>
            <span class="avatar" style="background: {p.avatarColor}"></span>
            <span class="pname">{p.name}{p.id === playerId ? ' (you)' : ''}</span>
            <span class="pscore">{p.score}</span>
            {#if p.id === pickerPlayerId}
              <span class="picker-badge">clue giver</span>
            {/if}
          </li>
        {/each}
      </ul>
    </aside>

    <!-- Main area -->
    <main class="main-area">
      {#if game.status === 'lobby'}
        <LobbyView
          {game}
          {playerId}
          {gameId}
          onStart={(difficulty, timer) => startGame(gameId, difficulty, timer)}
        />
      {:else if game.status === 'picking'}
        {#if amPicker}
          <PickingView
            {gameId}
            {playerId}
            onColorPicked={(color) => (localPickedColor = color)}
            pickedColor={localPickedColor}
            difficulty={game.difficulty}
            roundSeed={game.roundSeed}
            timerSeconds={game.roundTimerSeconds ?? null}
          />
        {:else}
          <div class="waiting-screen">
            <div class="waiting-icon">🎨</div>
            <h2>{game.players[pickerPlayerId!]?.name ?? 'Someone'} is picking a color…</h2>
            <p>Get ready to guess!</p>
          </div>
        {/if}
      {:else if game.status === 'guessing'}
        <GuessingView
          {game}
          {gameId}
          {playerId}
          {amPicker}
          pickerName={game.players[pickerPlayerId!]?.name ?? ''}
          {allGuessersSubmitted}
          localPickedColor={localPickedColor}
        />
      {:else if game.status === 'reveal'}
        <RevealView
          {game}
          {gameId}
          {playerId}
          {amPicker}
          onNextRound={() => nextRound(gameId)}
        />
      {/if}
    </main>
  </div>
{/if}

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) {
    margin: 0;
    background: #111;
    color: #f0f0f0;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 1.2rem;
  }

  /* Join screen */
  .join-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 2rem;
    text-align: center;
  }

  .logo {
    font-size: 2.5rem;
    font-weight: 900;
    margin: 0;
    background: linear-gradient(135deg, #f66, #f93, #ff6, #6f6, #6af, #a6f);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .form-card {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    width: 100%;
    max-width: 320px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 1.5rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
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
  input:focus { border-color: #888; }

  .btn-primary {
    font-size: 1rem;
    padding: 0.6em 1.4em;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #6af, #a6f);
    color: #fff;
    font-weight: 700;
  }
  .btn-primary[disabled] { opacity: 0.4; cursor: not-allowed; }

  .error { color: #f66; font-size: 0.9rem; margin: 0; }

  /* In-game layout */
  .game-layout {
    display: flex;
    min-height: 100vh;
    position: relative;
  }

  .sidebar-toggle {
    display: none;
  }

  .sidebar-backdrop {
    display: none;
  }

  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: #1a1a1a;
    border-right: 1px solid #2a2a2a;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 12;
  }

  .sidebar-mobile-head {
    display: none;
  }

  .game-id {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .code-label { font-size: 0.7rem; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
  .code { font-size: 1.1rem; font-weight: 700; letter-spacing: 0.1em; color: #ddd; }
  .copy-btn {
    font-size: 0.75rem;
    padding: 0.3em 0.6em;
    border: 1px solid #444;
    background: #222;
    color: #aaa;
    border-radius: 6px;
    cursor: pointer;
    width: fit-content;
    margin-top: 0.2rem;
  }
  .copy-btn:hover { background: #333; color: #fff; }

  .round-info {
    font-size: 0.85rem;
    color: #777;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .difficulty-panel {
    border: 1px solid #2f2f2f;
    border-radius: 10px;
    padding: 0.55rem;
    background: #171717;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .difficulty-label {
    font-size: 0.68rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  .difficulty-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3rem;
  }
  .diff-btn {
    border: 1px solid #444;
    background: #1f1f1f;
    color: #b9b9b9;
    border-radius: 7px;
    padding: 0.3em 0.4em;
    font-size: 0.75rem;
    text-transform: capitalize;
    cursor: pointer;
  }
  .diff-btn:hover:not([disabled]) {
    background: #282828;
    border-color: #5a5a5a;
    color: #ececec;
  }
  .diff-btn.active {
    border-color: #6e9ff4;
    background: #223049;
    color: #eff5ff;
    font-weight: 600;
  }
  .diff-btn[disabled] {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .difficulty-note {
    font-size: 0.68rem;
    color: #707070;
    line-height: 1.2;
  }

  .scoreboard {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .scoreboard li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.5rem;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: background 0.1s;
  }
  .scoreboard li.is-me { background: #252525; }
  .scoreboard li.is-picker { outline: 1px solid #555; }

  .avatar {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .pname {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #ccc;
  }

  .pscore {
    font-weight: 700;
    color: #fff;
    min-width: 28px;
    text-align: right;
  }

  .picker-badge {
    font-size: 0.65rem;
    color: #fa0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .main-area {
    flex: 1;
    display: flex;
    align-items: stretch;
  }

  /* Waiting screen */
  .waiting-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
  }
  .waiting-icon { font-size: 4rem; }
  .waiting-screen h2 { margin: 0; font-size: 1.5rem; }
  .waiting-screen p { color: #888; margin: 0; }

  @media (max-width: 800px) {
    .sidebar-toggle {
      display: inline-flex;
      position: fixed;
      top: 0.7rem;
      left: 0.7rem;
      z-index: 14;
      align-items: center;
      gap: 0.3rem;
      border: 1px solid #3f3f3f;
      background: rgba(20, 20, 20, 0.94);
      color: #e5e5e5;
      border-radius: 8px;
      padding: 0.4em 0.65em;
      font-size: 0.78rem;
      cursor: pointer;
      backdrop-filter: blur(3px);
    }

    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      border: none;
      background: rgba(0, 0, 0, 0.45);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s;
      z-index: 11;
    }
    .sidebar-backdrop.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: min(84vw, 300px);
      transform: translateX(-100%);
      transition: transform 0.18s ease;
      border-right: 1px solid #2a2a2a;
      box-shadow: 8px 0 28px rgba(0, 0, 0, 0.5);
      overflow-y: auto;
      padding-top: 0.7rem;
    }
    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-mobile-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #999;
      margin-bottom: 0.3rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .sidebar-close {
      border: 1px solid #444;
      background: #202020;
      color: #bbb;
      border-radius: 6px;
      width: 1.8rem;
      height: 1.8rem;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      font-size: 0.85rem;
    }

    .main-area {
      min-height: 100vh;
      width: 100%;
      padding-top: 2.8rem;
    }
  }
</style>
